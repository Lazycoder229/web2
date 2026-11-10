<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api', middleware: ['admin_auth'])]
class Printer extends Controller
{
    private $api;
    private $printers;
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->printers = $this->call->model('PrinterModel');
    }
    #[Get('/printers')] public function index()
    {
        $rows = $this->printers->query()->order_by('name', 'ASC')->get_all();
        $this->success(['printers' => array_map([$this,'format'], $rows ?: [])]);
    }
    #[Post('/printers')] public function create()
    {
        $input = $this->api->body();
        $id = $this->uuid();
        $this->printers->insert(array_merge(['id' => $id], $this->columns($input)));
        $this->success(['printer' => $this->format($this->printers->find($id))], 201);
    }
    #[Put('/printers/{id:uuid}')] public function update($id)
    {
        if (!$this->printers->find($id)) {
            $this->api->respond_error('Printer not found.', 404);
        } $this->printers->query()->where('id', $id)->update($this->columns($this->api->body()));
        $this->success(['printer' => $this->format($this->printers->find($id))]);
    }
    #[Delete('/printers/{id:uuid}')] public function delete($id)
    {
        $this->printers->query()->where('id', $id)->delete();
        $this->success(['id' => $id]);
    }
    private function columns($i)
    {
        $m = ['name' => 'name','location' => 'location','connectionType' => 'connection_type','ipAddress' => 'ip_address','isActive' => 'is_active'];
        $o = [];
        foreach ($m as $a => $b) {
            if (array_key_exists($a, $i)) {
                $o[$b] = $i[$a];
            }
        } return $o;
    }
    private function format($r)
    {
        return ['id' => (string)$r['id'],'name' => $r['name'],'location' => $r['location'],'connectionType' => $r['connection_type'],'ipAddress' => $r['ip_address'],'isActive' => (bool)$r['is_active'],'status' => 'offline'];
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
