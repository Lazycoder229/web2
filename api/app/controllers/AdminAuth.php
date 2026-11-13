<?php
defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api')]
class AdminAuth extends Controller
{
    private $api;
    private $users;
    private $roles;

    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->users = $this->call->model('UserModel');
        $this->roles = $this->call->model('RoleModel');
    }

    #[Post('/auth/login')]
    public function login()
    {
        $input = $this->api->body();
        $this->reject_automated_auth($input);
        if ($this->recaptchaRequired()) {
            $recaptcha = $this->verify_recaptcha((string) ($input['recaptchaToken'] ?? ''));
            if (!$recaptcha['success']) {
                $errorCodes = $recaptcha['error-codes'] ?? [];
                if (in_array('missing-input-secret', $errorCodes, true) || in_array('invalid-input-secret', $errorCodes, true)) {
                    $this->api->respond_error('reCAPTCHA server configuration is missing or invalid. Check RECAPTCHA_SECRET_KEY.', 500);
                }
                if (in_array('verification-request-failed', $errorCodes, true)) {
                    $this->api->respond_error('Could not verify reCAPTCHA with Google. Check outbound network access from the API server.', 503);
                }
                $message = 'Please complete the reCAPTCHA check.';
                if (in_array('missing-input-response', $errorCodes, true)) {
                    $message = 'The reCAPTCHA token is missing. Check VITE_RECAPTCHA_SITE_KEY in the web deployment settings, then rebuild and redeploy the frontend.';
                } elseif (array_intersect(['invalid-input-response', 'timeout-or-duplicate'], $errorCodes)) {
                    $message = 'The reCAPTCHA expired or was invalid. Complete the checkbox again and retry.';
                }
                if (getenv('APP_ENV') === 'development' && !empty($recaptcha['error-codes'])) {
                    $message .= ' (' . implode(', ', $recaptcha['error-codes']) . ')';
                }
                $this->api->respond_error($message, 422);
            }
        }
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $password = (string) ($input['password'] ?? '');
        $rows = $email !== '' ? ($this->users->query()->where('email', $email)->get_all() ?: []) : [];
        $user = $rows[0] ?? null;

        if (!$user || empty($user['is_active']) || !password_verify($password, (string) ($user['password'] ?? ''))) {
            $this->api->respond_error('Email or password is incorrect.', 401);
        }

        $role = $this->roles->find($user['role_id']);
        if (!$role) {
            $this->api->respond_error('This account does not have an assigned role. Contact an administrator.', 403);
        }

        $tokens = $this->api->issue_tokens([
            'id' => (string) $user['id'],
            'role' => 'admin',
            'scopes' => ['admin'],
        ]);
        $this->users->query()->where('id', $user['id'])->update([
            'last_login_at' => date('Y-m-d H:i:s'),
        ]);

        $this->success([
            'user' => [
                'id' => (string) $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $role['name'],
            ],
            'accessToken' => $tokens['access_token'],
            'refreshToken' => $tokens['refresh_token'],
            'expiresIn' => $tokens['expires_in'],
        ]);
    }

    #[Post('/auth/refresh')]
    public function refresh()
    {
        $input = $this->api->body();
        $refreshToken = (string) ($input['refreshToken'] ?? '');
        $claims = $this->api->validate_jwt($refreshToken);
        if (!$claims || ($claims['type'] ?? '') !== 'refresh' || ($claims['role'] ?? '') !== 'admin') {
            $this->api->respond_error('Admin refresh token is invalid or expired.', 401);
        }

        $user = $this->users->find($claims['sub']);
        if (!$user || empty($user['is_active']) || !$this->roles->find($user['role_id'])) {
            $this->api->respond_error('This admin account is inactive. Sign in again.', 401);
        }

        $tokens = $this->api->refresh_access_token($refreshToken);
        $this->success([
            'accessToken' => $tokens['access_token'],
            'refreshToken' => $tokens['refresh_token'],
            'expiresIn' => $tokens['expires_in'],
        ]);
    }

    #[Post('/auth/logout')]
    public function logout()
    {
        $input = $this->api->body();
        $refreshToken = (string) ($input['refreshToken'] ?? '');
        $claims = $this->api->validate_jwt($refreshToken);
        if ($claims && ($claims['type'] ?? '') === 'refresh' && ($claims['role'] ?? '') === 'admin') {
            $this->api->revoke_refresh_token($refreshToken);
        }
        $this->success(['loggedOut' => true]);
    }

    #[Get('/auth/me', middleware: ['admin_auth'])]
    public function me()
    {
        $claims = $this->api->validate_jwt($this->api->get_bearer_token() ?? '');
        if (!$claims || ($claims['role'] ?? '') !== 'admin') {
            $this->api->respond_error('Your admin session has expired. Sign in again.', 401);
        }

        $user = $this->users->find($claims['sub']);
        if (!$user || empty($user['is_active'])) {
            $this->api->respond_error('This admin account is inactive. Contact an administrator.', 401);
        }
        $role = $this->roles->find($user['role_id']);
        if (!$role) {
            $this->api->respond_error('This account does not have an assigned role.', 403);
        }

        $this->success(['user' => [
            'id' => (string) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $role['name'],
        ]]);
    }

    private function success($data, $status = 200)
    {
        $this->api->respond(['success' => true, 'data' => $data], $status);
    }

    private function reject_automated_auth(array $input): void
    {
        $honeypot = trim((string) ($input['website'] ?? ''));
        $startedAt = (int) ($input['formStartedAt'] ?? 0);
        $submittedTooFast = $startedAt > 0 && (microtime(true) * 1000 - $startedAt) < 1200;

        if ($honeypot !== '' || $submittedTooFast) {
            $this->api->respond_error('Unable to verify this sign-in request.', 422);
        }
    }

    private function recaptchaRequired(): bool
    {
        $configured = getenv('RECAPTCHA_REQUIRED');
        return $configured === false || filter_var($configured, FILTER_VALIDATE_BOOLEAN);
    }

    private function verify_recaptcha(string $token): array
    {
        $secret = trim((string) getenv('RECAPTCHA_SECRET_KEY'));
        if ($secret === '') return ['success' => false, 'error-codes' => ['missing-input-secret']];
        if ($token === '') return ['success' => false, 'error-codes' => ['missing-input-response']];
        if (!function_exists('curl_init')) return ['success' => false, 'error-codes' => ['verification-request-failed']];

        $curl = curl_init('https://www.google.com/recaptcha/api/siteverify');
        if ($curl === false) return ['success' => false, 'error-codes' => ['verification-request-failed']];

        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'secret' => $secret,
                'response' => $token,
            ]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $response = curl_exec($curl);
        curl_close($curl);
        $result = is_string($response) ? json_decode($response, true) : null;
        return is_array($result)
            ? $result
            : ['success' => false, 'error-codes' => ['verification-request-failed']];
    }
}
