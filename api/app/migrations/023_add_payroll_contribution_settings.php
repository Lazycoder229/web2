<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Add_payroll_contribution_settings
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

        $settings = [
            'sss_employee_rate' => ['type' => 'DECIMAL', 'constraint' => '5,2', 'null' => FALSE, 'default' => 5.00],
            'sss_employer_rate' => ['type' => 'DECIMAL', 'constraint' => '5,2', 'null' => FALSE, 'default' => 10.00],
            'sss_monthly_floor' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => FALSE, 'default' => 5000.00],
            'sss_monthly_cap' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => FALSE, 'default' => 35000.00],
            'philhealth_employee_rate' => ['type' => 'DECIMAL', 'constraint' => '5,2', 'null' => FALSE, 'default' => 2.50],
            'philhealth_employer_rate' => ['type' => 'DECIMAL', 'constraint' => '5,2', 'null' => FALSE, 'default' => 2.50],
            'philhealth_monthly_floor' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => FALSE, 'default' => 10000.00],
            'philhealth_monthly_cap' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => FALSE, 'default' => 100000.00],
            'pagibig_employee_rate' => ['type' => 'DECIMAL', 'constraint' => '5,2', 'null' => FALSE, 'default' => 2.00],
            'pagibig_employee_low_rate' => ['type' => 'DECIMAL', 'constraint' => '5,2', 'null' => FALSE, 'default' => 1.00],
            'pagibig_employee_low_threshold' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => FALSE, 'default' => 1500.00],
            'pagibig_employer_rate' => ['type' => 'DECIMAL', 'constraint' => '5,2', 'null' => FALSE, 'default' => 2.00],
            'pagibig_monthly_cap' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => FALSE, 'default' => 10000.00],
        ];
        if ($forge->table_exists('system_settings')) {
            foreach ($settings as $column => $definition) {
                if (!$forge->column_exists('system_settings', $column)) {
                    $forge->add_column('system_settings', [$column => $definition]);
                }
            }
        }

        $payroll = [
            'sss_employee_deduction', 'sss_employer_contribution',
            'philhealth_employee_deduction', 'philhealth_employer_contribution',
            'pagibig_employee_deduction', 'pagibig_employer_contribution',
        ];
        if ($forge->table_exists('payroll_records')) {
            foreach ($payroll as $column) {
                if (!$forge->column_exists('payroll_records', $column)) {
                    $forge->add_column('payroll_records', [
                        $column => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => FALSE, 'default' => 0],
                    ]);
                }
            }
        }
    }

    public function down()
    {
        $forge = $this->_lava->dbforge;
        foreach ([
            'sss_employee_rate', 'sss_employer_rate', 'sss_monthly_floor', 'sss_monthly_cap',
            'philhealth_employee_rate', 'philhealth_employer_rate', 'philhealth_monthly_floor', 'philhealth_monthly_cap',
            'pagibig_employee_rate', 'pagibig_employee_low_rate', 'pagibig_employee_low_threshold', 'pagibig_employer_rate', 'pagibig_monthly_cap',
        ] as $column) {
            if ($forge->table_exists('system_settings') && $forge->column_exists('system_settings', $column)) {
                $forge->drop_column('system_settings', $column);
            }
        }
        foreach ([
            'sss_employee_deduction', 'sss_employer_contribution',
            'philhealth_employee_deduction', 'philhealth_employer_contribution',
            'pagibig_employee_deduction', 'pagibig_employer_contribution',
        ] as $column) {
            if ($forge->table_exists('payroll_records') && $forge->column_exists('payroll_records', $column)) {
                $forge->drop_column('payroll_records', $column);
            }
        }
    }
}
