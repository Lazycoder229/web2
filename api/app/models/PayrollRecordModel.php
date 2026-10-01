<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class PayrollRecordModel extends Model
{
    protected $table = 'payroll_records';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'employee_id', 'payroll_period_id', 'gross_pay', 'total_deductions', 'net_pay', 'processed_by_staff_id', 'processed_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
