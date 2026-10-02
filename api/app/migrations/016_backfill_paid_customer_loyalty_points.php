<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Backfill_paid_customer_loyalty_points
{
    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->database();
    }

    public function up()
    {
        $orders = $this->_lava->call->model('OrderModel');
        $customers = $this->_lava->call->model('CustomerModel');
        $loyalty = $this->_lava->call->model('LoyaltyTransactionModel');
        $settings = $this->_lava->call->model('LoyaltySettingModel');
        $paidOrders = $orders->query()->where('payment_status', 'paid')->get_all() ?: [];

        foreach ($paidOrders as $order) {
            $loyalty->award_for_paid_order($order, $customers, $settings);
        }
    }

    public function down()
    {
        // Keep awarded points when rolling application code back.
    }
}
