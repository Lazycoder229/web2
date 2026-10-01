<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class ExpenseModel extends Model
{
    protected $table = 'expenses';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'category_id', 'description', 'amount', 'expense_date', 'receipt_reference', 'notes', 'recorded_by_staff_id', 'created_at', 'updated_at'];
    protected $guarded = [];
    protected $timestamps = true;
}
