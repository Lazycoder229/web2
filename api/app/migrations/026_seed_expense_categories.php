<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Seed_expense_categories
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
        $categories = [
            ['00000000-0000-4000-8000-000000000201', 'Supplies'],
            ['00000000-0000-4000-8000-000000000202', 'Utilities'],
            ['00000000-0000-4000-8000-000000000203', 'Maintenance'],
            ['00000000-0000-4000-8000-000000000204', 'Payroll'],
            ['00000000-0000-4000-8000-000000000205', 'Other'],
        ];

        foreach ($categories as [$id, $name]) {
            if ($db->table('expense_categories')->where('name', $name)->get_all()) {
                continue;
            }

            $db->table('expense_categories')->insert([
                'id' => $id,
                'name' => $name,
                'is_active' => 1,
            ]);
        }
    }

    public function down()
    {
        // Keep categories because expense rows may already reference them.
    }
}
