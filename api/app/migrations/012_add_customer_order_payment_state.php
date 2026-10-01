<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Add_customer_order_payment_state
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
        if (!$forge->table_exists('orders')) return;
        $columns = [];
        if (!$forge->column_exists('orders', 'payment_status')) {
            $columns['payment_status'] = ['type' => 'VARCHAR', 'constraint' => 32, 'null' => FALSE, 'default' => 'not_required'];
        }
        if (!$forge->column_exists('orders', 'payment_method')) {
            $columns['payment_method'] = ['type' => 'VARCHAR', 'constraint' => 20, 'null' => TRUE];
        }
        if (!$forge->column_exists('orders', 'payment_reference')) {
            $columns['payment_reference'] = ['type' => 'VARCHAR', 'constraint' => 100, 'null' => TRUE];
        }
        if ($columns) $forge->add_column('orders', $columns);
    }

    public function down()
    {
        $forge = $this->_lava->dbforge;
        foreach (['payment_reference', 'payment_method', 'payment_status'] as $column) {
            if ($forge->table_exists('orders') && $forge->column_exists('orders', $column)) {
                $forge->drop_column('orders', $column);
            }
        }
    }
}
