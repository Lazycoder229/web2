<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api')]
class Table extends Controller
{
    private $api;
    private $tables;
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->tables = $this->call->model('RestaurantTableModel');
    }
    #[Get('/tables')] public function index()
    {
        $rows = $this->tables->query()->order_by('table_number', 'ASC')->get_all();
        $this->success(['tables' => array_map([$this, 'format'], $rows ?: [])]);
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
        } $this->tables->query()->where('id', $id)->update($changes);
        $this->success(['table' => $this->format($this->tables->find($id))]);
    }
    #[Delete('/tables/{id:uuid}', middleware: ['admin_auth'])] public function delete($id)
    {
        $this->tables->query()->where('id', $id)->delete();
        $this->success(['id' => $id]);
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
