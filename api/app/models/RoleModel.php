<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class RoleModel extends Model
{
    protected $table = 'roles';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'name', 'description', 'is_system', 'created_at', 'updated_at'];
    protected $guarded = [];
    protected $timestamps = true;
}
