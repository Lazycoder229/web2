<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Seed_cashier_role
{
    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->database();
    }

    public function up()
    {
        $db = $this->_lava->db;
        $permission = $db->table('permissions')->where('code', 'reservations:view')->get_all();
        if (empty($permission)) {
            $db->table('permissions')->insert([
                'id' => '00000000-0000-4000-8000-000000000025',
                'code' => 'reservations:view',
                'module' => 'reservations',
                'description' => 'View and manage customer reservations',
            ]);
            $permission = $db->table('permissions')->where('code', 'reservations:view')->get_all();
        }

        $roleRows = $db->table('roles')->where('name', 'Cashier')->get_all();
        if (empty($roleRows)) {
            $roleId = '00000000-0000-4000-8000-000000000101';
            $db->table('roles')->insert([
                'id' => $roleId,
                'name' => 'Cashier',
                'description' => 'Cashier access to menu, reservations, live orders, and inventory.',
                'is_system' => 1,
            ]);
        } else {
            $roleId = (array) $roleRows[0];
            $roleId = $roleId['id'];
        }

        foreach (['menu:view', 'reservations:view', 'orders:view', 'inventory:view'] as $code) {
            $permissionRows = $db->table('permissions')->where('code', $code)->get_all();
            if (empty($permissionRows)) continue;
            $permissionId = (array) $permissionRows[0];
            $permissionId = $permissionId['id'];
            $assigned = $db->table('role_permissions')->where('role_id', $roleId)->where('permission_id', $permissionId)->get_all();
            if (empty($assigned)) {
                $db->table('role_permissions')->insert(['role_id' => $roleId, 'permission_id' => $permissionId]);
            }
        }
    }

    public function down()
    {
        // Keep the role and grants to avoid breaking cashier accounts already created.
    }
}
