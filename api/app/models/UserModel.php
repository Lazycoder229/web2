<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class UserModel extends Model
{
    protected $table = 'users';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'role_id', 'email', 'password', 'name', 'contact_number', 'is_active', 'last_login_at', 'created_at', 'updated_at'];
    protected $guarded = [];
    protected $timestamps = true;
}
