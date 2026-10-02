<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class BranchModel extends Model
{
    protected $table = 'branches';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'name', 'code', 'type', 'address', 'contact_number', 'email', 'is_main', 'is_active', 'created_at', 'updated_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
