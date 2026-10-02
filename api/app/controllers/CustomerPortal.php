<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api')]
class CustomerPortal extends Controller
{
    private $api;
    private $customers;
    private $orders;
    private $reservations;
    private $loyalty;
    private $loyaltyRewards;
    private $items;
    private $tables;

    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->customers = $this->call->model('CustomerModel');
        $this->orders = $this->call->model('OrderModel');
        $this->reservations = $this->call->model('ReservationModel');
        $this->loyalty = $this->call->model('LoyaltyTransactionModel');
        $this->loyaltyRewards = $this->call->model('LoyaltyRewardModel');
        $this->items = $this->call->model('OrderItemModel');
        $this->tables = $this->call->model('RestaurantTableModel');
    }

    #[Post('/customers/register')]
    public function register()
    {
        $input = $this->api->body();
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $password = (string) ($input['password'] ?? '');
        $name = trim((string) ($input['name'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8 || $name === '') {
            $this->api->respond_error('Enter a name, valid email, and password with at least 8 characters.', 422);
        }
        if ($this->customers->query()->where('email', $email)->get_all()) {
            $this->api->respond_error('An account with this email already exists.', 409);
        }

        $id = $this->uuid();
        $this->customers->insert([
            'id' => $id,
            'email' => $email,
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'name' => $name,
            'contact_number' => trim((string) ($input['contactNumber'] ?? '')) ?: null,
            'loyalty_points_balance' => 0,
            'is_guest' => 0,
        ]);
        $tokens = $this->customer_tokens($id);
        $this->success([
            'customer' => $this->format_customer($this->customers->find($id)),
            'accessToken' => $tokens['access_token'],
            'refreshToken' => $tokens['refresh_token'],
            'expiresIn' => $tokens['expires_in'],
        ], 201);
    }

    #[Post('/customers/login')]
    public function login()
    {
        $input = $this->api->body();
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $rows = $this->customers->query()->where('email', $email)->get_all();
        $customer = $rows[0] ?? null;
        if (!$customer || !empty($customer['is_guest']) || !password_verify((string) ($input['password'] ?? ''), (string) ($customer['password'] ?? ''))) {
            $this->api->respond_error('Email or password is incorrect.', 401);
        }
        $tokens = $this->customer_tokens($customer['id']);
        $this->success([
            'customer' => $this->format_customer($customer),
            'accessToken' => $tokens['access_token'],
            'refreshToken' => $tokens['refresh_token'],
            'expiresIn' => $tokens['expires_in'],
        ]);
    }

    #[Post('/customers/refresh')]
    public function refresh()
    {
        $input = $this->api->body();
        $refreshToken = (string) ($input['refreshToken'] ?? '');
        $claims = $this->api->validate_jwt($refreshToken);
        if (!$claims || ($claims['type'] ?? '') !== 'refresh' || ($claims['role'] ?? '') !== 'customer') {
            $this->api->respond_error('Customer refresh token is invalid or expired.', 401);
        }

        $customer = $this->customers->find($claims['sub']);
        if (!$customer || !empty($customer['is_guest'])) {
            $this->api->respond_error('Customer account was not found. Sign in again.', 401);
        }

        $tokens = $this->api->refresh_access_token($refreshToken);
        $this->success([
            'accessToken' => $tokens['access_token'],
            'refreshToken' => $tokens['refresh_token'],
            'expiresIn' => $tokens['expires_in'],
        ]);
    }

    #[Post('/customers/logout')]
    public function logout()
    {
        $input = $this->api->body();
        $refreshToken = (string) ($input['refreshToken'] ?? '');
        $claims = $this->api->validate_jwt($refreshToken);
        if ($claims && ($claims['type'] ?? '') === 'refresh' && ($claims['role'] ?? '') === 'customer') {
            $this->api->revoke_refresh_token($refreshToken);
        }
        $this->success(['loggedOut' => true]);
    }

    #[Get('/customers/me', middleware: ['customer_auth'])]
    public function me()
    {
        $customer = $this->authenticated_customer();
        $this->success(['customer' => $this->format_customer($customer)]);
    }

    #[Put('/customers/me', middleware: ['customer_auth'])]
    public function update()
    {
        $customer = $this->authenticated_customer();
        $input = $this->api->body();
        $data = [];
        if (isset($input['name']) && trim((string) $input['name']) !== '') $data['name'] = trim((string) $input['name']);
        if (array_key_exists('contactNumber', $input)) $data['contact_number'] = trim((string) $input['contactNumber']) ?: null;
        if (isset($input['email'])) {
            $email = strtolower(trim((string) $input['email']));
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $this->api->respond_error('Enter a valid email address.', 422);
            $matches = $this->customers->query()->where('email', $email)->get_all() ?: [];
            if ($matches && $matches[0]['id'] !== $customer['id']) $this->api->respond_error('An account with this email already exists.', 409);
            $data['email'] = $email;
        }
        if ($data) $this->customers->query()->where('id', $customer['id'])->update($data);
        $this->success(['customer' => $this->format_customer($this->customers->find($customer['id']))]);
    }

    #[Get('/customers/me/dashboard', middleware: ['customer_auth'])]
    public function dashboard()
    {
        $customer = $this->authenticated_customer();
        $orders = $this->orders->query()->where('customer_id', $customer['id'])->get_all() ?: [];
        $reservations = $this->reservations->query()->where('customer_id', $customer['id'])->get_all() ?: [];
        $upcoming = array_filter($reservations, static function ($reservation) {
            return in_array($reservation['status'] ?? '', ['pending', 'confirmed'], true);
        });
        $this->success(['orders' => count($orders), 'reservations' => count($upcoming), 'points' => (int) ($customer['loyalty_points_balance'] ?? 0)]);
    }

    #[Get('/customers/me/orders', middleware: ['customer_auth'])]
    public function orders()
    {
        $customer = $this->authenticated_customer();
        $rows = $this->orders->query()->where('customer_id', $customer['id'])->order_by('created_at', 'DESC')->get_all() ?: [];
        $this->success(['orders' => array_map([$this, 'format_order'], $rows)]);
    }

    #[Get('/customers/me/orders/{id:uuid}', middleware: ['customer_auth'])]
    public function order($id)
    {
        $customer = $this->authenticated_customer();
        $row = $this->orders->query()->where('id', $id)->where('customer_id', $customer['id'])->get_all();
        if (!$row) $this->api->respond_error('Order not found.', 404);
        $this->success(['order' => $this->format_order($row[0])]);
    }

    #[Get('/customers/me/reservations', middleware: ['customer_auth'])]
    public function reservations()
    {
        $customer = $this->authenticated_customer();
        $rows = $this->reservations->query()->where('customer_id', $customer['id'])->order_by('reservation_date', 'DESC')->get_all() ?: [];
        $this->success(['reservations' => array_map([$this, 'format_reservation'], $rows)]);
    }

    #[Post('/customers/me/reservations', middleware: ['customer_auth'])]
    public function create_reservation()
    {
        $customer = $this->authenticated_customer();
        $input = $this->api->body();
        $name = trim((string) ($input['customerName'] ?? $customer['name']));
        $date = trim((string) ($input['reservationDate'] ?? ''));
        $time = trim((string) ($input['reservationTime'] ?? ''));
        $guests = (int) ($input['numberOfGuests'] ?? 0);
        if ($name === '' || !$date || !$time || $guests < 1) {
            $this->api->respond_error('Enter a name, date, time, and a valid guest count.', 422);
        }
        $id = $this->uuid();
        $this->reservations->insert([
            'id' => $id,
            'customer_id' => $customer['id'],
            'customer_name' => $name,
            'contact_number' => $input['contactNumber'] ?? $customer['contact_number'] ?? null,
            'email' => $customer['email'],
            'table_id' => $input['tableId'] ?? null,
            'reservation_date' => $date,
            'reservation_time' => $time,
            'number_of_guests' => $guests,
            'status' => 'pending',
            'notes' => $input['notes'] ?? null,
        ]);
        $this->success(['reservation' => $this->format_reservation($this->reservations->find($id))], 201);
    }

    #[Get('/customers/me/loyalty', middleware: ['customer_auth'])]
    public function loyalty()
    {
        $customer = $this->authenticated_customer();
        $rewards = $this->loyaltyRewards->query()->where('is_active', 1)->get_all() ?: [];
        $this->success([
            'balance' => (int) ($customer['loyalty_points_balance'] ?? 0),
            'transactions' => $this->loyalty->query()->where('customer_id', $customer['id'])->order_by('created_at', 'DESC')->get_all() ?: [],
            'rewards' => array_map(static function ($reward) {
                return [
                    'id' => (string) $reward['id'],
                    'name' => $reward['name'],
                    'description' => $reward['description'] ?? null,
                    'pointsRequired' => (int) $reward['points_cost'],
                ];
            }, $rewards),
        ]);
    }

    #[Post('/customers/me/loyalty/redeem', middleware: ['customer_auth'])]
    public function redeem_loyalty_reward()
    {
        $customer = $this->authenticated_customer();
        $rewardId = trim((string) ($this->api->body()['rewardId'] ?? ''));
        $reward = $rewardId !== '' ? $this->loyaltyRewards->find($rewardId) : null;
        if (!$reward || empty($reward['is_active'])) {
            $this->api->respond_error('This reward is no longer available.', 404);
        }

        $cost = (int) ($reward['points_cost'] ?? 0);
        $balance = (int) ($customer['loyalty_points_balance'] ?? 0);
        if ($cost < 1) $this->api->respond_error('This reward is not configured correctly.', 422);
        if ($balance < $cost) $this->api->respond_error('You do not have enough points for this reward.', 422);

        $newBalance = $balance - $cost;
        $this->customers->query()->where('id', $customer['id'])->update([
            'loyalty_points_balance' => $newBalance,
        ]);
        $transactionId = $this->uuid();
        $created = $this->loyalty->insert([
            'id' => $transactionId,
            'customer_id' => $customer['id'],
            'order_id' => null,
            'reward_id' => $reward['id'],
            'reward_name' => $reward['name'],
            'type' => 'redeem',
            'points' => -$cost,
            'balance_after' => $newBalance,
        ]);
        if ($created === false) {
            $this->customers->query()->where('id', $customer['id'])->update([
                'loyalty_points_balance' => $balance,
            ]);
            $this->api->respond_error('Could not redeem this reward. Please try again.', 500);
        }

        $transaction = $this->loyalty->find($transactionId);
        $this->success([
            'balance' => $newBalance,
            'transaction' => $transaction,
            'reward' => ['id' => (string) $reward['id'], 'name' => $reward['name']],
        ]);
    }

    private function authenticated_customer()
    {
        $token = $this->api->get_bearer_token();
        $claims = $this->api->validate_jwt($token ?? '');
        if (!$claims || ($claims['role'] ?? '') !== 'customer') $this->api->respond_error('Customer sign-in is required.', 401);
        $customer = $this->customers->find($claims['sub']);
        if (!$customer || !empty($customer['is_guest'])) $this->api->respond_error('Customer account not found.', 401);
        return $customer;
    }

    private function customer_tokens($id)
    {
        return $this->api->issue_tokens([
            'id' => (string) $id,
            'role' => 'customer',
            'scopes' => ['customer'],
        ]);
    }

    private function format_customer($row)
    {
        return ['id' => (string) $row['id'], 'name' => $row['name'], 'email' => $row['email'], 'contactNumber' => $row['contact_number'] ?? null, 'loyaltyPointsBalance' => (int) ($row['loyalty_points_balance'] ?? 0)];
    }

    private function format_order($row)
    {
        $items = $this->items->query()
            ->select('order_items.id,order_items.menu_item_id,menu_items.name,order_items.quantity,order_items.unit_price,order_items.subtotal,order_items.notes')
            ->join('menu_items', 'menu_items.id = order_items.menu_item_id')
            ->where('order_items.order_id', $row['id'])
            ->get_all() ?: [];
        $table = !empty($row['table_id']) ? $this->tables->find($row['table_id']) : null;
        return [
            'id' => (string) $row['id'],
            'orderNumber' => $row['order_number'],
            'tableId' => $row['table_id'] === null ? null : (string) $row['table_id'],
            'table' => $table ? 'Table ' . $table['table_number'] : 'Takeout',
            'orderType' => $row['order_type'],
            'status' => $row['status'],
            'subtotal' => (float) $row['subtotal'],
            'discount' => (float) $row['discount'],
            'tax' => (float) $row['tax'],
            'total' => (float) $row['total'],
            'paymentStatus' => $row['payment_status'] ?? null,
            'paymentMethod' => $row['payment_method'] ?? null,
            'createdAt' => $row['created_at'] ?? null,
            'items' => array_map(static function ($item) {
                return ['id' => (string) $item['id'], 'menuItemId' => (string) $item['menu_item_id'], 'name' => $item['name'], 'quantity' => (int) $item['quantity'], 'price' => (float) $item['unit_price'], 'subtotal' => (float) $item['subtotal'], 'notes' => $item['notes']];
            }, $items),
        ];
    }

    private function format_reservation($row)
    {
        $table = !empty($row['table_id']) ? $this->tables->find($row['table_id']) : null;
        return [
            'id' => (string) $row['id'],
            'customerId' => $row['customer_id'] ?? null,
            'customerName' => $row['customer_name'],
            'contactNumber' => $row['contact_number'],
            'email' => $row['email'],
            'tableId' => $row['table_id'],
            'table' => $table ? 'Table ' . $table['table_number'] : null,
            'reservationDate' => $row['reservation_date'],
            'reservationTime' => $row['reservation_time'],
            'numberOfGuests' => (int) $row['number_of_guests'],
            'status' => $row['status'],
            'notes' => $row['notes'],
        ];
    }

    private function uuid()
    {
        $hex = bin2hex(random_bytes(16));
        return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
    }

    private function success($data, $status = 200)
    {
        $this->api->respond(['success' => true, 'data' => $data], $status);
    }
}
