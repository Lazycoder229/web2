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
        $status = $input['status'] ?? '';
        if (!in_array($status, ['approved', 'rejected'], true)) {
            $this->api->respond_error('Choose approved or rejected for the void decision.', 422);
        }
        $claims = $this->api->validate_jwt($this->api->get_bearer_token() ?? '');
        if (!$claims || ($claims['role'] ?? '') !== 'admin') {
            $this->api->respond_error('Admin sign-in is required to resolve a void request.', 401);
        }
        $voidBefore = $this->voids->find($id);
        if (!$voidBefore) {
            $this->api->respond_error('Void request not found.', 404);
        }
        if (($voidBefore['status'] ?? '') !== 'pending') {
            $this->api->respond_error('This void request has already been resolved.', 409);
        }
        $this->voids->query()->where('id', $id)->update([
            'approved_by_staff_id' => $claims['sub'] ?? null,
            'status' => $status,
            'resolution_notes' => $input['resolutionNotes'] ?? null,
            'resolved_at' => date('Y-m-d H:i:s'),
        ]);
        $resolvedVoid = $this->voids->find($id);
        if (($resolvedVoid['status'] ?? '') !== $status) {
            $this->api->respond_error('Could not save the void decision. Please refresh and try again.', 500);
        }
        if ($status === 'approved') {
            $void = $resolvedVoid;
            if ($void && !empty($void['order_id'])) {
                $targetOrder = $this->orders->find($void['order_id']);
                if ($targetOrder && $targetOrder['status'] !== 'cancelled') {
                    $this->orders->query()->where('id', $void['order_id'])->update([
                        'status' => 'cancelled',
                        'updated_at' => date('Y-m-d H:i:s'),
                    ]);
                    $cancelledOrder = $this->orders->find($void['order_id']);
                    if (($cancelledOrder['status'] ?? '') !== 'cancelled') {
                        $this->api->respond_error('The void was approved, but the order status could not be changed. Please refresh and contact an administrator.', 500);
                    }
                    $this->stockRestorer->restore($void['order_id'], $claims['sub'] ?? null, 'Order voided');
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
            'approvedByStaffId' => $row['approved_by_staff_id'] ?? null,
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
