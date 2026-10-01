<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api')]
class Inventory extends Controller
{
    private $api;
    private $items;
    private $logs;
    private $categories;
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->items = $this->call->model('InventoryItemModel');
        $this->logs = $this->call->model('InventoryStockLogModel');
        $this->categories = $this->call->model('InventoryCategoryModel');
    }
    #[Get('/inventory/access')] public function access()
    {
        $this->success(['canManage' => true,'canView' => true]);
    }
    #[Get('/inventory')] public function index()
    {
        $this->success(['items' => $this->items->query()->order_by('name', 'ASC')->get_all() ?: [],'categories' => $this->categories->query()->order_by('name', 'ASC')->get_all() ?: [],'stockLogs' => $this->logs->query()->order_by('created_at', 'DESC')->get_all() ?: [],'menuItems' => []]);
    }
    #[Post('/inventory/items')] public function create()
    {
        $i = $this->api->body();
        $id = $this->uuid();
        $this->items->insert(array_merge(['id' => $id], $this->columns($i)));
        $this->success(['item' => $this->items->find($id)], 201);
    }
    #[Put('/inventory/items/{id:uuid}')] public function update($id)
    {
        $this->items->query()->where('id', $id)->update($this->columns($this->api->body()));
        $this->success(['item' => $this->items->find($id)]);
    }
    #[Delete('/inventory/items/{id:uuid}')] public function delete($id)
    {
        $this->items->query()->where('id', $id)->delete();
        $this->success(['id' => $id]);
    }
    #[Post('/inventory/stock')] public function adjust()
    {
        $i = $this->api->body();
        $item = $this->items->find($i['inventoryItemId'] ?? '');
        if (!$item) {
            $this->api->respond_error('Inventory item not found.', 404);
        } $after = (float)$item['stock_quantity'] + (float)($i['quantityChange'] ?? 0);
        $this->items->query()->where('id', $item['id'])->update(['stock_quantity' => $after]);
        $this->success(['item' => $this->items->find($item['id'])]);
    }
    private function columns($i)
    {
        $m = ['categoryId' => 'category_id','name' => 'name','unit' => 'unit','stockQuantity' => 'stock_quantity','reorderThreshold' => 'reorder_threshold','unitCost' => 'unit_cost','supplier' => 'supplier','isActive' => 'is_active'];
        $o = [];
        foreach ($m as $a => $b) {
            if (array_key_exists($a, $i)) {
                $o[$b] = $i[$a];
            }
        } return $o;
    }
    private function uuid()
    {
        $h = bin2hex(random_bytes(16));
        return substr($h, 0, 8).'-'.substr($h, 8, 4).'-'.substr($h, 12, 4).'-'.substr($h, 16, 4).'-'.substr($h, 20);
    }
    private function success($d, $s = 200)
    {
        $this->api->respond(['success' => true,'data' => $d],$s);
    }
}
