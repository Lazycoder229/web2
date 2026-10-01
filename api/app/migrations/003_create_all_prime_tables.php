<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Migration: Create_all_prime_tables
 * 
 * Full migration covering all 38 tables from dbdesign.md for PRIME POS Ecosystem.
 * Uses DBForge to construct tables, columns, constraints, foreign keys, and indexes.
 */
class Create_all_prime_tables {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        $forge = $this->_lava->dbforge;

        // -------------------------------------------------------------
        // MODULE 1: AUTH & RBAC
        // -------------------------------------------------------------

        // 1. roles
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

        // 2. permissions
        if (! $forge->table_exists('permissions')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'code' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => FALSE,
                    'unique'     => TRUE,
                ],
                'module' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 50,
                    'null'       => FALSE,
                ],
                'description' => [
                    'type' => 'TEXT',
                    'null' => TRUE,
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->create_table('permissions');
        }

        // 3. role_permissions
        if (! $forge->table_exists('role_permissions')) {
            $forge->add_field([
                'role_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'permission_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
            ])
            ->add_key(['role_id', 'permission_id'], primary: TRUE)
            ->add_foreign_key('role_id', 'roles', 'id', 'CASCADE', 'CASCADE')
            ->add_foreign_key('permission_id', 'permissions', 'id', 'CASCADE', 'CASCADE')
            ->create_table('role_permissions');
        }

        // 4. users (staff: Owner, Manager, Cashier, Kitchen)
        if (! $forge->table_exists('users')) {
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
        } elseif (! $forge->column_exists('users', 'role_id')) {
            // Alter existing legacy users table only if missing role_id from dbdesign.md
            $this->_lava->db->raw("ALTER TABLE `users` MODIFY `id` CHAR(36) NOT NULL");

            $forge->add_column('users', [
                'role_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                    'after'      => 'id',
                ],
            ]);

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

            if ($forge->column_exists('users', 'username')) {
                $this->_lava->db->raw("ALTER TABLE `users` DROP INDEX `username_unique`");
                $forge->drop_column('users', 'username');
            }

            if ($forge->column_exists('users', 'role')) {
                $this->_lava->db->raw("ALTER TABLE `users` DROP INDEX `role_idx`");
                $forge->drop_column('users', 'role');
            }

            $this->_lava->db->raw("ALTER TABLE `users` ADD INDEX `users_role_idx` (`role_id`)");
            $this->_lava->db->raw("ALTER TABLE `users` ADD CONSTRAINT `fk_users_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE");
        }

        // -------------------------------------------------------------
        // MODULE 2: CUSTOMER
        // -------------------------------------------------------------

        // 5. customers
        if (! $forge->table_exists('customers')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'email' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 255,
                    'null'       => TRUE,
                    'unique'     => TRUE,
                ],
                'password' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 255,
                    'null'       => TRUE,
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
                'loyalty_points_balance' => [
                    'type'     => 'INT',
                    'unsigned' => TRUE,
                    'null'     => FALSE,
                    'default'  => 0,
                ],
                'is_guest' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
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
            ->add_key('email', name: 'customers_email_idx')
            ->create_table('customers');
        }

        // -------------------------------------------------------------
        // MODULE 3: MENU
        // -------------------------------------------------------------

        // 6. categories
        if (! $forge->table_exists('categories')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => FALSE,
                ],
                'sort_order' => [
                    'type'     => 'INT',
                    'unsigned' => FALSE,
                    'null'     => FALSE,
                    'default'  => 0,
                ],
                'is_active' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
                'created_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->create_table('categories');
        }

        // 7. menu_items
        if (! $forge->table_exists('menu_items')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'category_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 150,
                    'null'       => FALSE,
                ],
                'description' => [
                    'type' => 'TEXT',
                    'null' => TRUE,
                ],
                'price' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => FALSE,
                ],
                'image_url' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 500,
                    'null'       => TRUE,
                ],
                'is_available' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
                'stock_quantity' => [
                    'type'     => 'INT',
                    'unsigned' => TRUE,
                    'null'     => TRUE,
                    'default'  => NULL,
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
            ->add_key('category_id', name: 'menu_items_category_idx')
            ->add_key('is_available', name: 'menu_items_is_available_idx')
            ->add_foreign_key('category_id', 'categories', 'id', 'CASCADE', 'CASCADE')
            ->create_table('menu_items');
        }

        // -------------------------------------------------------------
        // MODULE 4: TABLES & QR
        // -------------------------------------------------------------

        // 8. restaurant_tables
        if (! $forge->table_exists('restaurant_tables')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'table_number' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 20,
                    'null'       => FALSE,
                    'unique'     => TRUE,
                ],
                'capacity' => [
                    'type'     => 'INT',
                    'unsigned' => TRUE,
                    'null'     => FALSE,
                ],
                'qr_code_url' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 500,
                    'null'       => TRUE,
                ],
                'status' => [
                    'type'       => 'ENUM',
                    'constraint' => "'available','occupied','reserved'",
                    'null'       => FALSE,
                    'default'    => 'available',
                ],
                'created_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->create_table('restaurant_tables');
        }

        // -------------------------------------------------------------
        // MODULE 5: ORDERS
        // -------------------------------------------------------------

        // 9. orders
        if (! $forge->table_exists('orders')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'order_number' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 30,
                    'null'       => FALSE,
                    'unique'     => TRUE,
                ],
                'table_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => TRUE,
                ],
                'customer_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => TRUE,
                ],
                'order_type' => [
                    'type'       => 'ENUM',
                    'constraint' => "'qr','counter'",
                    'null'       => FALSE,
                ],
                'status' => [
                    'type'       => 'ENUM',
                    'constraint' => "'pending','preparing','ready','served','completed','cancelled'",
                    'null'       => FALSE,
                    'default'    => 'pending',
                ],
                'subtotal' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => FALSE,
                ],
                'discount' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => FALSE,
                    'default'    => 0,
                ],
                'tax' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => FALSE,
                    'default'    => 0,
                ],
                'total' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => FALSE,
                ],
                'created_by_staff_id' => [
    'type'       => 'CHAR',
    'constraint' => 36,
    'null'       => TRUE,
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
            ->add_key('status', name: 'orders_status_idx')
            ->add_key('created_at', name: 'orders_created_at_idx')
            ->add_key('table_id', name: 'orders_table_id_idx')
            ->add_foreign_key('table_id', 'restaurant_tables', 'id', 'SET NULL', 'CASCADE')
            ->add_foreign_key('customer_id', 'customers', 'id', 'SET NULL', 'CASCADE')
            ->add_foreign_key('created_by_staff_id', 'users', 'id', 'SET NULL', 'CASCADE')
            ->create_table('orders');
        }

        // 10. order_items
        if (! $forge->table_exists('order_items')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'order_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'menu_item_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'quantity' => [
                    'type'     => 'INT',
                    'unsigned' => TRUE,
                    'null'     => FALSE,
                ],
                'unit_price' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => FALSE,
                ],
                'subtotal' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => FALSE,
                ],
                'notes' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 255,
                    'null'       => TRUE,
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->add_key('order_id', name: 'order_items_order_id_idx')
            ->add_foreign_key('order_id', 'orders', 'id', 'CASCADE', 'CASCADE')
            ->add_foreign_key('menu_item_id', 'menu_items', 'id', 'CASCADE', 'CASCADE')
            ->create_table('order_items');
        }

        // 11. order_status_history
        if (! $forge->table_exists('order_status_history')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'order_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'status' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 30,
                    'null'       => FALSE,
                ],
                'changed_by_staff_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => TRUE,
                ],
                'changed_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->add_key('order_id', name: 'order_status_history_order_idx')
            ->add_foreign_key('order_id', 'orders', 'id', 'CASCADE', 'CASCADE')
            ->add_foreign_key('changed_by_staff_id', 'users', 'id', 'SET NULL', 'CASCADE')
            ->create_table('order_status_history');
        }

        // 12. order_voids
        if (! $forge->table_exists('order_voids')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'order_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'requested_by_staff_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'approved_by_staff_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => TRUE,
                ],
                'reason' => [
                    'type' => 'TEXT',
                    'null' => FALSE,
                ],
                'status' => [
                    'type'       => 'ENUM',
                    'constraint' => "'pending','approved','rejected'",
                    'null'       => FALSE,
                    'default'    => 'pending',
                ],
                'requested_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
                'resolved_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => TRUE,
                    'default' => NULL,
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->add_key('order_id', name: 'order_voids_order_idx')
            ->add_foreign_key('order_id', 'orders', 'id', 'CASCADE', 'CASCADE')
            ->add_foreign_key('requested_by_staff_id', 'users', 'id', 'CASCADE', 'CASCADE')
            ->add_foreign_key('approved_by_staff_id', 'users', 'id', 'SET NULL', 'CASCADE')
            ->create_table('order_voids');
        }

        // Resolution comments are used by the manager void review workflow.
        if ($forge->table_exists('order_voids') && ! $forge->column_exists('order_voids', 'resolution_notes')) {
            $forge->add_column('order_voids', [
                'resolution_notes' => [
                    'type' => 'TEXT',
                    'null' => TRUE,
                ],
            ]);
        }

        // -------------------------------------------------------------
        // MODULE 6: RESERVATIONS
        // -------------------------------------------------------------

        // 13. reservations
        if (! $forge->table_exists('reservations')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'customer_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => TRUE,
                ],
                'customer_name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => FALSE,
                ],
                'contact_number' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 20,
                    'null'       => FALSE,
                ],
                'email' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 255,
                    'null'       => TRUE,
                ],
                'table_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => TRUE,
                ],
                'reservation_date' => [
                    'type' => 'DATE',
                    'null' => FALSE,
                ],
                'reservation_time' => [
                    'type' => 'TIME',
                    'null' => FALSE,
                ],
                'number_of_guests' => [
                    'type'     => 'INT',
                    'unsigned' => TRUE,
                    'null'     => FALSE,
                ],
                'status' => [
                    'type'       => 'ENUM',
                    'constraint' => "'pending','confirmed','cancelled','completed','no_show'",
                    'null'       => FALSE,
                    'default'    => 'pending',
                ],
                'notes' => [
                    'type' => 'TEXT',
                    'null' => TRUE,
                ],
                'created_by_staff_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => TRUE,
                ],
                'created_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->add_key(['reservation_date', 'reservation_time'], name: 'reservations_date_time_idx')
            ->add_foreign_key('customer_id', 'customers', 'id', 'SET NULL', 'CASCADE')
            ->add_foreign_key('table_id', 'restaurant_tables', 'id', 'SET NULL', 'CASCADE')
            ->add_foreign_key('created_by_staff_id', 'users', 'id', 'SET NULL', 'CASCADE')
            ->create_table('reservations');
        }

        // -------------------------------------------------------------
        // MODULE 7: PAYMENTS
        // -------------------------------------------------------------

        // 14. payments
        if (! $forge->table_exists('payments')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'order_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'receipt_number' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 30,
                    'null'       => FALSE,
                    'unique'     => TRUE,
                ],
                'amount_paid' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => FALSE,
                ],
                'payment_method' => [
                    'type'       => 'ENUM',
                    'constraint' => "'cash','gcash','card','other'",
                    'null'       => FALSE,
                ],
                'reference_number' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => TRUE,
                ],
                'processed_by_staff_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'paid_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->add_key('order_id', name: 'payments_order_idx')
            ->add_foreign_key('order_id', 'orders', 'id', 'CASCADE', 'CASCADE')
            ->add_foreign_key('processed_by_staff_id', 'users', 'id', 'CASCADE', 'CASCADE')
            ->create_table('payments');
        }

        // -------------------------------------------------------------
        // MODULE 8: LOYALTY PROGRAM
        // -------------------------------------------------------------

        // 15. loyalty_settings
        if (! $forge->table_exists('loyalty_settings')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'points_per_peso' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '5,2',
                    'null'       => FALSE,
                    'default'    => 1.00,
                ],
                'peso_value_per_point' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '5,2',
                    'null'       => FALSE,
                    'default'    => 0.50,
                ],
                'updated_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => TRUE,
                    'default' => NULL,
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->create_table('loyalty_settings');
        }

        // 16. loyalty_transactions
        if (! $forge->table_exists('loyalty_transactions')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'customer_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'order_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => TRUE,
                ],
                'type' => [
                    'type'       => 'ENUM',
                    'constraint' => "'earn','redeem'",
                    'null'       => FALSE,
                ],
                'points' => [
                    'type'     => 'INT',
                    'unsigned' => FALSE,
                    'null'     => FALSE,
                ],
                'balance_after' => [
                    'type'     => 'INT',
                    'unsigned' => TRUE,
                    'null'     => FALSE,
                ],
                'created_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->add_key('customer_id', name: 'loyalty_tx_customer_idx')
            ->add_foreign_key('customer_id', 'customers', 'id', 'CASCADE', 'CASCADE')
            ->add_foreign_key('order_id', 'orders', 'id', 'SET NULL', 'CASCADE')
            ->create_table('loyalty_transactions');
        }

        // 17. loyalty_rewards
        if (! $forge->table_exists('loyalty_rewards')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 150,
                    'null'       => FALSE,
                ],
                'points_cost' => [
                    'type'     => 'INT',
                    'unsigned' => TRUE,
                    'null'     => FALSE,
                ],
                'description' => [
                    'type' => 'TEXT',
                    'null' => TRUE,
                ],
                'is_active' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->create_table('loyalty_rewards');
        }

        // -------------------------------------------------------------
        // MODULE 9: EMPLOYEE & PAYROLL
        // -------------------------------------------------------------

        // 18. employees (1:1 with users)
        if (! $forge->table_exists('employees')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'user_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                    'unique'     => TRUE,
                ],
                'employee_number' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 20,
                    'null'       => FALSE,
                    'unique'     => TRUE,
                ],
                'position' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => FALSE,
                ],
                'department' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => TRUE,
                ],
                'rfid_card_uid' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 50,
                    'null'       => TRUE,
                    'unique'     => TRUE,
                ],
                'date_hired' => [
                    'type' => 'DATE',
                    'null' => FALSE,
                ],
                'date_terminated' => [
                    'type' => 'DATE',
                    'null' => TRUE,
                ],
                'employment_status' => [
                    'type'       => 'ENUM',
                    'constraint' => "'active','on_leave','terminated'",
                    'null'       => FALSE,
                    'default'    => 'active',
                ],
                'basic_salary' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => FALSE,
                ],
                'salary_type' => [
                    'type'       => 'ENUM',
                    'constraint' => "'daily','monthly'",
                    'null'       => FALSE,
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->add_foreign_key('user_id', 'users', 'id', 'CASCADE', 'CASCADE')
            ->create_table('employees');
        }

        // 19. deduction_types
        if (! $forge->table_exists('deduction_types')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => FALSE,
                ],
                'is_mandatory' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => FALSE,
                ],
                'is_active' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->create_table('deduction_types');
        }

        // 20. payroll_periods
        if (! $forge->table_exists('payroll_periods')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'period_start' => [
                    'type' => 'DATE',
                    'null' => FALSE,
                ],
                'period_end' => [
                    'type' => 'DATE',
                    'null' => FALSE,
                ],
                'status' => [
                    'type'       => 'ENUM',
                    'constraint' => "'open','processing','closed'",
                    'null'       => FALSE,
                    'default'    => 'open',
                ],
                'created_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->create_table('payroll_periods');
        }

        // 21. payroll_records
        if (! $forge->table_exists('payroll_records')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'employee_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'payroll_period_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'gross_pay' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => FALSE,
                ],
                'total_deductions' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => FALSE,
                    'default'    => 0,
                ],
                'net_pay' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => FALSE,
                ],
                'processed_by_staff_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'processed_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->add_key(['employee_id', 'payroll_period_id'], name: 'payroll_rec_emp_period_idx')
            ->add_foreign_key('employee_id', 'employees', 'id', 'CASCADE', 'CASCADE')
            ->add_foreign_key('payroll_period_id', 'payroll_periods', 'id', 'CASCADE', 'CASCADE')
            ->add_foreign_key('processed_by_staff_id', 'users', 'id', 'CASCADE', 'CASCADE')
            ->create_table('payroll_records');
        }

        // 22. payroll_deductions
        if (! $forge->table_exists('payroll_deductions')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'payroll_record_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'deduction_type_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'amount' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => FALSE,
                ],
                'notes' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 255,
                    'null'       => TRUE,
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->add_foreign_key('payroll_record_id', 'payroll_records', 'id', 'CASCADE', 'CASCADE')
            ->add_foreign_key('deduction_type_id', 'deduction_types', 'id', 'CASCADE', 'CASCADE')
            ->create_table('payroll_deductions');
        }

        // 23. employee_schedules
        if (! $forge->table_exists('employee_schedules')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'user_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'shift_date' => [
                    'type' => 'DATE',
                    'null' => FALSE,
                ],
                'start_time' => [
                    'type' => 'TIME',
                    'null' => FALSE,
                ],
                'end_time' => [
                    'type' => 'TIME',
                    'null' => FALSE,
                ],
                'created_by_staff_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => TRUE,
                ],
                'created_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->add_key('user_id', name: 'emp_sched_user_idx')
            ->add_foreign_key('user_id', 'users', 'id', 'CASCADE', 'CASCADE')
            ->add_foreign_key('created_by_staff_id', 'users', 'id', 'SET NULL', 'CASCADE')
            ->create_table('employee_schedules');
        }

        // 24. attendance_logs (RFID & time-clock tracking)
        if (! $forge->table_exists('attendance_logs')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'employee_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'log_date' => [
                    'type' => 'DATE',
                    'null' => FALSE,
                ],
                'clock_in' => [
                    'type' => 'TIMESTAMP',
                    'null' => FALSE,
                ],
                'clock_out' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => TRUE,
                    'default' => NULL,
                ],
                'total_hours' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '5,2',
                    'null'       => TRUE,
                    'default'    => NULL,
                ],
                'late_minutes' => [
                    'type'     => 'INT',
                    'unsigned' => TRUE,
                    'null'     => FALSE,
                    'default'  => 0,
                ],
                'overtime_hours' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '5,2',
                    'null'       => FALSE,
                    'default'    => 0.00,
                ],
                'status' => [
                    'type'       => 'ENUM',
                    'constraint' => "'on_time','late','overtime','incomplete','absent'",
                    'null'       => FALSE,
                    'default'    => 'on_time',
                ],
                'method' => [
                    'type'       => 'ENUM',
                    'constraint' => "'rfid','manual','pin'",
                    'null'       => FALSE,
                    'default'    => 'rfid',
                ],
                'rfid_card_uid_used' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 50,
                    'null'       => TRUE,
                ],
                'notes' => [
                    'type' => 'TEXT',
                    'null' => TRUE,
                ],
                'created_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->add_key('employee_id', name: 'att_logs_employee_idx')
            ->add_foreign_key('employee_id', 'employees', 'id', 'CASCADE', 'CASCADE')
            ->create_table('attendance_logs');
        }

        // -------------------------------------------------------------
        // MODULE 10: DISCOUNTS (SENIOR / PWD)
        // -------------------------------------------------------------

        // 25. discount_types
        if (! $forge->table_exists('discount_types')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => FALSE,
                ],
                'percentage' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '5,2',
                    'null'       => FALSE,
                ],
                'requires_id_verification' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
                'is_active' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->create_table('discount_types');
        }

        // 26. order_discounts
        if (! $forge->table_exists('order_discounts')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'order_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'discount_type_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'id_number' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 50,
                    'null'       => TRUE,
                ],
                'holder_name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => FALSE,
                ],
                'discount_amount' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => FALSE,
                ],
                'applied_by_staff_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'created_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->add_key('order_id', name: 'order_discounts_order_idx')
            ->add_foreign_key('order_id', 'orders', 'id', 'CASCADE', 'CASCADE')
            ->add_foreign_key('discount_type_id', 'discount_types', 'id', 'CASCADE', 'CASCADE')
            ->add_foreign_key('applied_by_staff_id', 'users', 'id', 'CASCADE', 'CASCADE')
            ->create_table('order_discounts');
        }

        // -------------------------------------------------------------
        // MODULE 11: PROMOTIONS
        // -------------------------------------------------------------

        // 27. promotions
        if (! $forge->table_exists('promotions')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 150,
                    'null'       => FALSE,
                ],
                'description' => [
                    'type' => 'TEXT',
                    'null' => TRUE,
                ],
                'promo_type' => [
                    'type'       => 'ENUM',
                    'constraint' => "'percentage','fixed_amount','buy_x_get_y'",
                    'null'       => FALSE,
                ],
                'discount_value' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => TRUE,
                    'default'    => NULL,
                ],
                'min_spend' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => TRUE,
                    'default'    => NULL,
                ],
                'start_date' => [
                    'type' => 'DATE',
                    'null' => FALSE,
                ],
                'end_date' => [
                    'type' => 'DATE',
                    'null' => FALSE,
                ],
                'usage_limit' => [
                    'type'     => 'INT',
                    'unsigned' => TRUE,
                    'null'     => TRUE,
                    'default'  => NULL,
                ],
                'usage_count' => [
                    'type'     => 'INT',
                    'unsigned' => TRUE,
                    'null'     => FALSE,
                    'default'  => 0,
                ],
                'is_active' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
                'created_by_staff_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => TRUE,
                ],
                'created_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->add_foreign_key('created_by_staff_id', 'users', 'id', 'SET NULL', 'CASCADE')
            ->create_table('promotions');
        }

        // 28. promotion_items (junction)
        if (! $forge->table_exists('promotion_items')) {
            $forge->add_field([
                'promotion_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'menu_item_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
            ])
            ->add_key(['promotion_id', 'menu_item_id'], primary: TRUE)
            ->add_foreign_key('promotion_id', 'promotions', 'id', 'CASCADE', 'CASCADE')
            ->add_foreign_key('menu_item_id', 'menu_items', 'id', 'CASCADE', 'CASCADE')
            ->create_table('promotion_items');
        }

        // 29. order_promotions (junction)
        if (! $forge->table_exists('order_promotions')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'order_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'promotion_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'discount_amount' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => FALSE,
                ],
                'applied_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->add_foreign_key('order_id', 'orders', 'id', 'CASCADE', 'CASCADE')
            ->add_foreign_key('promotion_id', 'promotions', 'id', 'CASCADE', 'CASCADE')
            ->create_table('order_promotions');
        }

        // -------------------------------------------------------------
        // MODULE 12: DEVICES
        // -------------------------------------------------------------

        // 30. printers
        if (! $forge->table_exists('printers')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => FALSE,
                ],
                'location' => [
                    'type'       => 'ENUM',
                    'constraint' => "'kitchen','counter'",
                    'null'       => FALSE,
                ],
                'connection_type' => [
                    'type'       => 'ENUM',
                    'constraint' => "'network','usb','bluetooth'",
                    'null'       => FALSE,
                ],
                'ip_address' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 50,
                    'null'       => TRUE,
                ],
                'is_active' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->create_table('printers');
        }

        // -------------------------------------------------------------
        // MODULE 13: AUDIT
        // -------------------------------------------------------------

        // 31. audit_logs
        if (! $forge->table_exists('audit_logs')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'user_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => TRUE,
                ],
                'action' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => FALSE,
                ],
                'entity_type' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 50,
                    'null'       => FALSE,
                ],
                'entity_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'details' => [
                    'type' => 'JSON',
                    'null' => TRUE,
                ],
                'ip_address' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 45,
                    'null'       => TRUE,
                ],
                'created_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->add_key('user_id', name: 'audit_logs_user_idx')
            ->add_key(['entity_type', 'entity_id'], name: 'audit_logs_entity_idx')
            ->add_foreign_key('user_id', 'users', 'id', 'SET NULL', 'CASCADE')
            ->create_table('audit_logs');
        }

        // -------------------------------------------------------------
        // MODULE 14: EXPENSES
        // -------------------------------------------------------------

        // 32. expense_categories
        if (! $forge->table_exists('expense_categories')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => FALSE,
                    'unique'     => TRUE,
                ],
                'is_active' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
                'created_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->create_table('expense_categories');
        }

        // 33. expenses
        if (! $forge->table_exists('expenses')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'category_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'description' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 255,
                    'null'       => FALSE,
                ],
                'amount' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => FALSE,
                ],
                'expense_date' => [
                    'type' => 'DATE',
                    'null' => FALSE,
                ],
                'receipt_reference' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => TRUE,
                ],
                'notes' => [
                    'type' => 'TEXT',
                    'null' => TRUE,
                ],
                'recorded_by_staff_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
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
            ->add_key('category_id', name: 'expenses_category_idx')
            ->add_key(['category_id', 'expense_date'], name: 'expenses_cat_date_idx')
            ->add_foreign_key('category_id', 'expense_categories', 'id', 'CASCADE', 'CASCADE')
            ->add_foreign_key('recorded_by_staff_id', 'users', 'id', 'CASCADE', 'CASCADE')
            ->create_table('expenses');
        }

        // -------------------------------------------------------------
        // MODULE 15: INVENTORY
        // -------------------------------------------------------------

        // 34. inventory_categories
        if (! $forge->table_exists('inventory_categories')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => FALSE,
                ],
                'created_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->create_table('inventory_categories');
        }

        // 35. inventory_items
        if (! $forge->table_exists('inventory_items')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'category_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => TRUE,
                ],
                'name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 150,
                    'null'       => FALSE,
                ],
                'unit' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 30,
                    'null'       => FALSE,
                ],
                'stock_quantity' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,3',
                    'null'       => FALSE,
                    'default'    => 0.000,
                ],
                'reorder_threshold' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,3',
                    'null'       => TRUE,
                    'default'    => NULL,
                ],
                'unit_cost' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,2',
                    'null'       => TRUE,
                    'default'    => NULL,
                ],
                'supplier' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 150,
                    'null'       => TRUE,
                ],
                'is_active' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
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
            ->add_key('category_id', name: 'inventory_items_category_idx')
            ->add_key(['category_id', 'is_active'], name: 'inventory_cat_active_idx')
            ->add_foreign_key('category_id', 'inventory_categories', 'id', 'SET NULL', 'CASCADE')
            ->create_table('inventory_items');
        }

        // 36. inventory_stock_logs
        if (! $forge->table_exists('inventory_stock_logs')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'item_type' => [
                    'type'       => 'ENUM',
                    'constraint' => "'ingredient','menu_item'",
                    'null'       => FALSE,
                ],
                'inventory_item_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => TRUE,
                ],
                'menu_item_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => TRUE,
                ],
                'type' => [
                    'type'       => 'ENUM',
                    'constraint' => "'stock_in','adjustment','waste','consumed'",
                    'null'       => FALSE,
                ],
                'quantity_change' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,3',
                    'null'       => FALSE,
                ],
                'quantity_after' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,3',
                    'null'       => TRUE,
                    'default'    => NULL,
                ],
                'note' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 255,
                    'null'       => TRUE,
                ],
                'performed_by_staff_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => TRUE,
                ],
                'created_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => FALSE,
                    'default' => 'CURRENT_TIMESTAMP',
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->add_key(['inventory_item_id', 'created_at'], name: 'inv_stock_logs_item_idx')
            ->add_key(['menu_item_id', 'created_at'], name: 'inv_stock_logs_menu_idx')
            ->add_foreign_key('inventory_item_id', 'inventory_items', 'id', 'SET NULL', 'CASCADE')
            ->add_foreign_key('menu_item_id', 'menu_items', 'id', 'SET NULL', 'CASCADE')
            ->add_foreign_key('performed_by_staff_id', 'users', 'id', 'SET NULL', 'CASCADE')
            ->create_table('inventory_stock_logs');
        }

        // 37. menu_item_ingredients (junction)
        if (! $forge->table_exists('menu_item_ingredients')) {
            $forge->add_field([
                'menu_item_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'inventory_item_id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'quantity_used' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '10,3',
                    'null'       => FALSE,
                ],
            ])
            ->add_key(['menu_item_id', 'inventory_item_id'], primary: TRUE)
            ->add_key('menu_item_id', name: 'menu_ingredients_menu_idx')
            ->add_key('inventory_item_id', name: 'menu_ingredients_inv_idx')
            ->add_foreign_key('menu_item_id', 'menu_items', 'id', 'CASCADE', 'CASCADE')
            ->add_foreign_key('inventory_item_id', 'inventory_items', 'id', 'CASCADE', 'CASCADE')
            ->create_table('menu_item_ingredients');
        }

        // -------------------------------------------------------------
        // MODULE 16: SYSTEM SETTINGS
        // -------------------------------------------------------------

        // 38. system_settings
        if (! $forge->table_exists('system_settings')) {
            $forge->add_field([
                'id' => [
                    'type'       => 'CHAR',
                    'constraint' => 36,
                    'null'       => FALSE,
                ],
                'restaurant_name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 150,
                    'null'       => FALSE,
                    'default'    => 'PRIME Roast & Grill',
                ],
                'branch_name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => FALSE,
                    'default'    => 'Main Branch - Manila',
                ],
                'contact_number' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 50,
                    'null'       => FALSE,
                    'default'    => '+63 917 123 4567',
                ],
                'email' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => FALSE,
                    'default'    => 'contact@primerestaurant.ph',
                ],
                'address' => [
                    'type' => 'TEXT',
                    'null' => FALSE,
                ],
                'tin_number' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 50,
                    'null'       => TRUE,
                ],
                'bir_min' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 50,
                    'null'       => TRUE,
                ],
                'currency_symbol' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 10,
                    'null'       => FALSE,
                    'default'    => '₱',
                ],
                'currency_code' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 10,
                    'null'       => FALSE,
                    'default'    => 'PHP',
                ],
                'timezone' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 50,
                    'null'       => FALSE,
                    'default'    => 'Asia/Manila',
                ],
                'vat_enabled' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
                'vat_rate' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '5,2',
                    'null'       => FALSE,
                    'default'    => 12.00,
                ],
                'vat_inclusive' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
                'service_charge_enabled' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => FALSE,
                ],
                'service_charge_rate' => [
                    'type'       => 'DECIMAL',
                    'constraint' => '5,2',
                    'null'       => FALSE,
                    'default'    => 5.00,
                ],
                'senior_pwd_discount_enabled' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
                'order_number_prefix' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 20,
                    'null'       => FALSE,
                    'default'    => 'ORD-',
                ],
                'auto_accept_qr_orders' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => FALSE,
                ],
                'require_table_selection' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
                'manager_approval_for_voids' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
                'low_stock_threshold_alert' => [
                    'type'     => 'INT',
                    'unsigned' => TRUE,
                    'null'     => FALSE,
                    'default'  => 10,
                ],
                'receipt_header' => [
                    'type' => 'TEXT',
                    'null' => TRUE,
                ],
                'receipt_footer' => [
                    'type' => 'TEXT',
                    'null' => TRUE,
                ],
                'print_receipt_auto' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
                'print_kot_auto' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
                'show_wifi_on_receipt' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
                'wifi_ssid' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => TRUE,
                ],
                'wifi_password' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => TRUE,
                ],
                'opening_time' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 10,
                    'null'       => FALSE,
                    'default'    => '08:00',
                ],
                'closing_time' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 10,
                    'null'       => FALSE,
                    'default'    => '22:00',
                ],
                'cash_drawer_opening_balance_required' => [
                    'type'    => 'BOOLEAN',
                    'null'    => FALSE,
                    'default' => TRUE,
                ],
                'updated_at' => [
                    'type'    => 'TIMESTAMP',
                    'null'    => TRUE,
                    'default' => NULL,
                ],
            ])
            ->add_key('id', primary: TRUE)
            ->create_table('system_settings');
        }
    }

    public function down()
    {
        $forge = $this->_lava->dbforge;

        // Drop in reverse dependency order
        $tables = [
            'system_settings',
            'menu_item_ingredients',
            'inventory_stock_logs',
            'inventory_items',
            'inventory_categories',
            'expenses',
            'expense_categories',
            'audit_logs',
            'printers',
            'order_promotions',
            'promotion_items',
            'promotions',
            'order_discounts',
            'discount_types',
            'attendance_logs',
            'employee_schedules',
            'payroll_deductions',
            'payroll_records',
            'payroll_periods',
            'deduction_types',
            'employees',
            'loyalty_rewards',
            'loyalty_transactions',
            'loyalty_settings',
            'payments',
            'reservations',
            'order_voids',
            'order_status_history',
            'order_items',
            'orders',
            'restaurant_tables',
            'menu_items',
            'categories',
            'customers',
            'users',
            'role_permissions',
            'permissions',
            'roles',
        ];

        foreach ($tables as $table) {
            if ($forge->table_exists($table)) {
                $forge->drop_table($table);
            }
        }
    }
}
