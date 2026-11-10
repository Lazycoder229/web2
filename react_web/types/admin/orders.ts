import type { z } from "zod"
import {
  createOrderSchema,
  orderItemSchema,
  orderSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
} from "@/lib/validations/orders"

export type Order = z.infer<typeof orderSchema>
export type OrderItem = z.infer<typeof orderItemSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>

export type ActionResult<T> = {
  success: boolean
  data?: T
  error?: string
}
