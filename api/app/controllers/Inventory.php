<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api', middleware: ['admin_auth'])]
class Inventory extends Controller
{
    private $api;
    private $items;
    private $logs;
    private $categories;
    private $menu;
    private $menuCategories;
    private $ingredients;

    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->items = $this->call->model('InventoryItemModel');
        $this->logs = $this->call->model('InventoryStockLogModel');
        $this->categories = $this->call->model('InventoryCategoryModel');
        $this->menu = $this->call->model('MenuModel');
        $this->menuCategories = $this->call->model('CategoryModel');
        $this->ingredients = $this->call->model('MenuItemIngredientModel');
    }

    #[Get('/inventory/access')]
    public function access()
    {
        $this->success(['canManage' => true, 'canView' => true, 'canStockIn' => true, 'canLogWaste' => true]);
    }

    #[Get('/inventory')]
    public function index()
    {
        // Inventory items (ingredients & supplies)
        $rawItems = $this->items->query()->order_by('name', 'ASC')->get_all() ?: [];

        // Inventory categories
        $rawCategories = $this->categories->query()->order_by('name', 'ASC')->get_all() ?: [];

        // ---- Menu items with stock info for the "Menu item stock" tab ----
        $rawMenuItems = $this->menu->query()
            ->select('menu_items.id, menu_items.name, menu_items.price, menu_items.stock_quantity, menu_items.is_available, menu_items.category_id')
            ->order_by('menu_items.name', 'ASC')
            ->get_all() ?: [];

        $menuCats = $this->menuCategories->query()->get_all() ?: [];
        $menuCatMap = [];
        foreach ($menuCats as $cat) {
            $menuCatMap[$cat['id']] = $cat['name'];
        }

        $menuItems = [];
        foreach ($rawMenuItems as $mi) {
            $menuItems[] = [
                'id' => (string) $mi['id'],
                'name' => $mi['name'],
                'category' => $menuCatMap[$mi['category_id']] ?? '',
                'price' => (float) $mi['price'],
                'stockQuantity' => $mi['stock_quantity'] === null ? null : (int) $mi['stock_quantity'],
                'isAvailable' => (bool) $mi['is_available'],
            ];
        }

        // ---- Enriched stock logs with item names, units, and staff names ----
        $rawLogs = $this->logs->query()->order_by('created_at', 'DESC')->get_all() ?: [];

        // Build lookup maps for item names and units
        $invItemMap = [];
        foreach ($rawItems as $it) {
            $invItemMap[$it['id']] = ['name' => $it['name'], 'unit' => $it['unit']];
        }
        $menuItemMap = [];
        foreach ($rawMenuItems as $mi) {
            $menuItemMap[$mi['id']] = ['name' => $mi['name'], 'unit' => 'pcs'];
        }

        // Batch-fetch staff names for all logs
        $staffIds = array_unique(array_filter(array_column($rawLogs, 'performed_by_staff_id')));
        $staffMap = [];
        if ($staffIds) {
            $users = $this->call->model('UserModel');
            foreach ($staffIds as $sid) {
                $user = $users->find($sid);
                if ($user) {
                    $staffMap[$sid] = $user['name'];
                }
            }
        }

        $enrichedLogs = [];
        foreach ($rawLogs as $log) {
            $itemType = $log['item_type'] ?? 'ingredient';
            $itemName = 'Unknown item';
            $unit = 'pcs';

            if ($itemType === 'menu_item' && isset($menuItemMap[$log['menu_item_id'] ?? ''])) {
                $itemName = $menuItemMap[$log['menu_item_id']]['name'];
                $unit = $menuItemMap[$log['menu_item_id']]['unit'];
            } elseif (isset($invItemMap[$log['inventory_item_id'] ?? ''])) {
                $itemName = $invItemMap[$log['inventory_item_id']]['name'];
                $unit = $invItemMap[$log['inventory_item_id']]['unit'];
            }

            $enrichedLogs[] = [
                'id' => (string) $log['id'],
                'itemType' => $itemType,
                'inventoryItemId' => $log['inventory_item_id'] ?? null,
                'menuItemId' => $log['menu_item_id'] ?? null,
                'itemName' => $itemName,
                'unit' => $unit,
                'type' => $log['type'],
                'quantityChange' => (float) $log['quantity_change'],
                'quantityAfter' => $log['quantity_after'] === null ? null : (float) $log['quantity_after'],
                'note' => $log['note'] ?? null,
                'performedByStaffId' => $log['performed_by_staff_id'] ?? '',
                'staffName' => $staffMap[$log['performed_by_staff_id'] ?? ''] ?? 'System',
                'createdAt' => $log['created_at'] ?? '',
            ];
        }

        $rawRecipes = $this->ingredients->query()->get_all() ?: [];
        $recipes = [];
        foreach ($rawRecipes as $r) {
            $recipes[] = [
                'menuItemId' => (string) $r['menu_item_id'],
                'inventoryItemId' => (string) $r['inventory_item_id'],
                'inventoryItemName' => $invItemMap[$r['inventory_item_id']]['name'] ?? 'Unknown Item',
                'unit' => $invItemMap[$r['inventory_item_id']]['unit'] ?? 'pcs',
                'quantityUsed' => (float) $r['quantity_used'],
            ];
        }

        $this->success([
            'items' => $rawItems,
            'categories' => $rawCategories,
            'stockLogs' => $enrichedLogs,
            'menuItems' => $menuItems,
            'recipes' => $recipes,
        ]);
    }

    #[Post('/inventory/items')]
    public function create()
    {
        $i = $this->api->body();
        $id = $this->uuid();
        $this->items->insert(array_merge(['id' => $id], $this->columns($i)));
        $this->success(['item' => $this->items->find($id)], 201);
    }

    #[Put('/inventory/items/{id:uuid}')]
    public function update($id)
    {
        $this->items->query()->where('id', $id)->update($this->columns($this->api->body()));
        $this->success(['item' => $this->items->find($id)]);
    }

    #[Delete('/inventory/items/{id:uuid}')]
    public function delete($id)
    {
        $this->items->query()->where('id', $id)->delete();
        $this->success(['id' => $id]);
    }

    #[Post('/inventory/stock')]
    public function adjust()
    {
        $i = $this->api->body();
        $itemType = $i['itemType'] ?? 'ingredient';

        if ($itemType === 'menu_item') {
            $this->adjust_menu_item_stock($i);
        } else {
            $this->adjust_ingredient_stock($i);
        }
    }

    /**
     * Adjust ingredient / supply stock and record an immutable stock log entry.
     */
    private function adjust_ingredient_stock($i)
    {
        $item = $this->items->find($i['inventoryItemId'] ?? '');
        if (!$item) {
            $this->api->respond_error('Inventory item not found.', 404);
        }

        $change = (float) ($i['quantityChange'] ?? 0);
        $after = max(0, round((float) $item['stock_quantity'] + $change, 3));

        $this->items->query()->where('id', $item['id'])->update([
            'stock_quantity' => $after,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        // Create immutable stock log entry
        $this->logs->insert([
            'id' => $this->uuid(),
            'item_type' => 'ingredient',
            'inventory_item_id' => $item['id'],
            'menu_item_id' => null,
            'type' => $i['type'] ?? 'adjustment',
            'quantity_change' => $change,
            'quantity_after' => $after,
            'note' => $i['note'] ?? null,
            'performed_by_staff_id' => $i['performedByStaffId'] ?? null,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        $this->success(['item' => $this->items->find($item['id'])]);
    }

    /**
     * Adjust menu-item stock (or switch to unlimited) and record an immutable stock log entry.
     */
    private function adjust_menu_item_stock($i)
    {
        $menuItem = $this->menu->find($i['menuItemId'] ?? '');
        if (!$menuItem) {
            $this->api->respond_error('Menu item not found.', 404);
        }

        $isUnlimited = !empty($i['isUnlimited']);
        $change = (float) ($i['quantityChange'] ?? 0);
        $prevQty = $menuItem['stock_quantity'] === null ? null : (int) $menuItem['stock_quantity'];

        if ($isUnlimited) {
            $newQty = null;
        } elseif (isset($i['setQuantity']) && $i['setQuantity'] !== null) {
            $newQty = max(0, (int) $i['setQuantity']);
        } else {
            $newQty = max(0, ($prevQty ?? 0) + (int) $change);
        }

        $this->menu->query()->where('id', $menuItem['id'])->update([
            'stock_quantity' => $newQty,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        // Create immutable stock log entry
        $this->logs->insert([
            'id' => $this->uuid(),
            'item_type' => 'menu_item',
            'inventory_item_id' => null,
            'menu_item_id' => $menuItem['id'],
            'type' => $i['type'] ?? 'adjustment',
            'quantity_change' => $change,
            'quantity_after' => $newQty,
            'note' => $i['note'] ?? null,
            'performed_by_staff_id' => $i['performedByStaffId'] ?? null,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        $this->success(['item' => $this->menu->find($menuItem['id'])]);
    }

    #[Get('/inventory/recipes')]
    public function get_recipes()
    {
        $rawRecipes = $this->ingredients->query()->get_all() ?: [];
        $rawInv = $this->items->query()->get_all() ?: [];
        $invMap = [];
        foreach ($rawInv as $item) {
            $invMap[$item['id']] = $item;
        }

        $recipes = [];
        foreach ($rawRecipes as $row) {
            $recipes[] = [
                'menuItemId' => (string) $row['menu_item_id'],
                'inventoryItemId' => (string) $row['inventory_item_id'],
                'inventoryItemName' => $invMap[$row['inventory_item_id']]['name'] ?? 'Unknown Item',
                'unit' => $invMap[$row['inventory_item_id']]['unit'] ?? 'pcs',
                'quantityUsed' => (float) $row['quantity_used'],
            ];
        }

        $this->success(['recipes' => $recipes]);
    }

    #[Get('/inventory/recipes/{menuItemId:uuid}')]
    public function get_recipe_for_menu_item($menuItemId)
    {
        $rawRecipes = $this->ingredients->query()->where('menu_item_id', $menuItemId)->get_all() ?: [];
        $rawInv = $this->items->query()->get_all() ?: [];
        $invMap = [];
        foreach ($rawInv as $item) {
            $invMap[$item['id']] = $item;
        }

        $ingredients = [];
        foreach ($rawRecipes as $row) {
            $ingredients[] = [
                'inventoryItemId' => (string) $row['inventory_item_id'],
                'inventoryItemName' => $invMap[$row['inventory_item_id']]['name'] ?? 'Unknown Item',
                'unit' => $invMap[$row['inventory_item_id']]['unit'] ?? 'pcs',
                'quantityUsed' => (float) $row['quantity_used'],
            ];
        }

        $this->success(['menuItemId' => $menuItemId, 'ingredients' => $ingredients]);
    }

    #[Post('/inventory/recipes')]
    public function save_recipe()
    {
        $input = $this->api->body();
        $menuItemId = $input['menuItemId'] ?? null;
        if (!$menuItemId || !$this->menu->find($menuItemId)) {
            $this->api->respond_error('Valid menuItemId is required.', 422);
        }

        $ingredients = $input['ingredients'] ?? [];
        if (!is_array($ingredients)) {
            $this->api->respond_error('Ingredients must be an array.', 422);
        }

        // Delete existing recipe ingredients for this menu item
        $this->ingredients->query()->where('menu_item_id', $menuItemId)->delete();

        // Insert new recipe mappings
        foreach ($ingredients as $ing) {
            $invId = $ing['inventoryItemId'] ?? null;
            $qty = (float) ($ing['quantityUsed'] ?? 0);
            if ($invId && $qty > 0 && $this->items->find($invId)) {
                $this->ingredients->insert([
                    'menu_item_id' => $menuItemId,
                    'inventory_item_id' => $invId,
                    'quantity_used' => round($qty, 3),
                ]);
            }
        }

        $this->get_recipe_for_menu_item($menuItemId);
    }

    private function columns($i)
    {
        $m = [
            'categoryId' => 'category_id',
            'name' => 'name',
            'unit' => 'unit',
            'stockQuantity' => 'stock_quantity',
            'reorderThreshold' => 'reorder_threshold',
            'unitCost' => 'unit_cost',
            'supplier' => 'supplier',
            'isActive' => 'is_active',
        ];
        $o = [];
        foreach ($m as $a => $b) {
            if (array_key_exists($a, $i)) {
                $o[$b] = $i[$a];
            }
        }
        return $o;
    }

    private function uuid()
    {
        $h = bin2hex(random_bytes(16));
        return substr($h, 0, 8) . '-' . substr($h, 8, 4) . '-' . substr($h, 12, 4) . '-' . substr($h, 16, 4) . '-' . substr($h, 20);
    }

    private function success($d, $s = 200)
    {
        $this->api->respond(['success' => true, 'data' => $d], $s);
    }
}
