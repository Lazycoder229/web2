<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class RestaurantTableModel extends Model
{
    protected $table = 'restaurant_tables';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'table_number', 'capacity', 'qr_code_url', 'status', 'created_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
