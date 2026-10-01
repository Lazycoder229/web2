<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api/categories')]
class Category extends Controller
{
    private $api;
    private $categories;

    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->categories = $this->call->model('CategoryModel');
    }

    #[Get('/')]
    public function index()
    {
        $rows = $this->categories->query()
            ->select('id,name,sort_order,is_active,created_at')
            ->order_by('sort_order', 'ASC')
            ->get_all();

        $this->success(['categories' => array_map([$this, 'format_category'], $rows ?: [])]);
    }

    #[Post('/')]
    public function create()
    {
        $input = $this->api->body();
        $name = trim((string) ($input['name'] ?? ''));

        if ($name === '' || strlen($name) > 100) {
            $this->api->respond_error('Category name is required and must be 100 characters or fewer.', 422);
        }

        $id = $this->uuid();
        $created = $this->categories->insert([
            'id' => $id,
            'name' => $name,
            'sort_order' => (int) ($input['sortOrder'] ?? 0),
            'is_active' => $this->boolean_value($input['isActive'] ?? true),
        ]);

        if ($created === false) {
            $this->api->respond_error('Could not create category.', 500);
        }

        $this->success(['category' => $this->format_category($this->categories->find($id))], 201);
    }

    #[Put('/{id:uuid}')]
    public function update($id)
    {
        $input = $this->api->body();
        $changes = [];

        if (array_key_exists('name', $input)) {
            $name = trim((string) $input['name']);
            if ($name === '' || strlen($name) > 100) {
                $this->api->respond_error('Category name is required and must be 100 characters or fewer.', 422);
            }
            $changes['name'] = $name;
        }
        if (array_key_exists('sortOrder', $input)) {
            $changes['sort_order'] = (int) $input['sortOrder'];
        }
        if (array_key_exists('isActive', $input)) {
            $changes['is_active'] = $this->boolean_value($input['isActive']);
        }
        if (!$changes) {
            $this->api->respond_error('No category fields were provided.', 422);
        }

        if (!$this->categories->find($id)) {
            $this->api->respond_error('Category not found.', 404);
        }

        $this->categories->query()->where('id', $id)->update($changes);
        $this->success(['category' => $this->format_category($this->categories->find($id))]);
    }

    #[Delete('/{id:uuid}')]
    public function delete($id)
    {
        if (!$this->categories->find($id)) {
            $this->api->respond_error('Category not found.', 404);
        }

        $this->categories->query()->where('id', $id)->delete();
        $this->success(['id' => $id]);
    }

    private function format_category($row)
    {
        return [
            'id' => (string) $row['id'],
            'name' => $row['name'],
            'sortOrder' => (int) $row['sort_order'],
            'isActive' => (bool) $row['is_active'],
            'createdAt' => $row['created_at'] ?? null,
        ];
    }

    private function boolean_value($value)
    {
        return (int) (filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false);
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
