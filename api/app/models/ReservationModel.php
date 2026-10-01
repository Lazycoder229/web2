<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class ReservationModel extends Model
{
    protected $table = 'reservations';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'customer_id', 'customer_name', 'contact_number', 'email', 'table_id', 'reservation_date', 'reservation_time', 'number_of_guests', 'status', 'notes', 'created_by_staff_id', 'created_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
