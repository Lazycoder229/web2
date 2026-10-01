<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api')]
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
        $this->success(['roles' => $this->roles->query()->get_all() ?: [],'permissions' => $this->permissions->query()->get_all() ?: [],'users' => $this->users->query()->get_all() ?: []]);
    }
    #[Post('/rbac/roles')] public function create_role()
    {
        $i = $this->api->body();
        $id = $this->uuid();
        $this->roles->insert(['id' => $id,'name' => $i['name'] ?? '','description' => $i['description'] ?? null,'is_system' => false]);
        $this->success(['role' => $this->roles->find($id)], 201);
    }
    #[Put('/rbac/roles/{id:uuid}/permissions')] public function permissions($id)
    {
        $this->rolePermissions->query()->where('role_id', $id)->delete();
        foreach (($this->api->body()['permissionIds'] ?? []) as $permission) {
            $this->rolePermissions->insert(['role_id' => $id,'permission_id' => $permission]);
        } $this->success(['id' => $id]);
    }
    #[Put('/rbac/users/{id:uuid}/role')] public function user_role($id)
    {
        $this->users->query()->where('id', $id)->update(['role_id' => $this->api->body()['roleId'] ?? null]);
        $this->success(['id' => $id]);
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
