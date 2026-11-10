<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class InventoryItemModel extends Model
{
    protected $table = 'inventory_items';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'category_id', 'name', 'unit', 'stock_quantity', 'reorder_threshold', 'unit_cost', 'supplier', 'is_active', 'created_at', 'updated_at'];
    protected $guarded = [];
    protected $timestamps = true;
}
