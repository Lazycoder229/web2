<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Add_customer_discount_profile
{
    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        $forge = $this->_lava->dbforge;
        if ($forge->table_exists('customers')) {
            if (!$forge->column_exists('customers', 'date_of_birth')) {
                $forge->add_column('customers', [
                    'date_of_birth' => ['type' => 'DATE', 'null' => TRUE],
                ]);
            }
            if (!$forge->column_exists('customers', 'pwd_id_number')) {
                $forge->add_column('customers', [
                    'pwd_id_number' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => TRUE],
                ]);
            }
        }

        if ($forge->table_exists('order_discounts') && $forge->column_exists('order_discounts', 'applied_by_staff_id')) {
            $forge->modify_column('order_discounts', [
                'applied_by_staff_id' => ['type' => 'CHAR', 'constraint' => 36, 'null' => TRUE],
            ]);
        }

        $this->seed_statutory_discount_types();
    }

    public function down()
    {
        $forge = $this->_lava->dbforge;
        if ($forge->table_exists('customers') && $forge->column_exists('customers', 'pwd_id_number')) {
            $forge->drop_column('customers', 'pwd_id_number');
        }
        if ($forge->table_exists('customers') && $forge->column_exists('customers', 'date_of_birth')) {
            $forge->drop_column('customers', 'date_of_birth');
        }
        // Keep applied_by_staff_id nullable so customer orders remain attributable
        // to the customer even if this migration is rolled back.
    }

    private function seed_statutory_discount_types()
    {
        $types = $this->_lava->call->model('DiscountTypeModel');
        $existing = $types->query()->get_all() ?: [];
        $hasSenior = false;
        $hasPwd = false;
        foreach ($existing as $type) {
            $name = strtolower((string) ($type['name'] ?? ''));
            $hasSenior = $hasSenior || strpos($name, 'senior') !== false || strpos($name, 'citizen') !== false;
            $hasPwd = $hasPwd || strpos($name, 'pwd') !== false || strpos($name, 'disabilit') !== false;
        }

        if (!$hasSenior) {
            $types->insert([
                'id' => '02100000-0000-4000-8000-000000000001',
                'name' => 'Senior Citizen',
                'percentage' => 20,
                'requires_id_verification' => true,
                'is_active' => true,
            ]);
        }
        if (!$hasPwd) {
            $types->insert([
                'id' => '02100000-0000-4000-8000-000000000002',
                'name' => 'PWD',
                'percentage' => 20,
                'requires_id_verification' => true,
                'is_active' => true,
            ]);
        }
    }
}
