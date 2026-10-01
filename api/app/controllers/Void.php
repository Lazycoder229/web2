<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api')]
class VoidController extends Controller
{
    private $api;
    private $voids;
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->voids = $this->call->model('OrderVoidModel');
    }
    #[Get('/voids')] public function index()
    {
        $this->success(['voids' => $this->voids->query()->order_by('requested_at', 'DESC')->get_all() ?: []]);
    }
    #[Post('/voids')] public function create()
    {
        $i = $this->api->body();
        $id = $this->uuid();
        $this->voids->insert(['id' => $id,'order_id' => $i['orderId'] ?? null,'requested_by_staff_id' => $i['requestedByStaffId'] ?? null,'reason' => $i['reason'] ?? '','status' => 'pending']);
        $this->success(['void' => $this->voids->find($id)], 201);
    }
    #[Put('/voids/{id:uuid}/resolve')] public function resolve($id)
    {
        $i = $this->api->body();
        $this->voids->query()->where('id', $id)->update(['approved_by_staff_id' => $i['approvedByStaffId'] ?? null,'status' => $i['status'] ?? 'rejected','resolution_notes' => $i['resolutionNotes'] ?? null,'resolved_at' => date('Y-m-d H:i:s')]);
        $this->success(['void' => $this->voids->find($id)]);
    }
    private function uuid()
    {
        $h = bin2hex(random_bytes(16));
        return substr($h, 0, 8).'-'.substr($h, 8, 4).'-'.substr($h, 12, 4).'-'.substr($h, 16, 4).'-'.substr($h, 20);
    }
    private function success($d, $s = 200)
    {
        $this->api->respond(['success' => true,'data' => $d], $s);
    }
}
