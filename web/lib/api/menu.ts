import { api } from "./client"
import type {
  ActionResult,
  Category,
  CreateCategoryInput,
  CreateMenuItemInput,
  MenuItem,
  UpdateCategoryInput,
  UpdateMenuItemInput,
} from "@/types/admin/menu"

/* ------------------------------------------------------------------ */
/* Normalizers                                                         */
/* PHP + MySQL often return numbers as strings ("420.00") and booleans */
/* as 0/1 or "0"/"1". Fix the types once here, not all over the UI.    */
/* ------------------------------------------------------------------ */

type RawCategory = Omit<
  Category,
  "id" | "sortOrder" | "isActive" | "createdAt"
> & {
  id: string | number
  sortOrder: number | string
  isActive: boolean | number | string
  createdAt?: string
}

type RawItem = Omit<
  MenuItem,
  | "id"
  | "categoryId"
  | "price"
  | "isAvailable"
  | "stockQuantity"
  | "createdAt"
  | "updatedAt"
> & {
  id: string | number
  categoryId: string | number
  price: number | string
  isAvailable: boolean | number | string
  stockQuantity: number | string | null
  createdAt?: string
  updatedAt?: string
}

const toBool = (v: unknown) => v === true || v === 1 || v === "1"

// Handles both ISO strings and MySQL "YYYY-MM-DD HH:mm:ss"
const toDate = (v?: string | null) =>
  v ? new Date(v.replace(" ", "T")) : undefined

const toCategory = (r: RawCategory): Category => ({
  ...r,
  id: String(r.id),
  sortOrder: Number(r.sortOrder),
  isActive: toBool(r.isActive),
  createdAt: toDate(r.createdAt),
})

const toItem = (r: RawItem): MenuItem => ({
  ...r,
  id: String(r.id),
  categoryId: String(r.categoryId),
  price: Number(r.price),
  isAvailable: toBool(r.isAvailable),
  stockQuantity: r.stockQuantity == null ? null : Number(r.stockQuantity),
  createdAt: toDate(r.createdAt),
  updatedAt: toDate(r.updatedAt),
})

function mapData<A, B>(
  res: ActionResult<A>,
  fn: (data: A) => B
): ActionResult<B> {
  if (res.success && res.data !== undefined) {
    return { success: true, data: fn(res.data) }
  }
  return { success: false, error: res.error ?? "Request failed." }
}

/* ------------------------------------------------------------------ */
/* Read                                                                */
/* ------------------------------------------------------------------ */

export async function getMenuDataAction() {
  const res = await api<{ categories: RawCategory[]; items: RawItem[] }>(
    "/menu"
  )
  return mapData(res, (d) => ({
    categories: d.categories.map(toCategory),
    items: d.items.map(toItem),
  }))
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export async function createCategoryAction(input: CreateCategoryInput) {
  const res = await api<{ category: RawCategory }>("/categories", {
    method: "POST",
    body: JSON.stringify(input),
  })
  return mapData(res, (d) => ({ category: toCategory(d.category) }))
}

export async function updateCategoryAction({
  id,
  ...body
}: UpdateCategoryInput) {
  const res = await api<{ category: RawCategory }>(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  return mapData(res, (d) => ({ category: toCategory(d.category) }))
}

export function deleteCategoryAction(id: string) {
  return api<{ id: string }>(`/categories/${id}`, { method: "DELETE" })
}

/* ------------------------------------------------------------------ */
/* Menu items                                                          */
/* JSON.stringify drops `undefined` (= "don't change") but keeps `null`*/
/* (= "clear it"). The backend must tell them apart by key presence.   */
/* ------------------------------------------------------------------ */

export async function createMenuItemAction(input: CreateMenuItemInput) {
  const res = await api<{ item: RawItem }>("/menu-items", {
    method: "POST",
    body: JSON.stringify(input),
  })
  return mapData(res, (d) => ({ item: toItem(d.item) }))
}

export async function updateMenuItemAction({
  id,
  ...body
}: UpdateMenuItemInput) {
  const res = await api<{ item: RawItem }>(`/menu-items/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  return mapData(res, (d) => ({ item: toItem(d.item) }))
}

export function deleteMenuItemAction(id: string) {
  return api<{ id: string }>(`/menu-items/${id}`, { method: "DELETE" })
}

/* ------------------------------------------------------------------ */
/* Image upload                                                        */
/* ------------------------------------------------------------------ */

export function uploadMenuImageAction(file: File) {
  const body = new FormData()
  body.set("file", file)
  return api<{ url: string }>("/menu-items/upload-image", {
    method: "POST",
    body,
  })
}
