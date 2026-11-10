<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class MigrationModel extends Model
{
    protected $table = 'migrations';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'migration', 'applied_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
