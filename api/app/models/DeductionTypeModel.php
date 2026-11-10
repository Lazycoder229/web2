<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class DeductionTypeModel extends Model
{
    protected $table = 'deduction_types';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'name', 'is_mandatory', 'is_active'];
    protected $guarded = [];
    protected $timestamps = false;
}
