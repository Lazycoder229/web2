<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class OrderStatusHistoryModel extends Model
{
    protected $table = 'order_status_history';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'order_id', 'status', 'changed_by_staff_id', 'changed_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
