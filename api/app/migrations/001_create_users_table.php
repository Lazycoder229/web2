<?php

class Create_users_table {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        $forge = $this->_lava->dbforge;

        // Ensure roles table exists so foreign key can be referenced
        if (! $forge->table_exists('roles')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 50,
                    'null'       => FALSE,
                    'unique'     => TRUE,
                ],
                'description' => [
                    'type' => 'TEXT',
                    'null' => TRUE,
                ],
                'is_system' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => FALSE,
                ],
                'created_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
                'updated_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => TRUE,
                    'default' => NULL,
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->create_table('roles');
        }

        if (! $forge->table_exists('users')) {
            // Fresh creation conforming to dbdesign.md Section 2.4
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'role_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'email' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 255,
                    'null'       => FALSE,
                    'unique'     => TRUE,
                ],
                'password' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 255,
                    'null'       => FALSE,
                ],
                'name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => FALSE,
                ],
                'contact_number' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 20,
                    'null'       => TRUE,
                ],
                'is_active' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
                'last_login_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => TRUE,
                    'default' => NULL,
                ],
                'created_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
                'updated_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => TRUE,
                    'default' => NULL,
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->add_key('role_id', name: 'users_role_idx')
            ->add_key('email', name: 'users_email_idx')
            ->add_foreign_key('role_id', 'roles', 'id', 'CASCADE', 'CASCADE')
            ->create_table('users');
        } else {
            // Alter existing legacy users table to match dbdesign.md
            // 1. Modify id to CHAR(36)
            $this->_lava->db->raw("ALTER TABLE `users` MODIFY `id` CHAR(36) NOT NULL");

            // 2. Add role_id
            if (! $forge->column_exists('users', 'role_id')) {
                $forge->add_column('users', [
                    'role_id' => [
                        'type'       => 'CHAR',
                        'constraint' => 36,
                        'null'       => FALSE,
                        'after'      => 'id',
                    ],
                ]);
            }

            // 3. Add name
            if (! $forge->column_exists('users', 'name')) {
                $forge->add_column('users', [
                    'name' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 100,
                        'null'       => FALSE,
                        'after'      => 'password',
                    ],
                ]);
            }

            // 4. Add contact_number
            if (! $forge->column_exists('users', 'contact_number')) {
                $forge->add_column('users', [
                    'contact_number' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 20,
                        'null'       => TRUE,
                        'after'      => 'name',
                    ],
                ]);
            }

            // 5. Add last_login_at
            if (! $forge->column_exists('users', 'last_login_at')) {
                $forge->add_column('users', [
                    'last_login_at' => [
                        'type'    => 'TIMESTAMP',
                        'null'    => TRUE,
                        'default' => NULL,
                        'after'   => 'is_active',
                    ],
                ]);
            }

            // 6. Drop legacy username column
            if ($forge->column_exists('users', 'username')) {
                try {
                    $this->_lava->db->raw("ALTER TABLE `users` DROP INDEX `username_unique`");
                } catch (\Throwable $e) {}
                $forge->drop_column('users', 'username');
            }

            // 7. Drop legacy role column
            if ($forge->column_exists('users', 'role')) {
                try {
                    $this->_lava->db->raw("ALTER TABLE `users` DROP INDEX `role_idx`");
                } catch (\Throwable $e) {}
                $forge->drop_column('users', 'role');
            }

            // 8. Add role_id index and foreign key
            try {
                $this->_lava->db->raw("ALTER TABLE `users` ADD INDEX `users_role_idx` (`role_id`)");
            } catch (\Throwable $e) {}

            try {
                $this->_lava->db->raw("ALTER TABLE `users` ADD CONSTRAINT `fk_users_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE");
            } catch (\Throwable $e) {}
        }
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('users');
    }
}