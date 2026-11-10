<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class ExpenseCategoryModel extends Model
{
    protected $table = 'expense_categories';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'name', 'is_active', 'created_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
