<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

#[Route('/api')]
class PasswordReset extends Controller
{
    private $api;
    private $db;
    private $users;
    private $customers;
    private $mailer;

    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->db = lava_instance()->db;
        $this->api = $this->call->library('api');
        $this->users = $this->call->model('UserModel');
        $this->customers = $this->call->model('CustomerModel');
        $this->mailer = $this->call->library('smtp_mailer');
    }

    #[Post('/auth/forgot-password')]
    public function request_admin_reset()
    {
        $this->request_reset('admin');
    }

    #[Post('/customers/forgot-password')]
    public function request_customer_reset()
    {
        $this->request_reset('customer');
    }

    #[Post('/auth/reset-password')]
    public function reset_admin_password()
    {
        $this->reset_password('admin');
    }

    #[Post('/customers/reset-password')]
    public function reset_customer_password()
    {
        $this->reset_password('customer');
    }

    private function request_reset(string $type): void
    {
        $input = $this->api->body();
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $message = 'If an account exists for that email, a password reset link will be sent shortly.';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->success(['message' => $message]);
        }

        $model = $type === 'admin' ? $this->users : $this->customers;
        $matches = $model->query()->where('email', $email)->get_all() ?: [];
        $account = $matches[0] ?? null;
        if (!$account || ($type === 'admin' && empty($account['is_active'])) || ($type === 'customer' && !empty($account['is_guest']))) {
            $this->success(['message' => $message]);
        }

        $last = $this->db->raw(
            'SELECT created_at FROM password_reset_tokens WHERE account_type = ? AND account_id = ? ORDER BY id DESC LIMIT 1',
            [$type, $account['id']]
        )->fetch(PDO::FETCH_ASSOC);
        if ($last && strtotime((string) $last['created_at']) > time() - 60) {
            $this->success(['message' => $message]);
        }

        $token = bin2hex(random_bytes(32));
        $hash = hash('sha256', $token);
        $this->db->raw(
            'DELETE FROM password_reset_tokens WHERE account_type = ? AND account_id = ? AND used_at IS NULL',
            [$type, $account['id']]
        );
        $this->db->raw(
            'INSERT INTO password_reset_tokens (account_type, account_id, token_hash, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, NULL, ?)',
            [$type, $account['id'], $hash, date('Y-m-d H:i:s', time() + 3600), date('Y-m-d H:i:s')]
        );

        $webUrl = rtrim((string) (getenv('WEB_APP_URL') ?: 'http://localhost:3000'), '/');
        $resetPath = $type === 'admin' ? '/admin/reset-password' : '/customer/reset-password';
        $resetUrl = $webUrl . $resetPath . '?token=' . rawurlencode($token);
        $safeUrl = htmlspecialchars($resetUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeName = htmlspecialchars((string) ($account['name'] ?? 'there'), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $html = '<p>Hello ' . $safeName . ',</p><p>We received a request to reset your PRIME POS password.</p>'
            . '<p><a href="' . $safeUrl . '">Reset your password</a></p>'
            . '<p>This link expires in 60 minutes and can only be used once. If you did not request this, you can ignore this email.</p>';
        $plain = "Hello " . ($account['name'] ?? 'there') . ",\n\nReset your PRIME POS password using this link (expires in 60 minutes):\n" . $resetUrl
            . "\n\nIf you did not request this, you can ignore this email.";

        if (!$this->mailer->send($email, 'Reset your PRIME POS password', $html, $plain)) {
            $this->db->raw('DELETE FROM password_reset_tokens WHERE token_hash = ?', [$hash]);
        }
        $this->success(['message' => $message]);
    }

    private function reset_password(string $type): void
    {
        $input = $this->api->body();
        $token = trim((string) ($input['token'] ?? ''));
        $password = (string) ($input['password'] ?? '');
        if (!preg_match('/^[a-f0-9]{64}$/i', $token) || strlen($password) < 8) {
            $this->api->respond_error('Use a valid reset link and a password with at least 8 characters.', 422);
        }

        $reset = $this->db->raw(
            'SELECT id, account_id FROM password_reset_tokens WHERE account_type = ? AND token_hash = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1',
            [$type, hash('sha256', $token)]
        )->fetch(PDO::FETCH_ASSOC);
        if (!$reset) $this->api->respond_error('This password reset link is invalid or expired. Request a new one.', 400);

        $table = $type === 'admin' ? 'users' : 'customers';
        $this->db->transaction();
        $claimed = $this->db->raw(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ? AND used_at IS NULL AND expires_at > NOW()',
            [$reset['id']]
        );
        if ($claimed->rowCount() !== 1) {
            $this->db->roll_back();
            $this->api->respond_error('This password reset link is invalid or expired. Request a new one.', 400);
        }

        $this->db->raw(
            'UPDATE ' . $table . ' SET password = ?, updated_at = NOW() WHERE id = ?',
            [password_hash($password, PASSWORD_DEFAULT), $reset['account_id']]
        );
        $this->db->raw('DELETE FROM refresh_tokens WHERE user_id = ?', [$reset['account_id']]);
        $this->db->commit();
        $this->success(['message' => 'Your password has been reset. You can now sign in.']);
    }

    private function success(array $data): void
    {
        $this->api->respond(['success' => true, 'data' => $data]);
    }
}
