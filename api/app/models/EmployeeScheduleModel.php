<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class EmployeeScheduleModel extends Model
{
    protected $table = 'employee_schedules';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'user_id', 'shift_date', 'start_time', 'end_time', 'created_by_staff_id', 'created_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
