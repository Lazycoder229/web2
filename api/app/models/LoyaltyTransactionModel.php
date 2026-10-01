<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class LoyaltyTransactionModel extends Model
{
    protected $table = 'loyalty_transactions';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'customer_id', 'order_id', 'type', 'points', 'balance_after', 'created_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
