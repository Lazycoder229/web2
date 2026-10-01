<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class SystemSettingModel extends Model
{
    protected $table = 'system_settings';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'restaurant_name', 'branch_name', 'contact_number', 'email', 'address', 'tin_number', 'bir_min', 'currency_symbol', 'currency_code', 'timezone', 'vat_enabled', 'vat_rate', 'vat_inclusive', 'service_charge_enabled', 'service_charge_rate', 'senior_pwd_discount_enabled', 'order_number_prefix', 'auto_accept_qr_orders', 'require_table_selection', 'manager_approval_for_voids', 'low_stock_threshold_alert', 'receipt_header', 'receipt_footer', 'print_receipt_auto', 'print_kot_auto', 'show_wifi_on_receipt', 'wifi_ssid', 'wifi_password', 'gcash_qr_image', 'maya_qr_image', 'opening_time', 'closing_time', 'cash_drawer_opening_balance_required', 'updated_at'];
    protected $guarded = [];
    protected $timestamps = false;
}
