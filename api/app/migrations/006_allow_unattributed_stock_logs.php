<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Allow_unattributed_stock_logs
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
        if ($forge->table_exists('inventory_stock_logs') && $forge->column_exists('inventory_stock_logs', 'performed_by_staff_id')) {
            $forge->modify_column('inventory_stock_logs', [
                'performed_by_staff_id' => [
                    'type' => 'CHAR',
                    'constraint' => 36,
                    'null' => TRUE,
                ],
            ]);
        }
    }

    public function down()
    {
        // Keep stock history writable when no authenticated staff identity exists.
    }
}
