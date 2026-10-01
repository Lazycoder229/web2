<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Allow_promotions_without_staff
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
        if ($forge->table_exists('promotions') && $forge->column_exists('promotions', 'created_by_staff_id')) {
            $forge->modify_column('promotions', [
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
        // Keep the column nullable so promotions remain usable without an auth system.
    }
}
