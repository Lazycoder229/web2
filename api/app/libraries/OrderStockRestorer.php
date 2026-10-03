<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

/**
 * Shared stock restoration for order cancellation and void approval.
 */
class OrderStockRestorer
{
    private $orders;
    private $orderItems;
    private $menu;
    private $inventoryItems;
    private $inventoryLogs;
    private $menuIngredients;

    public function __construct()
    {
        $call = lava_instance()->call;
        $this->orders = $call->model('OrderModel');
        $this->orderItems = $call->model('OrderItemModel');
        $this->menu = $call->model('MenuModel');
        $this->inventoryItems = $call->model('InventoryItemModel');
        $this->inventoryLogs = $call->model('InventoryStockLogModel');
        $this->menuIngredients = $call->model('MenuItemIngredientModel');
    }

    public function restore(string $orderId, ?string $staffId, string $reason = 'Order cancelled')
    {
        $order = $this->orders->find($orderId);
        if (!$order) {
            return;
        }

        $items = $this->orderItems->query()->where('order_id', $orderId)->get_all() ?: [];
        foreach ($items as $item) {
            $menuItemId = $item['menu_item_id'];
            $quantity = (int) $item['quantity'];
            $menuItem = $this->menu->find($menuItemId);
            if (!$menuItem) {
                continue;
            }

            if ($menuItem['stock_quantity'] !== null) {
                $newStock = (int) $menuItem['stock_quantity'] + $quantity;
                $this->menu->query()->where('id', $menuItemId)->update([
                    'stock_quantity' => $newStock,
                    'updated_at' => date('Y-m-d H:i:s'),
                ]);

                $this->inventoryLogs->insert([
                    'id' => $this->uuid(),
                    'item_type' => 'menu_item',
                    'inventory_item_id' => null,
                    'menu_item_id' => $menuItemId,
                    'type' => 'adjustment',
                    'quantity_change' => $quantity,
                    'quantity_after' => $newStock,
                    'note' => "Restored: {$reason} (#{$order['order_number']})",
                    'performed_by_staff_id' => $staffId,
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
            }

            $linkedIngredients = $this->menuIngredients->query()
                ->where('menu_item_id', $menuItemId)
                ->get_all() ?: [];

            foreach ($linkedIngredients as $ingredient) {
                $inventoryItem = $this->inventoryItems->find($ingredient['inventory_item_id']);
                if (!$inventoryItem) {
                    continue;
                }

                $quantityRestored = round($quantity * (float) $ingredient['quantity_used'], 3);
                $newStock = round((float) $inventoryItem['stock_quantity'] + $quantityRestored, 3);
                $this->inventoryItems->query()->where('id', $inventoryItem['id'])->update([
                    'stock_quantity' => $newStock,
                    'updated_at' => date('Y-m-d H:i:s'),
                ]);

                $this->inventoryLogs->insert([
                    'id' => $this->uuid(),
                    'item_type' => 'ingredient',
                    'inventory_item_id' => $inventoryItem['id'],
                    'menu_item_id' => null,
                    'type' => 'adjustment',
                    'quantity_change' => $quantityRestored,
                    'quantity_after' => $newStock,
                    'note' => "Restored: {$reason} (#{$order['order_number']}, {$quantity}x {$menuItem['name']})",
                    'performed_by_staff_id' => $staffId,
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
            }
        }
    }

    private function uuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        $hex = bin2hex($bytes);
        return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
    }
}
