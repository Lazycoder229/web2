<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api', middleware: ['admin_auth'])]
class Branch extends Controller
{
    private $api;
    private $branches;

    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->branches = $this->call->model('BranchModel');
    }

    #[Get('/branches')]
    public function index()
    {
        $rows = $this->branches->query()->order_by('is_main', 'DESC')->order_by('name', 'ASC')->get_all();
        $this->success(['branches' => array_map([$this, 'format'], $rows ?: [])]);
    }

    #[Post('/branches')]
    public function create()
    {
        $input = $this->api->body();
        $id = $this->uuid();
        $data = array_merge(['id' => $id], $this->columns($input));
        if (!empty($data['is_main'])) {
            $this->branches->query()->update(['is_main' => 0]);
            $data['type'] = 'main';
        }
        $this->branches->insert($data);
        $this->success(['branch' => $this->format($this->branches->find($id))], 201);
    }

    #[Put('/branches/{id:uuid}')]
    public function update($id)
    {
        $existing = $this->branches->find($id);
        if (!$existing) {
            $this->api->respond_error('Branch not found.', 404);
            return;
        }

        $data = $this->columns($this->api->body());
        if (!empty($data['is_main'])) {
            $this->branches->query()->where('id !=', $id)->update(['is_main' => 0, 'type' => 'branch']);
            $data['type'] = 'main';
        } elseif ((bool) $existing['is_main']) {
            $data['is_main'] = 1;
            $data['type'] = 'main';
        }
        $data['updated_at'] = date('Y-m-d H:i:s');
        $this->branches->query()->where('id', $id)->update($data);
        $this->success(['branch' => $this->format($this->branches->find($id))]);
    }

    #[Delete('/branches/{id:uuid}')]
    public function delete($id)
    {
        $existing = $this->branches->find($id);
        if (!$existing) {
            $this->api->respond_error('Branch not found.', 404);
            return;
        }
        if ((bool) $existing['is_main']) {
            $this->api->respond_error('The main branch cannot be deleted.', 422);
            return;
        }
        $this->branches->query()->where('id', $id)->delete();
        $this->success(['id' => $id]);
    }

    private function columns($input)
    {
        $columns = [];
        foreach (['name', 'code', 'type', 'address', 'contactNumber', 'email', 'isMain', 'isActive'] as $key) {
            if (!array_key_exists($key, $input)) continue;
            $column = preg_replace('/([A-Z])/', '_$1', lcfirst($key));
            $columns[$column] = $input[$key];
        }
        return $columns;
    }

    private function format($row)
    {
        return [
            'id' => (string) $row['id'],
            'name' => $row['name'],
            'code' => $row['code'],
            'type' => $row['type'],
            'address' => $row['address'],
            'contactNumber' => $row['contact_number'],
            'email' => $row['email'],
            'isMain' => (bool) $row['is_main'],
            'isActive' => (bool) $row['is_active'],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
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
