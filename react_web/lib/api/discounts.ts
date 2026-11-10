import { api } from "./client"
import { getMenuDataAction } from "./menu"

type AnyInput = Record<string, unknown>

export function fetchDiscounts() {
  return api<any>("/discounts")
}
export function createDiscountTypeAction(input: AnyInput) {
  return api<any>("/discounts/types", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
export function updateDiscountTypeAction(input: AnyInput) {
  const { id, ...body } = input
  return api<any>(`/discounts/types/${String(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}
export function deleteDiscountTypeAction(id: string) {
  return api<any>(`/discounts/types/${id}`, { method: "DELETE" })
}
export function createPromotionAction(input: AnyInput) {
  return api<any>("/discounts/promotions", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
export function updatePromotionAction(input: AnyInput) {
  const { id, ...body } = input
  return api<any>(`/discounts/promotions/${String(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}
export function deletePromotionAction(id: string) {
  return api<any>(`/discounts/promotions/${id}`, { method: "DELETE" })
}

export async function fetchMenuItems(): Promise<any> {
  const result = await getMenuDataAction()
  return result.success && result.data
    ? { success: true, data: result.data.items }
    : { success: false, error: result.error ?? "Request failed." }
}
