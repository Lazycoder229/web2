<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Add_fixed_government_contribution_amounts
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
        if (!$forge->table_exists('system_settings')) return;

        $amounts = [
            'sss_employee_monthly_amount' => 750.00,
            'sss_employer_monthly_amount' => 750.00,
            'philhealth_employee_monthly_amount' => 200.00,
            'philhealth_employer_monthly_amount' => 200.00,
            'pagibig_employee_monthly_amount' => 150.00,
            'pagibig_employer_monthly_amount' => 150.00,
        ];
        foreach ($amounts as $column => $default) {
            if (!$forge->column_exists('system_settings', $column)) {
                $forge->add_column('system_settings', [
                    $column => [
                        'type' => 'DECIMAL',
                        'constraint' => '10,2',
                        'null' => FALSE,
                        'default' => $default,
                    ],
                ]);
            }
        }
    }

    public function down()
    {
        $forge = $this->_lava->dbforge;
        foreach ([
            'sss_employee_monthly_amount', 'sss_employer_monthly_amount',
            'philhealth_employee_monthly_amount', 'philhealth_employer_monthly_amount',
            'pagibig_employee_monthly_amount', 'pagibig_employer_monthly_amount',
        ] as $column) {
            if ($forge->table_exists('system_settings') && $forge->column_exists('system_settings', $column)) {
                $forge->drop_column('system_settings', $column);
            }
        }
    }
}
