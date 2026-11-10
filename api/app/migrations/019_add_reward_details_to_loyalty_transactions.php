<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Add_reward_details_to_loyalty_transactions
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
        if (!$forge->table_exists('loyalty_transactions')) return;

        if (!$forge->column_exists('loyalty_transactions', 'reward_id')) {
            $forge->add_column('loyalty_transactions', [
                'reward_id' => ['type' => 'CHAR', 'constraint' => 36, 'null' => TRUE, 'default' => NULL],
            ]);
        }
        if (!$forge->column_exists('loyalty_transactions', 'reward_name')) {
            $forge->add_column('loyalty_transactions', [
                'reward_name' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => TRUE, 'default' => NULL],
            ]);
        }
    }

    public function down()
    {
        $forge = $this->_lava->dbforge;
        if (!$forge->table_exists('loyalty_transactions')) return;
        foreach (['reward_name', 'reward_id'] as $column) {
            if ($forge->column_exists('loyalty_transactions', $column)) {
                $forge->drop_column('loyalty_transactions', $column);
            }
        }
    }
}
