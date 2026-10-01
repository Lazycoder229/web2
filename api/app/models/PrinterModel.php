<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class PrinterModel extends Model
{
    protected $table = 'printers';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'name', 'location', 'connection_type', 'ip_address', 'is_active'];
    protected $guarded = [];
    protected $timestamps = false;
}
