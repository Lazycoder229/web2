<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class CategoryModel extends Model {
    protected $table              = 'categories';
    protected $primary_key        = 'id';
    protected $fillable           = ['id', 'name', 'sort_order', 'is_active'];
    protected $guarded            = [];
    // categories only defines created_at; let the database default populate it.
    protected $timestamps         = false;
    protected $created_at_column  = 'created_at';
    protected $updated_at_column  = 'updated_at';

    
}