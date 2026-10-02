<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class OrderModel extends Model
{
    protected $table = 'orders';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'order_number', 'table_id', 'customer_id', 'order_type', 'status', 'subtotal', 'discount', 'tax', 'total', 'payment_status', 'payment_method', 'payment_reference', 'guest_ip_hash', 'admin_hidden_at', 'created_by_staff_id', 'created_at', 'updated_at'];
    protected $guarded = [];
    protected $timestamps = true;
}
