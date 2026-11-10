<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class PromotionModel extends Model
{
    protected $table = 'promotions';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'name', 'description', 'promo_type', 'discount_value', 'min_spend', 'start_date', 'end_date', 'usage_limit', 'usage_count', 'is_active', 'created_by_staff_id', 'created_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
