<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api', middleware: ['admin_auth'])]
class Rbac extends Controller
{
    private $api;
    private $roles;
    private $permissions;
    private $users;
    private $rolePermissions;
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->roles = $this->call->model('RoleModel');
        $this->permissions = $this->call->model('PermissionModel');
        $this->users = $this->call->model('UserModel');
        $this->rolePermissions = $this->call->model('RolePermissionModel');
    }
    #[Get('/rbac')] public function index()
    {
        $rawRoles = $this->roles->query()->get_all() ?: [];
        $roles = array_map(function($r) {
            $row = (array)$r;
            $row['is_system'] = (bool)($row['is_system'] ?? false);
            $row['isSystem'] = $row['is_system'];
            return $row;
        }, $rawRoles);

        $rawUsers = $this->users->query()->get_all() ?: [];
        $users = array_map(function($u) {
            $row = (array)$u;
            $row['roleId'] = $row['role_id'] ?? '';
            $row['isActive'] = (bool)($row['is_active'] ?? false);
            $row['contactNumber'] = $row['contact_number'] ?? '';
            $row['lastLoginAt'] = $row['last_login_at'] ?? null;
            return $row;
        }, $rawUsers);

        $rawRolePermissions = $this->rolePermissions->query()->get_all() ?: [];
        $rolePermissions = array_map(function($rp) {
            $row = (array)$rp;
            $row['roleId'] = $row['role_id'] ?? '';
            $row['permissionId'] = $row['permission_id'] ?? '';
            return $row;
        }, $rawRolePermissions);

        $this->success([
            'roles' => $roles,
            'permissions' => $this->permissions->query()->get_all() ?: [],
            'users' => $users,
            'rolePermissions' => $rolePermissions
        ]);
    }
    #[Post('/rbac/roles')] public function create_role()
    {
        $i = $this->api->body();
        $id = $this->uuid();
        $this->roles->insert(['id' => $id,'name' => $i['name'] ?? '','description' => $i['description'] ?? null,'is_system' => false]);
        $pIds = $i['permissionIds'] ?? $i['permission_ids'] ?? [];
        if (!empty($pIds) && is_array($pIds)) {
            foreach ($pIds as $permission) {
                $this->rolePermissions->insert(['role_id' => $id,'permission_id' => $permission]);
            }
        }
        $createdRole = (array)$this->roles->find($id);
        $createdRole['is_system'] = false;
        $createdRole['isSystem'] = false;
        $this->success(['role' => $createdRole], 201);
    }
    #[Put('/rbac/roles/{id:uuid}/permissions')] public function permissions($id)
    {
        $this->rolePermissions->query()->where('role_id', $id)->delete();
        $pIds = $this->api->body()['permissionIds'] ?? $this->api->body()['permission_ids'] ?? [];
        if (is_array($pIds)) {
            foreach ($pIds as $permission) {
                $this->rolePermissions->insert(['role_id' => $id,'permission_id' => $permission]);
            }
        }
        $this->success(['id' => $id]);
    }
    #[Put('/rbac/users/{id:uuid}/role')] public function user_role($id)
    {
        $body = $this->api->body();
        $roleId = $body['roleId'] ?? $body['role_id'] ?? null;
        $this->users->query()->where('id', $id)->update(['role_id' => $roleId]);
        $this->success(['id' => $id, 'roleId' => $roleId]);
    }
    private function uuid()
    {
        $h = bin2hex(random_bytes(16));
        return substr($h, 0, 8).'-'.substr($h, 8, 4).'-'.substr($h, 12, 4).'-'.substr($h, 16, 4).'-'.substr($h, 20);
    }
    private function success($d, $s = 200)
    {
        $this->api->respond(['success' => true,'data' => $d], $s);
    }
}
