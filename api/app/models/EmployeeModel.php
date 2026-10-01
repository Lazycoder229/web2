<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class EmployeeModel extends Model
{
    protected $table = 'employees';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'user_id', 'employee_number', 'position', 'department', 'rfid_card_uid', 'date_hired', 'date_terminated', 'employment_status', 'basic_salary', 'salary_type'];
    protected $guarded = [];
    protected $timestamps = false;
}
