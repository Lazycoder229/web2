<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Add_reservation_end_time {

    private $_lava;
    protected $dbforge;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        $forge = $this->_lava->dbforge;
        if (!$forge->table_exists('reservations')) {
            return;
        }

        if (!$forge->column_exists('reservations', 'reservation_end_time')) {
            $forge->add_column('reservations', [
                'reservation_end_time' => [
                    'type' => 'TIME',
                    'null' => TRUE,
                ],
            ]);
        }

        $this->_lava->db->raw(
            "UPDATE reservations
             SET reservation_end_time = ADDTIME(reservation_time, '02:00:00')
             WHERE reservation_end_time IS NULL"
        );
    }

    public function down()
    {
        $forge = $this->_lava->dbforge;
        if ($forge->table_exists('reservations') && $forge->column_exists('reservations', 'reservation_end_time')) {
            $forge->drop_column('reservations', 'reservation_end_time');
        }
    }
}