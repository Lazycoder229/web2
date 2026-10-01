<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class AttendanceLogModel extends Model
{
    protected $table = 'attendance_logs';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'employee_id', 'log_date', 'clock_in', 'clock_out', 'total_hours', 'late_minutes', 'overtime_hours', 'status', 'method', 'rfid_card_uid_used', 'notes', 'created_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
