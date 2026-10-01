<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class InventoryCategoryModel extends Model
{
    protected $table = 'inventory_categories';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'name', 'created_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
