<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class MenuModel extends Model {
    protected $table              = 'menu_items';
    protected $primary_key        = 'id';
    protected $fillable           = ['id', 'category_id', 'name', 'description', 'price', 'image_url', 'is_available', 'stock_quantity'];
    protected $guarded            = []; // ← EMPTY — huwag i-guard ang id, kailangan natin itong i-insert manually
    protected $timestamps         = true;
    protected $created_at_column  = 'created_at';
    protected $updated_at_column  = 'updated_at';

}