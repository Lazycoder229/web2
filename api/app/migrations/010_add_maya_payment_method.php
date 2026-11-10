<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Add_maya_payment_method
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
        if (!$forge->table_exists('payments') || !$forge->column_exists('payments', 'payment_method')) return;

        $forge->modify_column('payments', [
            'payment_method' => [
                'type' => 'ENUM',
                'constraint' => "'cash','gcash','maya','card','other'",
                'null' => FALSE,
            ],
        ]);
    }

    public function down()
    {
        // Retain recorded Maya payments when rolling back application code.
    }
}
