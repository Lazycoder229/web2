<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class LoyaltyRewardModel extends Model
{
    protected $table = 'loyalty_rewards';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'name', 'points_cost', 'description', 'is_active'];
    protected $guarded = [];
    protected $timestamps = false;
}
