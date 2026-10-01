<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class PaymentModel extends Model
{
    protected $table = 'payments';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'order_id', 'receipt_number', 'amount_paid', 'payment_method', 'reference_number', 'processed_by_staff_id', 'paid_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
