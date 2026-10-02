<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Create_password_reset_tokens_table
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
        if ($forge->table_exists('password_reset_tokens')) return;

        $forge->add_field([
            'id' => ['type' => 'INT', 'unsigned' => TRUE, 'auto_increment' => TRUE, 'null' => FALSE],
            'account_type' => ['type' => 'VARCHAR', 'constraint' => 16, 'null' => FALSE],
            'account_id' => ['type' => 'CHAR', 'constraint' => 36, 'null' => FALSE],
            'token_hash' => ['type' => 'CHAR', 'constraint' => 64, 'null' => FALSE],
            'expires_at' => ['type' => 'DATETIME', 'null' => FALSE],
            'used_at' => ['type' => 'DATETIME', 'null' => TRUE, 'default' => NULL],
            'created_at' => ['type' => 'DATETIME', 'null' => FALSE],
        ])->add_key('id', primary: TRUE)
          ->add_key('token_hash', unique: TRUE)
          ->add_key(['account_type', 'account_id'], name: 'password_reset_account_idx')
          ->create_table('password_reset_tokens');
    }

    public function down()
    {
        if ($this->_lava->dbforge->table_exists('password_reset_tokens')) {
            $this->_lava->dbforge->drop_table('password_reset_tokens');
        }
    }
}
