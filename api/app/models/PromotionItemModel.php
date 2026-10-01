<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class PromotionItemModel extends Model
{
    protected $table = 'promotion_items';
    protected $primary_key = 'promotion_id';
    protected $fillable = ['promotion_id', 'menu_item_id'];
    protected $guarded = [];
    protected $timestamps = false;
}
