<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Allow_unattributed_order_voids
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
        if ($forge->table_exists('order_voids') && $forge->column_exists('order_voids', 'requested_by_staff_id')) {
            $forge->modify_column('order_voids', [
                'requested_by_staff_id' => [
                    'type' => 'CHAR',
                    'constraint' => 36,
                    'null' => TRUE,
                ],
            ]);
        }
    }

    public function down()
    {
        // Keep this column nullable so QR and system cancellations can be audited.
    }
}
