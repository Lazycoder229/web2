<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api')]
class Order extends Controller
{
    private $api;
    private $orders;
    private $items;
    private $menu;
    private $tables;
    private $customers;
    private $voids;
    private $settings;
    private $loyalty;
    private $loyaltySettings;

    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->orders = $this->call->model('OrderModel');
        $this->items = $this->call->model('OrderItemModel');
        $this->menu = $this->call->model('MenuModel');
        $this->tables = $this->call->model('RestaurantTableModel');
        $this->customers = $this->call->model('CustomerModel');
        $this->voids = $this->call->model('OrderVoidModel');
        $this->settings = $this->call->model('SystemSettingModel');
        $this->loyalty = $this->call->model('LoyaltyTransactionModel');
        $this->loyaltySettings = $this->call->model('LoyaltySettingModel');
    }

    #[Get('/orders', middleware: ['admin_auth'])]
    public function index()
    {
        $rows = $this->orders->query()
            ->select('id,order_number,table_id,customer_id,order_type,status,subtotal,discount,tax,total,payment_status,payment_method,payment_reference,created_by_staff_id,created_at,updated_at')
            ->where_null('admin_hidden_at')
            ->order_by('created_at', 'DESC')
            ->get_all();

        $orders = array_map([$this, 'format_order'], $rows ?: []);
        $this->success(['orders' => $orders]);
    }

    #[Get('/orders/{id:uuid}', middleware: ['admin_auth'])]
    public function show($id)
    {
        $order = $this->orders->find($id);
        if (!$order) {
            $this->api->respond_error('Order not found.', 404);
        }
        $this->success(['order' => $this->format_order($order)]);
    }

    #[Post('/orders')]
    public function create()
    {
        $input = $this->api->body();
        $requestedOrderType = $input['orderType'] ?? 'counter';
        $orderType = in_array($requestedOrderType, ['qr', 'counter'], true) ? $requestedOrderType : 'counter';
        $customerId = $input['customerId'] ?? null;
        $guestIpHash = null;
        $paymentMethod = $input['paymentMethod'] ?? null;
        $paymentReference = isset($input['paymentReference']) ? trim((string) $input['paymentReference']) : null;
        if ($orderType === 'qr') {
            if ($paymentMethod !== null && !in_array($paymentMethod, ['gcash', 'maya'], true)) {
                $this->api->respond_error('Choose GCash, Maya, or pay at the counter.', 422);
            }
            if ($paymentMethod !== null) {
                if ($paymentReference === null || $paymentReference === '') {
                    $this->api->respond_error('Enter the transaction reference from your wallet payment.', 422);
                }
                if (strlen($paymentReference) > 100) {
                    $this->api->respond_error('Transaction reference must be 100 characters or fewer.', 422);
                }
                $settingsRows = $this->settings->query()->get_all() ?: [];
                $qrColumn = $paymentMethod . '_qr_image';
                if (empty($settingsRows[0][$qrColumn])) {
                    $this->api->respond_error(strtoupper($paymentMethod) . ' payment is not set up yet. Please pay at the counter.', 422);
                }
            }
            $bearerToken = $this->api->get_bearer_token();
            $claims = $this->api->validate_jwt($bearerToken ?? '');
            // QR orders need a customer account; guest ordering is no longer supported.
            if (!$bearerToken || !$claims || ($claims['role'] ?? '') !== 'customer') {
                $this->api->respond_error('Sign in to your customer account to place a QR order.', 401);
            }
            $customerId = $claims['sub'];
        }
        $items = $input['items'] ?? [];
        if (!is_array($items) || !$items) {
            $this->api->respond_error('Order must contain at least one item.', 422);
        }

        $normalized = [];
        $subtotal = 0;
        foreach ($items as $item) {
            $menu_item = $this->menu->find($item['menuItemId'] ?? '');
            $quantity = (int) ($item['quantity'] ?? 0);
            if (!$menu_item || $quantity < 1) {
                $this->api->respond_error('Each order item must reference a valid menu item and quantity.', 422);
            }
            $price = (float) $menu_item['price'];
            $line_total = round($price * $quantity, 2);
            $subtotal += $line_total;
            $normalized[] = ['menu_item_id' => $menu_item['id'], 'quantity' => $quantity, 'unit_price' => number_format($price, 2, '.', ''), 'subtotal' => number_format($line_total, 2, '.', ''), 'notes' => $item['notes'] ?? null];
        }

        $id = $this->uuid();
        $order_number = 'ORD-' . date('ymdHis') . '-' . strtoupper(substr(str_replace('-', '', $id), 0, 4));
        $created = $this->orders->insert([
            'id' => $id,
            'order_number' => $order_number,
            'table_id' => $input['tableId'] ?? null,
            'customer_id' => $customerId,
            'guest_ip_hash' => $guestIpHash,
            'order_type' => $orderType,
            'status' => 'pending',
            'subtotal' => number_format($subtotal, 2, '.', ''),
            'discount' => '0.00',
            'tax' => '0.00',
            'total' => number_format($subtotal, 2, '.', ''),
            'payment_status' => $paymentMethod ? 'awaiting_verification' : 'not_required',
            'payment_method' => $paymentMethod,
            'payment_reference' => $paymentReference,
            'created_by_staff_id' => $input['createdByStaffId'] ?? null,
        ]);
        if ($created === false) {
            $this->api->respond_error('Could not create order.', 500);
        }
        foreach ($normalized as $item) {
            $this->items->insert(array_merge(['id' => $this->uuid(), 'order_id' => $id], $item));
        }
        // Same for QR and cashier orders: the table is taken as soon as an order is placed.
        $this->occupy_table($input['tableId'] ?? null);
        $response = ['orderNumber' => $order_number, 'order' => $this->format_order($this->orders->find($id))];
        $this->success($response, 201);
    }

    #[Put('/orders/{id:uuid}', middleware: ['admin_auth'])]
    public function update($id)
    {
        $order = $this->orders->find($id);
        if (!$order) {
            $this->api->respond_error('Order not found.', 404);
        }
        $input = $this->api->body();
        if (isset($input['status'])) {
            $allowed = ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
            if (!in_array($input['status'], $allowed, true)) {
                $this->api->respond_error('Choose a valid order status.', 422);
            }
            $this->orders->query()->where('id', $id)->update(['status' => $input['status'], 'updated_at' => date('Y-m-d H:i:s')]);
            $this->release_table_if_idle($order['table_id'] ?? null);
        }
        if (isset($input['items']) && is_array($input['items']) && $input['items']) {
            $this->items->query()->where('order_id', $id)->delete();
            $subtotal = 0;
            foreach ($input['items'] as $item) {
                $menu_item = $this->menu->find($item['menuItemId'] ?? '');
                $quantity = (int) ($item['quantity'] ?? 0);
                if (!$menu_item || $quantity < 1) {
                    $this->api->respond_error('Each order item must reference a valid menu item and quantity.', 422);
                }
                $price = (float) $menu_item['price'];
                $line_total = round($price * $quantity, 2);
                $subtotal += $line_total;
                $this->items->insert([
                    'id' => $this->uuid(),
                    'order_id' => $id,
                    'menu_item_id' => $menu_item['id'],
                    'quantity' => $quantity,
                    'unit_price' => number_format($price, 2, '.', ''),
                    'subtotal' => number_format($line_total, 2, '.', ''),
                    'notes' => $item['notes'] ?? null,
                ]);
            }
            $this->orders->query()->where('id', $id)->update([
                'subtotal' => number_format($subtotal, 2, '.', ''),
                'total' => number_format($subtotal, 2, '.', ''),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
        }
        $this->success(['order' => $this->format_order($this->orders->find($id))]);
    }

    #[Post('/orders/{id:uuid}/verify-payment', middleware: ['admin_auth'])]
    public function verify_payment($id)
    {
        $order = $this->orders->find($id);
        if (!$order) {
            $this->api->respond_error('Order not found.', 404);
        }
        $this->orders->query()->where('id', $id)->update([
            'payment_status' => 'paid',
            'status' => $order['status'] === 'pending' ? 'preparing' : $order['status'],
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
        $updatedOrder = $this->orders->find($id);
        $this->loyalty->award_for_paid_order($updatedOrder, $this->customers, $this->loyaltySettings);
        $this->success(['order' => $this->format_order($updatedOrder)]);
    }

    #[Delete('/orders/{id:uuid}', middleware: ['admin_auth'])]
    public function delete($id)
    {
        $claims = $this->api->validate_jwt($this->api->get_bearer_token() ?? '');
        if (!$claims || ($claims['role'] ?? '') !== 'admin') {
            $this->api->respond_error('Admin sign-in is required to hide an order.', 401);
        }

        $matches = $this->orders->query()->where('id', $id)->get_all();
        $order = $matches[0] ?? null;
        if (!$order) {
            $this->api->respond_error('Order not found.', 404);
        }

        if (($order['status'] ?? '') !== 'completed') {
            $this->api->respond_error('Only completed orders can be removed from the admin list.', 422);
        }

        $this->orders->query()->where('id', $id)->update([
            'admin_hidden_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
        $this->success(['id' => $id]);
    }

    #[Put('/orders/{id:uuid}/status', middleware: ['admin_auth'])]
    public function update_status($id)
    {
        $order = $this->orders->find($id);
        if (!$order) {
            $this->api->respond_error('Order not found.', 404);
        }

        $input = $this->api->body();
        $status = $input['status'] ?? '';
        $allowed = ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
        if (!in_array($status, $allowed, true)) {
            $this->api->respond_error('Choose a valid order status.', 422);
        }

        if ($status === 'cancelled' && $order['status'] !== 'cancelled') {
            $settingRows = $this->settings->query()->get_all() ?: [];
            $approvalRequired = $settingRows
                && in_array($settingRows[0]['manager_approval_for_voids'] ?? false, [true, 1, '1'], true);
            if ($approvalRequired) {
                $this->api->respond_error('Manager approval is required before this order can be voided.', 403);
            }

            $existingVoid = $this->voids->query()
                ->where('order_id', $id)
                ->where('status', 'approved')
                ->get_all();
            if (!$existingVoid) {
                $staffId = $input['changedByStaffId'] ?? $order['created_by_staff_id'] ?? null;
                $this->voids->insert([
                    'id' => $this->uuid(),
                    'order_id' => $id,
                    'requested_by_staff_id' => $staffId,
                    'approved_by_staff_id' => $staffId,
                    'reason' => $input['cancellationReason'] ?? 'Order cancelled from order management.',
                    'status' => 'approved',
                    'resolved_at' => date('Y-m-d H:i:s'),
                    'resolution_notes' => 'Cancellation recorded from order management.',
                ]);
            }
        }

        $this->orders->query()->where('id', $id)->update([
            'status' => $status,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
        $this->release_table_if_idle($order['table_id'] ?? null);

        $this->success(['order' => $this->format_order($this->orders->find($id))]);
    }

    private function format_order($row)
    {
        $items = $this->items->query()
            ->select('order_items.id,order_items.menu_item_id,menu_items.name,order_items.quantity,order_items.unit_price,order_items.subtotal,order_items.notes')
            ->join('menu_items', 'menu_items.id = order_items.menu_item_id')
            ->where('order_items.order_id', $row['id'])
            ->get_all();

        return [
            'id' => (string) $row['id'],
            'orderNumber' => $row['order_number'],
            'tableId' => $row['table_id'] === null ? null : (string) $row['table_id'],
            'orderType' => $row['order_type'],
            'status' => $row['status'],
            'subtotal' => (float) $row['subtotal'],
            'discount' => (float) $row['discount'],
            'tax' => (float) $row['tax'],
            'total' => (float) $row['total'],
            'paymentStatus' => $row['payment_status'] ?? null,
            'paymentMethod' => $row['payment_method'] ?? null,
            'paymentReference' => $row['payment_reference'] ?? null,
            'createdByStaffId' => ($row['created_by_staff_id'] ?? null) === null ? null : (string) $row['created_by_staff_id'],
            'table' => $this->table_label($row['table_id'] ?? null),
            'source' => $row['order_type'] === 'qr' ? 'QR' : 'Counter',
            'customer' => $this->customer_label($row['customer_id'] ?? null),
            'time' => $row['created_at'] ?? null,
            'createdAt' => $row['created_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
            'items' => array_map(static function ($item) {
                return [
                    'id' => (string) $item['id'],
                    'menuItemId' => (string) $item['menu_item_id'],
                    'name' => $item['name'],
                    'quantity' => (int) $item['quantity'],
                    'price' => (float) $item['unit_price'],
                    'subtotal' => (float) $item['subtotal'],
                    'notes' => $item['notes'],
                ];
            }, $items ?: []),
        ];
    }

    private function table_label($id)
    {
        if (!$id) {
            return 'Counter';
        }
        $table = $this->tables->find($id);
        return $table ? $table['table_number'] : 'Table';
    }

    private function customer_label($id)
    {
        if (!$id) {
            return 'Guest checkout';
        }
        $customer = $this->customers->find($id);
        return $customer ? $customer['name'] : 'Guest checkout';
    }

    private function occupy_table($tableId)
    {
        if (!$tableId) {
            return;
        }
        $table = $this->tables->find($tableId);
        if ($table && ($table['status'] ?? '') === 'available') {
            $this->tables->query()->where('id', $tableId)->update(['status' => 'occupied', 'occupied_at' => date('Y-m-d H:i:s')]);
        }
    }

    private function release_table_if_idle($tableId)
    {
        if (!$tableId) {
            return;
        }
        $table = $this->tables->find($tableId);
        if (!$table || ($table['status'] ?? '') !== 'occupied') {
            return;
        }
        $orders = $this->orders->query()->where('table_id', $tableId)->get_all() ?: [];
        foreach ($orders as $other) {
            if (!in_array($other['status'] ?? '', ['completed', 'cancelled'], true)) {
                return;
            }
        }
        $this->tables->query()->where('id', $tableId)->update(['status' => 'available', 'occupied_at' => null]);
    }

    private function client_ip()
    {
        $remote = $_SERVER['REMOTE_ADDR'] ?? '';
        $trustedProxies = array_filter(array_map('trim', explode(',', (string) (getenv('TRUSTED_PROXY_IPS') ?: '127.0.0.1,::1'))));
        if (in_array($remote, $trustedProxies, true)) {
            $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
            if ($forwarded !== '') {
                $candidate = trim(explode(',', $forwarded)[0]);
                if (filter_var($candidate, FILTER_VALIDATE_IP)) return $candidate;
            }
        }
        return filter_var($remote, FILTER_VALIDATE_IP) ? $remote : '';
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
