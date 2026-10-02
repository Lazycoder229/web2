import { api } from "./client"
import type {
  ActionResult,
  CreateOrderInput,
  Order,
  OrderItem,
  UpdateOrderInput,
  UpdateOrderStatusInput,
} from "@/types/admin/orders"

type RawOrderItem = Omit<
  OrderItem,
  "id" | "menuItemId" | "quantity" | "price" | "subtotal"
> & {
  id: string | number
  menuItemId: string | number
  quantity: number | string
  price?: number | string
  unitPrice?: number | string
  subtotal?: number | string
}

type RawOrder = Omit<
  Order,
  | "id"
  | "tableId"
  | "customerId"
  | "subtotal"
  | "discount"
  | "tax"
  | "total"
  | "createdAt"
  | "updatedAt"
  | "items"
> & {
  id: string | number
  tableId?: string | number | null
  customerId?: string | number | null
  subtotal: number | string
  discount: number | string
  tax: number | string
  total: number | string
  createdAt?: string | null
  updatedAt?: string | null
  items?: RawOrderItem[]
}

const toTimestamp = (value?: string | null): string | undefined =>
  value ? value.replace(" ", "T") : undefined

const toItem = (item: RawOrderItem): OrderItem => ({
  ...item,
  id: String(item.id),
  menuItemId: String(item.menuItemId),
  quantity: Number(item.quantity),
  price: Number(item.price ?? item.unitPrice ?? 0),
  subtotal: Number(item.subtotal ?? 0),
})

const toOrder = (order: RawOrder): Order => ({
  ...order,
  id: String(order.id),
  tableId: order.tableId == null ? null : String(order.tableId),
  customerId: order.customerId == null ? null : String(order.customerId),
  subtotal: Number(order.subtotal),
  discount: Number(order.discount),
  tax: Number(order.tax),
  total: Number(order.total),
  createdAt: toTimestamp(order.createdAt),
  updatedAt: toTimestamp(order.updatedAt),
  items: (order.items ?? []).map(toItem),
})

function mapData<A, B>(
  res: ActionResult<A>,
  map: (data: A) => B
): ActionResult<B> {
  return res.success && res.data !== undefined
    ? { success: true, data: map(res.data) }
    : { success: false, error: res.error ?? "Request failed." }
}

export async function fetchOrders(): Promise<any> {
  const res = await api<{ orders: RawOrder[] }>("/orders")
  return mapData(res, (data) => data.orders.map(toOrder))
}

export async function fetchOrderDetailsAction(id: string): Promise<any> {
  const res = await api<{ order: RawOrder }>(`/orders/${id}`)
  return mapData(res, (data) => toOrder(data.order))
}

export async function createOrderAction(input: any): Promise<any> {
  const res = await api<{ orderNumber: string; order: RawOrder }>("/orders", {
    method: "POST",
    body: JSON.stringify(input),
  })
  return mapData(res, (data) => ({
    orderNumber: data.orderNumber,
    order: toOrder(data.order),
  }))
}

export async function updateOrderAction(input: any): Promise<any> {
  const { id, ...body } = input
  const res = await api<{ order: RawOrder }>(`/orders/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  return mapData(res, (data) => ({ order: toOrder(data.order) }))
}

export async function updateOrderStatusAction(
  input: UpdateOrderStatusInput
): Promise<any> {
  const res = await api<{ order: RawOrder }>(
    `/orders/${input.orderId}/status`,
    {
      method: "PUT",
      body: JSON.stringify({
        status: input.status,
        changedByStaffId: input.changedByStaffId,
      }),
    }
  )
  return mapData(res, (data) => ({ order: toOrder(data.order) }))
}

export function deleteOrderAction(id: string): Promise<any> {
  return api<{ id: string }>(`/orders/${id}`, { method: "DELETE" })
}

export async function createPaymentAction(input: {
  orderId: string
  amountPaid: number
  paymentMethod: "cash" | "gcash" | "maya" | "card" | "other"
  referenceNumber?: string | null
  processedByStaffId?: string | null
}): Promise<any> {
  return api<{ receiptNumber: string; change: number }>("/payments", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function verifyQrOrderPaymentAction(
  orderId: string
): Promise<any> {
  return api<{ order: RawOrder }>(`/orders/${orderId}/verify-payment`, {
    method: "POST",
  })
}
