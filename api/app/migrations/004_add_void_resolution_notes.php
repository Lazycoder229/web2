<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Add_void_resolution_notes
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
        if ($forge->table_exists('order_voids') && !$forge->column_exists('order_voids', 'resolution_notes')) {
            $forge->add_column('order_voids', [
                'resolution_notes' => [
                    'type' => 'TEXT',
                    'null' => TRUE,
                ],
            ]);
        }
    }

    public function down()
    {
        $forge = $this->_lava->dbforge;
        if ($forge->table_exists('order_voids') && $forge->column_exists('order_voids', 'resolution_notes')) {
            $forge->drop_column('order_voids', 'resolution_notes');
        }
    }
}
