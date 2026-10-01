<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class OrderItemModel extends Model
{
    protected $table = 'order_items';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'order_id', 'menu_item_id', 'quantity', 'unit_price', 'subtotal', 'notes'];
    protected $guarded = [];
    protected $timestamps = false;
}
