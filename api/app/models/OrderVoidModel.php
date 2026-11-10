<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class OrderVoidModel extends Model
{
    protected $table = 'order_voids';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'order_id', 'requested_by_staff_id', 'approved_by_staff_id', 'reason', 'status', 'requested_at', 'resolved_at', 'resolution_notes'];
    protected $guarded = [];
    protected $timestamps = false;
}
