<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api', middleware: ['admin_auth'])]
class VoidController extends Controller
{
    private $api;
    private $voids;
    private $orders;
    private $users;
    private $stockRestorer;

    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->voids = $this->call->model('OrderVoidModel');
        $this->orders = $this->call->model('OrderModel');
        $this->users = $this->call->model('UserModel');
        $this->stockRestorer = $this->call->library('OrderStockRestorer');
    }

    #[Get('/voids')]
    public function index()
    {
        $rows = $this->voids->query()->order_by('requested_at', 'DESC')->get_all() ?: [];
        $this->success(['voids' => array_map([$this, 'format'], $rows)]);
    }

    #[Post('/voids')]
    public function create()
    {
        $input = $this->api->body();
        $id = $this->uuid();
        $this->voids->insert([
            'id' => $id,
            'order_id' => $input['orderId'] ?? null,
            'requested_by_staff_id' => $input['requestedByStaffId'] ?? null,
            'reason' => $input['reason'] ?? '',
            'status' => 'pending',
        ]);
        $this->success(['void' => $this->format($this->voids->find($id))], 201);
    }

    #[Put('/voids/{id:uuid}/resolve')]
    public function resolve($id)
    {
        $input = $this->api->body();
        $this->voids->query()->where('id', $id)->update([
            'approved_by_staff_id' => $input['approvedByStaffId'] ?? null,
            'status' => $input['status'] ?? 'rejected',
            'resolution_notes' => $input['resolutionNotes'] ?? null,
            'resolved_at' => date('Y-m-d H:i:s'),
        ]);
        if (($input['status'] ?? '') === 'approved') {
            $void = $this->voids->find($id);
            if ($void && !empty($void['order_id'])) {
                $targetOrder = $this->orders->find($void['order_id']);
                if ($targetOrder && $targetOrder['status'] !== 'cancelled') {
                    $this->orders->query()->where('id', $void['order_id'])->update([
                        'status' => 'cancelled',
                        'updated_at' => date('Y-m-d H:i:s'),
                    ]);
                    $this->stockRestorer->restore($void['order_id'], $input['approvedByStaffId'] ?? null, 'Order voided');
                }
            }
        }
        $this->success(['void' => $this->format($this->voids->find($id))]);
    }

    private function format($row)
    {
        $order = $this->orders->find($row['order_id']) ?: [];
        $requestedBy = $row['requested_by_staff_id']
            ? ($this->users->find($row['requested_by_staff_id']) ?: [])
            : [];
        $approvedBy = $row['approved_by_staff_id']
            ? ($this->users->find($row['approved_by_staff_id']) ?: [])
            : [];

        return [
            'id' => (string) $row['id'],
            'orderId' => (string) $row['order_id'],
            'orderNumber' => $order['order_number'] ?? 'Unknown order',
            'amount' => (float) ($order['total'] ?? 0),
            'requestedBy' => $requestedBy['name'] ?? 'System',
            'approvedBy' => $approvedBy['name'] ?? null,
            'reason' => $row['reason'],
            'status' => $row['status'],
            'requestedAt' => $row['requested_at'],
            'resolvedAt' => $row['resolved_at'],
            'resolutionNotes' => $row['resolution_notes'] ?? null,
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
