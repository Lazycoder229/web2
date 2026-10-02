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
}
