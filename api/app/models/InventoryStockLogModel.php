<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class InventoryStockLogModel extends Model
{
    protected $table = 'inventory_stock_logs';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'item_type', 'inventory_item_id', 'menu_item_id', 'type', 'quantity_change', 'quantity_after', 'note', 'performed_by_staff_id', 'created_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
