<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api')]
class Payment extends Controller
{
    private $api;
    private $payments;
    private $orders;
    private $users;

    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->payments = $this->call->model('PaymentModel');
        $this->orders = $this->call->model('OrderModel');
        $this->users = $this->call->model('UserModel');
    }

    #[Post('/payments')]
    public function create()
    {
        $input = $this->api->body();
        $order = $this->orders->find($input['orderId'] ?? '');
        $amount = (float) ($input['amountPaid'] ?? 0);
        $method = $input['paymentMethod'] ?? 'cash';
        if (!$order) {
            $this->api->respond_error('Order not found.', 404);
        }
        if ($amount < (float) $order['total']) {
            $this->api->respond_error('Payment must cover the order total.', 422);
        }
        if (!in_array($method, ['cash', 'gcash', 'maya', 'card', 'other'], true)) {
            $this->api->respond_error('Choose a valid payment method.', 422);
        }
        $staff_id = $input['processedByStaffId'] ?? null;
        if (!$staff_id) {
            $staff = $this->users->query()->select('id')->where('is_active', 1)->get_all();
            $staff_id = $staff[0]['id'] ?? null;
        }
        if (!$staff_id) {
            $this->api->respond_error('A staff account is required to record payment.', 422);
        }

        $receipt = 'RCT-' . date('ymdHis') . '-' . strtoupper(substr(str_replace('-', '', $this->uuid()), 0, 4));
        $created = $this->payments->insert([
            'id' => $this->uuid(),
            'order_id' => $order['id'],
            'receipt_number' => $receipt,
            'amount_paid' => number_format($amount, 2, '.', ''),
            'payment_method' => $method,
            'reference_number' => $input['referenceNumber'] ?? null,
            'processed_by_staff_id' => $staff_id,
        ]);
        if ($created === false) {
            $this->api->respond_error('Could not record payment.', 500);
        }

        $this->orders->query()->where('id', $order['id'])->update([
            'payment_status' => 'paid',
            'payment_method' => $method,
            'payment_reference' => $input['referenceNumber'] ?? null,
            'status' => 'completed',
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
        $this->success([
            'receiptNumber' => $receipt,
            'change' => round($amount - (float) $order['total'], 2),
        ], 201);
    }

    private function uuid()
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        $hex = bin2hex($bytes);
        return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
    }

    private function success($data, $status = 200)
    {
        $this->api->respond(['success' => true, 'data' => $data], $status);
    }
}
