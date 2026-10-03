import { api } from "./client"

export type InventoryAccess = {
  canManage: boolean
  canView: boolean
  canStockIn: boolean
  canLogWaste: boolean
}
type AnyInput = Record<string, unknown>

export function fetchInventoryAccessAction(): Promise<any> {
  return api<any>("/inventory/access")
}
export function fetchInventory(): Promise<any> {
  return api<any>("/inventory")
}
export function createInventoryItemAction(input: AnyInput): Promise<any> {
  return api<any>("/inventory/items", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
export function updateInventoryItemAction(input: AnyInput): Promise<any> {
  const { id, ...body } = input
  return api<any>(`/inventory/items/${String(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}
export function deleteInventoryItemAction(id: string): Promise<any> {
  return api<any>(`/inventory/items/${id}`, { method: "DELETE" })
}
export function adjustStockAction(input: AnyInput): Promise<any> {
  return api<any>("/inventory/stock", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function fetchRecipesAction(): Promise<any> {
  return api<any>("/inventory/recipes")
}

export function fetchMenuItemRecipeAction(menuItemId: string): Promise<any> {
  return api<any>(`/inventory/recipes/${menuItemId}`)
}

export function saveRecipeAction(input: {
  menuItemId: string
  ingredients: { inventoryItemId: string; quantityUsed: number }[]
}): Promise<any> {
  return api<any>("/inventory/recipes", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
