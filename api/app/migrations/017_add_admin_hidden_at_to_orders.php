<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Add_admin_hidden_at_to_orders
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
        if ($forge->table_exists('orders') && !$forge->column_exists('orders', 'admin_hidden_at')) {
            $forge->add_column('orders', [
                'admin_hidden_at' => ['type' => 'DATETIME', 'null' => TRUE],
            ]);
        }
    }

    public function down()
    {
        $forge = $this->_lava->dbforge;
        if ($forge->table_exists('orders') && $forge->column_exists('orders', 'admin_hidden_at')) {
            $forge->drop_column('orders', 'admin_hidden_at');
        }
    }
}
