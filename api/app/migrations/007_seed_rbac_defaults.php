<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Seed_rbac_defaults
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
        $permissions = [
            ['orders:create', 'orders', 'Take counter orders and dine-in table requests'],
            ['orders:view', 'orders', 'Access live order queues and status boards'],
            ['orders:settle_payment', 'orders', 'Collect cash, card, and GCash payments'],
            ['orders:reprint_receipt', 'orders', 'Reprint customer receipts and order stubs'],
            ['voids:approve', 'voids', 'Authorize item cancellations and whole order refunds'],
            ['discounts:senior_pwd', 'voids', 'Apply statutory Senior and PWD discounts'],
            ['discounts:custom', 'voids', 'Apply promotional or manager price overrides'],
            ['menu:view', 'menu', 'Browse food and beverage offerings'],
            ['menu:manage', 'menu', 'Create and edit dishes, pricing, and descriptions'],
            ['menu:toggle_availability', 'menu', 'Mark menu items as unavailable'],
            ['inventory:view', 'inventory', 'Inspect ingredient inventory and reorder alerts'],
            ['inventory:stock_in', 'inventory', 'Record deliveries and warehouse restocks'],
            ['inventory:waste', 'inventory', 'Record spoilage and expired supplies'],
            ['reports:sales_view', 'reports', 'Access revenue and sales trends'],
            ['reports:expenses_manage', 'reports', 'Manage operational expenses'],
            ['reports:export', 'reports', 'Export financial reports'],
            ['employees:view', 'employees', 'View staff profiles'],
            ['employees:manage', 'employees', 'Hire and manage employee profiles'],
            ['employees:rfid_attendance', 'employees', 'Monitor RFID attendance'],
            ['employees:payroll', 'employees', 'Process payroll and deductions'],
            ['settings:view', 'settings', 'View store and printer settings'],
            ['settings:manage', 'settings', 'Configure POS and hardware'],
            ['settings:rbac', 'settings', 'Manage roles and permissions'],
        ];

        $permissionIds = [];
        foreach ($permissions as $index => [$code, $module, $description]) {
            $existing = $db->table('permissions')->where('code', $code)->get_all();
            if (!empty($existing)) {
                $permissionIds[$code] = (array) $existing[0];
                $permissionIds[$code] = $permissionIds[$code]['id'];
                continue;
            }
            $id = sprintf('00000000-0000-4000-8000-%012d', $index + 1);
            $db->table('permissions')->insert([
                'id' => $id,
                'code' => $code,
                'module' => $module,
                'description' => $description,
            ]);
            $permissionIds[$code] = $id;
        }

        $roles = $db->table('roles')->where('name', 'Staff')->get_all();
        if (empty($roles)) {
            $roleId = '00000000-0000-4000-8000-000000000100';
            $db->table('roles')->insert([
                'id' => $roleId,
                'name' => 'Staff',
                'description' => 'Default role for restaurant employees.',
                'is_system' => 1,
            ]);
            foreach (['orders:create', 'orders:view', 'menu:view'] as $code) {
                $db->table('role_permissions')->insert([
                    'role_id' => $roleId,
                    'permission_id' => $permissionIds[$code],
                ]);
            }
        }
    }

    public function down()
    {
        // Preserve roles and permissions already referenced by staff accounts.
    }
}
