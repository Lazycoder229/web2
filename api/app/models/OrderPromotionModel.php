<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class OrderPromotionModel extends Model
{
    protected $table = 'order_promotions';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'order_id', 'promotion_id', 'discount_amount', 'applied_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
