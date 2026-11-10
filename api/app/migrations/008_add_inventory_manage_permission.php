<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Add_inventory_manage_permission
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
        $existing = $db->table('permissions')->where('code', 'inventory:manage')->get_all();
        if (!empty($existing)) return;

        $db->table('permissions')->insert([
            'id' => '00000000-0000-4000-8000-000000000024',
            'code' => 'inventory:manage',
            'module' => 'inventory',
            'description' => 'Create and edit inventory items, categories, and stock counts',
        ]);
    }

    public function down()
    {
        // Keep this permission if it has been assigned to an existing role.
    }
}
