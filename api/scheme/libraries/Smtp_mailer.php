<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Smtp_mailer
{
    private $socket;

    public function send(string $recipient, string $subject, string $html, string $plain): bool
    {
        $host = trim((string) getenv('SMTP_HOST'));
        $port = (int) (getenv('SMTP_PORT') ?: 587);
        $encryption = strtolower(trim((string) (getenv('SMTP_ENCRYPTION') ?: 'tls')));
        $username = (string) getenv('SMTP_USERNAME');
        $password = (string) getenv('SMTP_PASSWORD');
        $sender = trim((string) getenv('SMTP_FROM_EMAIL'));
        $senderName = trim((string) (getenv('SMTP_FROM_NAME') ?: 'PRIME POS'));
        $timeout = max(5, min(60, (int) (getenv('SMTP_TIMEOUT') ?: 15)));

        if ($host === '' || $sender === '' || !filter_var($sender, FILTER_VALIDATE_EMAIL) || !filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            error_log('Password reset email is not configured: SMTP_HOST and SMTP_FROM_EMAIL are required.');
            return false;
        }
        if (!in_array($encryption, ['tls', 'ssl', 'none'], true)) return false;

        $scheme = $encryption === 'ssl' ? 'ssl://' : 'tcp://';
        $context = stream_context_create([
            'ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'peer_name' => $host],
        ]);
        $errorCode = 0;
        $errorMessage = '';
        $this->socket = @stream_socket_client(
            $scheme . $host . ':' . $port,
            $errorCode,
            $errorMessage,
            $timeout,
            STREAM_CLIENT_CONNECT,
            $context
        );
        if (!$this->socket) {
            error_log('Password reset SMTP connection failed: ' . $errorMessage);
            return false;
        }
        stream_set_timeout($this->socket, $timeout);

        try {
            $this->expect([220]);
            $this->command('EHLO prime-pos.local', [250]);
            if ($encryption === 'tls') {
                $this->command('STARTTLS', [220]);
                $crypto = stream_socket_enable_crypto($this->socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                if ($crypto !== true) throw new RuntimeException('Could not establish SMTP TLS.');
                $this->command('EHLO prime-pos.local', [250]);
            }

            if ($username !== '') {
                if ($password === '') throw new RuntimeException('SMTP_PASSWORD is required when SMTP_USERNAME is set.');
                $this->command('AUTH LOGIN', [334]);
                $this->command(base64_encode($username), [334]);
                $this->command(base64_encode($password), [235]);
            }

            $this->command('MAIL FROM:<' . $sender . '>', [250]);
            $this->command('RCPT TO:<' . $recipient . '>', [250, 251]);
            $this->command('DATA', [354]);

            $safeName = str_replace(["\r", "\n", '"'], ['', '', "'"], $senderName);
            $encodedName = '=?UTF-8?B?' . base64_encode($safeName) . '?=';
            $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
            $boundary = '=_prime_pos_' . bin2hex(random_bytes(12));
            $headers = [
                'Date: ' . date(DATE_RFC2822),
                'From: ' . $encodedName . ' <' . $sender . '>',
                'To: <' . $recipient . '>',
                'Subject: ' . $encodedSubject,
                'MIME-Version: 1.0',
                'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
            ];
            $message = implode("\r\n", $headers) . "\r\n\r\n";
            $message .= '--' . $boundary . "\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
            $message .= chunk_split(base64_encode($plain), 76, "\r\n");
            $message .= '--' . $boundary . "\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
            $message .= chunk_split(base64_encode($html), 76, "\r\n");
            $message .= '--' . $boundary . "--\r\n";
            $message = preg_replace('/\r?\n/', "\r\n", $message);
            $message = preg_replace('/(?m)^\./', '..', $message);
            fwrite($this->socket, $message . ".\r\n");
            $this->expect([250]);
            $this->command('QUIT', [221]);
            fclose($this->socket);
            $this->socket = null;
            return true;
        } catch (Throwable $error) {
            error_log('Password reset SMTP send failed: ' . $error->getMessage());
            if (is_resource($this->socket)) fclose($this->socket);
            $this->socket = null;
            return false;
        }
    }

    private function command(string $command, array $expected): string
    {
        if (fwrite($this->socket, $command . "\r\n") === false) {
            throw new RuntimeException('Could not write to the SMTP server.');
        }
        return $this->expect($expected);
    }

    private function expect(array $expected): string
    {
        $response = '';
        do {
            $line = fgets($this->socket, 515);
            if ($line === false) throw new RuntimeException('SMTP server closed the connection unexpectedly.');
            $response .= $line;
            $continue = isset($line[3]) && $line[3] === '-';
        } while ($continue);

        $code = (int) substr($response, 0, 3);
        if (!in_array($code, $expected, true)) {
            throw new RuntimeException('SMTP server rejected a command (' . $code . ').');
        }
        return $response;
    }
}
