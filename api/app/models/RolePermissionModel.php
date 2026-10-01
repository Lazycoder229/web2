<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class RolePermissionModel extends Model
{
    protected $table = 'role_permissions';
    protected $primary_key = 'role_id';
    protected $fillable = ['role_id', 'permission_id'];
    protected $guarded = [];
    protected $timestamps = false;
}
