<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class AdminAuthMiddleware
{
    public function handle(Closure $next)
    {
        $api = lava_instance()->call->library('api');
        $claims = $api->validate_jwt($api->get_bearer_token() ?? '');
        if (!$claims || ($claims['type'] ?? 'access') !== 'access' || ($claims['role'] ?? '') !== 'admin') {
            $api->respond_error('Admin sign-in is required.', 401);
        }

        // Cashier accounts are limited server-side to their assigned operational modules.
        $lava = lava_instance();
        $lava->call->database();
        $users = $lava->call->model('UserModel');
        $roles = $lava->call->model('RoleModel');
        $rolePermissions = $lava->call->model('RolePermissionModel');
        $permissions = $lava->call->model('PermissionModel');
        $user = $users->find($claims['sub'] ?? '');
        $role = $user ? $roles->find($user['role_id'] ?? '') : null;
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $path = (string) parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
        $isCashier = strtolower((string) ($role['name'] ?? '')) === 'cashier';

        if ($isCashier) {
            $grants = $rolePermissions->query()->where('role_id', $role['id'])->get_all() ?: [];
            $permissionIds = array_fill_keys(array_map(function ($grant) {
                return (string) ($grant['permission_id'] ?? '');
            }, $grants), true);
            $codes = [];
            foreach ($permissions->query()->get_all() ?: [] as $permission) {
                if (isset($permissionIds[(string) ($permission['id'] ?? '')])) $codes[] = $permission['code'] ?? '';
            }
            $allowed = $path === '/api/auth/me';
            $rules = [
                ['menu:view', 'GET', '#^/api/menu$#'],
                ['orders:view', 'GET', '#^/api/orders(?:/[a-f0-9-]+)?$#i'],
                ['orders:view', 'PUT', '#^/api/orders/[a-f0-9-]+/status$#i'],
                ['reservations:view', 'GET|POST', '#^/api/reservations$#'],
                ['reservations:view', 'PUT|DELETE', '#^/api/reservations/[a-f0-9-]+$#i'],
                ['inventory:view', 'GET', '#^/api/inventory(?:/access|/recipes(?:/[a-f0-9-]+)?)?$#i'],
            ];
            foreach ($rules as [$code, $methods, $pattern]) {
                if (in_array($code, $codes, true) && in_array($method, explode('|', $methods), true) && preg_match($pattern, $path)) {
                    $allowed = true;
                    break;
                }
            }
            if (!$allowed) $api->respond_error('Your cashier role does not have access to this action.', 403);
        }

        return $next();
    }
}
