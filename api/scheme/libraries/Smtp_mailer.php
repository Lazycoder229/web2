<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Smtp_mailer
{
    private $socket;

    public function send(string $recipient, string $subject, string $html, string $plain): bool
    {
        $brevoApiKey = trim((string) getenv('BREVO_API_KEY'));
        if ($brevoApiKey !== '') {
            return $this->sendWithBrevoApi($brevoApiKey, $recipient, $subject, $html, $plain);
        }

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

    private function sendWithBrevoApi(string $apiKey, string $recipient, string $subject, string $html, string $plain): bool
    {
        $sender = trim((string) getenv('SMTP_FROM_EMAIL'));
        $senderName = trim((string) (getenv('SMTP_FROM_NAME') ?: 'PRIME POS'));
        if ($sender === '' || !filter_var($sender, FILTER_VALIDATE_EMAIL) || !filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            error_log('Password reset email is not configured: SMTP_FROM_EMAIL and a valid recipient are required.');
            return false;
        }
        if (!function_exists('curl_init')) {
            error_log('Brevo API send failed: PHP cURL extension is unavailable.');
            return false;
        }

        $curl = curl_init('https://api.brevo.com/v3/smtp/email');
        if ($curl === false) {
            error_log('Brevo API send failed: could not initialize cURL.');
            return false;
        }

        $payload = json_encode([
            'sender' => ['email' => $sender, 'name' => $senderName],
            'to' => [['email' => $recipient]],
            'subject' => $subject,
            'htmlContent' => $html,
            'textContent' => $plain,
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (!is_string($payload)) {
            curl_close($curl);
            error_log('Brevo API send failed: could not encode the email payload.');
            return false;
        }

        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => [
                'accept: application/json',
                'api-key: ' . $apiKey,
                'content-type: application/json',
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $response = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $curlError = curl_error($curl);
        curl_close($curl);

        if (!is_string($response)) {
            error_log('Brevo API connection failed: ' . ($curlError !== '' ? $curlError : 'request failed'));
            return false;
        }
        if ($status < 200 || $status >= 300) {
            error_log('Brevo API rejected the password reset email (HTTP ' . $status . ').');
            return false;
        }

        return true;
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
