<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class OrderDiscountModel extends Model
{
    protected $table = 'order_discounts';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'order_id', 'discount_type_id', 'id_number', 'holder_name', 'discount_amount', 'applied_by_staff_id', 'created_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
