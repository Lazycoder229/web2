<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class PayrollDeductionModel extends Model
{
    protected $table = 'payroll_deductions';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'payroll_record_id', 'deduction_type_id', 'amount', 'notes'];
    protected $guarded = [];
    protected $timestamps = false;
}
