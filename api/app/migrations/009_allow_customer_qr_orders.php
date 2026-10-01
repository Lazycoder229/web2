<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Allow_customer_qr_orders
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
        if ($forge->table_exists('orders') && $forge->column_exists('orders', 'created_by_staff_id')) {
            $forge->modify_column('orders', [
                'created_by_staff_id' => [
                    'type' => 'CHAR',
                    'constraint' => 36,
                    'null' => TRUE,
                ],
            ]);
        }
    }

    public function down()
    {
        // Keep customer-created orders valid without a staff account.
    }
}
