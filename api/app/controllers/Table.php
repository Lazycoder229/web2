<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api')]
class Table extends Controller
{
    private $api;
    private $tables;
    private $orders;
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->tables = $this->call->model('RestaurantTableModel');
        $this->orders = $this->call->model('OrderModel');
    }
    #[Get('/tables')] public function index()
    {
        $this->release_stale_tables();
        $rows = $this->tables->query()->order_by('table_number', 'ASC')->get_all();
        $this->success(['tables' => array_map([$this, 'format'], $rows ?: [])]);
    }
    #[Post('/tables/{id:uuid}/occupy')] public function occupy($id)
    {
        // Called when a signed-in customer scans the table QR, so the table shows as occupied right away.
        $claims = $this->api->validate_jwt($this->api->get_bearer_token() ?? '');
        if (!$claims || ($claims['role'] ?? '') !== 'customer') {
            $this->api->respond_error('Sign in to your customer account to scan a table.', 401);
        }
        $table = $this->tables->find($id);
        if (!$table) {
            $this->api->respond_error('Table not found.', 404);
        }
        if (($table['status'] ?? '') === 'available') {
            $this->tables->query()->where('id', $id)->update(['status' => 'occupied', 'occupied_at' => date('Y-m-d H:i:s')]);
        }
        $this->success(['table' => $this->format($this->tables->find($id))]);
    }
    #[Post('/tables', middleware: ['admin_auth'])] public function create()
    {
        $input = $this->api->body();
        $id = $this->uuid();
        $this->tables->insert(['id' => $id, 'table_number' => trim((string)($input['tableNumber'] ?? '')), 'capacity' => (int)($input['capacity'] ?? 1), 'status' => $input['status'] ?? 'available', 'qr_code_url' => $input['qrCodeUrl'] ?? null]);
        $this->success(['table' => $this->format($this->tables->find($id))], 201);
    }
    #[Put('/tables/{id:uuid}', middleware: ['admin_auth'])] public function update($id)
    {
        if (!$this->tables->find($id)) {
            $this->api->respond_error('Table not found.', 404);
        } $input = $this->api->body();
        $changes = [];
        foreach (['tableNumber' => 'table_number', 'capacity' => 'capacity', 'status' => 'status', 'qrCodeUrl' => 'qr_code_url'] as $from => $to) {
            if (array_key_exists($from, $input)) {
                $changes[$to] = $input[$from];
            }
        } if (array_key_exists('status', $changes)) {
            // A manual status change by staff is never auto-released.
            $changes['occupied_at'] = null;
        } $this->tables->query()->where('id', $id)->update($changes);
        $this->success(['table' => $this->format($this->tables->find($id))]);
    }
    #[Delete('/tables/{id:uuid}', middleware: ['admin_auth'])] public function delete($id)
    {
        $this->tables->query()->where('id', $id)->delete();
        $this->success(['id' => $id]);
    }
    // A scanned table with no order is freed after this many seconds.
    private const SCAN_HOLD_SECONDS = 1800;

    private function release_stale_tables()
    {
        $occupied = $this->tables->query()->where('status', 'occupied')->get_all() ?: [];
        $cutoff = time() - self::SCAN_HOLD_SECONDS;
        foreach ($occupied as $table) {
            $since = strtotime((string) ($table['occupied_at'] ?? ''));
            if (!$since || $since > $cutoff) {
                continue;
            }
            $orders = $this->orders->query()->where('table_id', $table['id'])->get_all() ?: [];
            $hasActive = false;
            foreach ($orders as $order) {
                if (!in_array($order['status'] ?? '', ['completed', 'cancelled'], true)) {
                    $hasActive = true;
                    break;
                }
            }
            if (!$hasActive) {
                $this->tables->query()->where('id', $table['id'])->update(['status' => 'available', 'occupied_at' => null]);
            }
        }
    }
    private function format($r)
    {
        return ['id' => (string)$r['id'], 'tableNumber' => $r['table_number'], 'capacity' => (int)$r['capacity'], 'qrCodeUrl' => $r['qr_code_url'], 'status' => $r['status']];
    }
    private function uuid()
    {
        $h = bin2hex(random_bytes(16));
        return substr($h, 0, 8).'-'.substr($h, 8, 4).'-'.substr($h, 12, 4).'-'.substr($h, 16, 4).'-'.substr($h, 20);
    }
    private function success($data, $status = 200)
    {
        $this->api->respond(['success' => true,'data' => $data], $status);
    }
}
