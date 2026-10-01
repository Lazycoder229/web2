<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Add_mobile_payment_qr_settings
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
        if (!$forge->table_exists('system_settings')) return;
        foreach (['gcash_qr_image', 'maya_qr_image'] as $column) {
            if (!$forge->column_exists('system_settings', $column)) {
                $forge->add_column('system_settings', [$column => ['type' => 'LONGTEXT', 'null' => TRUE]]);
            }
        }
    }

    public function down()
    {
        $forge = $this->_lava->dbforge;
        foreach (['gcash_qr_image', 'maya_qr_image'] as $column) {
            if ($forge->table_exists('system_settings') && $forge->column_exists('system_settings', $column)) {
                $forge->drop_column('system_settings', $column);
            }
        }
    }
}
