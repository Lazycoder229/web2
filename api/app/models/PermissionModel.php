<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class PermissionModel extends Model
{
    protected $table = 'permissions';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'code', 'module', 'description'];
    protected $guarded = [];
    protected $timestamps = false;
}
