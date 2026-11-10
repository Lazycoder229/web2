<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Add_occupied_at_to_restaurant_tables
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
        if ($forge->table_exists('restaurant_tables') && !$forge->column_exists('restaurant_tables', 'occupied_at')) {
            $forge->add_column('restaurant_tables', [
                'occupied_at' => ['type' => 'DATETIME', 'null' => TRUE],
            ]);
        }
    }

    public function down()
    {
        $forge = $this->_lava->dbforge;
        if ($forge->table_exists('restaurant_tables') && $forge->column_exists('restaurant_tables', 'occupied_at')) {
            $forge->drop_column('restaurant_tables', 'occupied_at');
        }
    }
}
