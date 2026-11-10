<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class PayrollPeriodModel extends Model
{
    protected $table = 'payroll_periods';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'period_start', 'period_end', 'status', 'created_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
