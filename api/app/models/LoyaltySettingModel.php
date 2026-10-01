<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class LoyaltySettingModel extends Model
{
    protected $table = 'loyalty_settings';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'points_per_peso', 'peso_value_per_point', 'updated_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
