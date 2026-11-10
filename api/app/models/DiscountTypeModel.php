<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class DiscountTypeModel extends Model
{
    protected $table = 'discount_types';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'name', 'percentage', 'requires_id_verification', 'is_active'];
    protected $guarded = [];
    protected $timestamps = false;
}
