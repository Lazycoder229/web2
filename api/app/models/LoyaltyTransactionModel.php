<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class LoyaltyTransactionModel extends Model
{
    protected $table = 'loyalty_transactions';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'customer_id', 'order_id', 'reward_id', 'reward_name', 'type', 'points', 'balance_after', 'created_at'];
    protected $guarded = [];
    protected $timestamps = false;

    public function award_for_paid_order($order, $customers, $settings)
    {
        if (!$order || ($order['payment_status'] ?? '') !== 'paid' || empty($order['customer_id'])) {
            return 0;
        }

        $existing = $this->query()
            ->where('order_id', $order['id'])
            ->where('type', 'earn')
            ->get_all();
        if ($existing) return 0;

        $customer = $customers->find($order['customer_id']);
        if (!$customer || !empty($customer['is_guest'])) return 0;

        $settingRows = $settings->query()->get_all() ?: [];
        $pointsPerPeso = isset($settingRows[0]['points_per_peso'])
            ? (float) $settingRows[0]['points_per_peso']
            : 1.0;
        $earnedPoints = (int) floor(max(0, (float) ($order['total'] ?? 0)) * max(0, $pointsPerPeso));
        if ($earnedPoints < 1) return 0;

        $newBalance = (int) ($customer['loyalty_points_balance'] ?? 0) + $earnedPoints;
        $created = $this->insert([
            'id' => $this->uuid(),
            'customer_id' => $customer['id'],
            'order_id' => $order['id'],
            'type' => 'earn',
            'points' => $earnedPoints,
            'balance_after' => $newBalance,
        ]);
        if ($created === false) return 0;

        $customers->query()->where('id', $customer['id'])->update([
            'loyalty_points_balance' => $newBalance,
        ]);
        return $earnedPoints;
    }

    private function uuid()
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        $hex = bin2hex($bytes);
        return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
    }
}
