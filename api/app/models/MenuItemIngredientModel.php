<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class MenuItemIngredientModel extends Model
{
    protected $table = 'menu_item_ingredients';
    protected $primary_key = 'menu_item_id';
    protected $fillable = ['menu_item_id', 'inventory_item_id', 'quantity_used'];
    protected $guarded = [];
    protected $timestamps = false;
}
