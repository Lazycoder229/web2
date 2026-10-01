<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class AuditLogModel extends Model
{
    protected $table = 'audit_logs';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'user_id', 'action', 'entity_type', 'entity_id', 'details', 'ip_address', 'created_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
