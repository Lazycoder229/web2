<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Create_branches_table
{
    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
        $this->_lava->call->database();
    }

    public function up()
    {
        $forge = $this->_lava->dbforge;
        if ($forge->table_exists('branches')) {
            return;
        }

        $forge->add_field([
            'id' => ['type' => 'CHAR', 'constraint' => 36, 'null' => FALSE],
            'name' => ['type' => 'VARCHAR', 'constraint' => 120, 'null' => FALSE],
            'code' => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => FALSE, 'unique' => TRUE],
            'type' => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => FALSE, 'default' => 'branch'],
            'address' => ['type' => 'TEXT', 'null' => TRUE],
            'contact_number' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => TRUE],
            'email' => ['type' => 'VARCHAR', 'constraint' => 120, 'null' => TRUE],
            'is_main' => ['type' => 'BOOLEAN', 'null' => FALSE, 'default' => FALSE],
            'is_active' => ['type' => 'BOOLEAN', 'null' => FALSE, 'default' => TRUE],
            'created_at' => ['type' => 'TIMESTAMP', 'null' => FALSE, 'default' => 'CURRENT_TIMESTAMP'],
            'updated_at' => ['type' => 'TIMESTAMP', 'null' => TRUE, 'default' => NULL],
        ])->add_key('id', primary: TRUE)->create_table('branches');

        $db = $this->_lava->db;
        $branches = [
            ['id' => '00000000-0000-4000-8000-000000000201', 'name' => 'Main Branch', 'code' => 'MAIN', 'type' => 'main', 'address' => 'Main location', 'is_main' => 1, 'is_active' => 1],
            ['id' => '00000000-0000-4000-8000-000000000202', 'name' => 'Branch 1', 'code' => 'BR-001', 'type' => 'branch', 'address' => 'Branch 1 location', 'is_main' => 0, 'is_active' => 1],
            ['id' => '00000000-0000-4000-8000-000000000203', 'name' => 'Branch 2', 'code' => 'BR-002', 'type' => 'branch', 'address' => 'Branch 2 location', 'is_main' => 0, 'is_active' => 1],
        ];
        foreach ($branches as $branch) {
            $db->table('branches')->insert($branch);
        }
    }

    public function down()
    {
        if ($this->_lava->dbforge->table_exists('branches')) {
            $this->_lava->dbforge->drop_table('branches');
        }
    }
}
