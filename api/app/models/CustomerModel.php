<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class CustomerModel extends Model
{
    protected $table = 'customers';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'email', 'password', 'name', 'contact_number', 'loyalty_points_balance', 'is_guest', 'created_at', 'updated_at'];
    protected $guarded = [];
    protected $timestamps = true;
}
