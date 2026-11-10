<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Add_guest_qr_order_ip_limit
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
        if ($forge->table_exists('orders') && !$forge->column_exists('orders', 'guest_ip_hash')) {
            $forge->add_column('orders', [
                'guest_ip_hash' => ['type' => 'CHAR', 'constraint' => 64, 'null' => TRUE],
            ]);
        }
    }

    public function down()
    {
        $forge = $this->_lava->dbforge;
        if ($forge->table_exists('orders') && $forge->column_exists('orders', 'guest_ip_hash')) {
            $forge->drop_column('orders', 'guest_ip_hash');
        }
    }
}
