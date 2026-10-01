import { z } from "zod"
import { currencyAmountSchema, idSchema, nullableIdSchema, phoneSchema } from "./common"

export const orderTypeEnum = z.enum(["qr", "counter"])
export const orderStatusEnum = z.enum(["pending", "preparing", "ready", "served", "completed", "cancelled"])
export const orderVoidStatusEnum = z.enum(["pending", "approved", "rejected"])
export const reservationStatusEnum = z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"])
export const paymentMethodEnum = z.enum(["cash", "gcash", "maya", "card", "other"])

export const orderItemSchema = z.object({
  id: idSchema.optional(),
  orderId: idSchema.optional(),
  menuItemId: idSchema,
  name: z.string().min(1),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  price: currencyAmountSchema,
  subtotal: currencyAmountSchema.default(0),
  notes: z.string().max(255).nullable().optional(),
})

export const createOrderItemSchema = z.object({
  menuItemId: idSchema,
  quantity: z.number().int().positive("Quantity must be at least 1"),
  unitPrice: currencyAmountSchema,
  notes: z.string().max(255).nullable().optional(),
})

export const orderSchema = z.object({
  id: idSchema,
  orderNumber: z.string().min(1).max(30),
  tableId: idSchema.nullable().optional(),
  customerId: idSchema.nullable().optional(),
  orderType: orderTypeEnum,
  status: orderStatusEnum.default("pending"),
  subtotal: currencyAmountSchema,
  discount: currencyAmountSchema.default(0),
  tax: currencyAmountSchema.default(0),
  total: currencyAmountSchema,
  createdByStaffId: idSchema.nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
  items: z.array(orderItemSchema),
})

export const createOrderSchema = z.object({
  tableId: nullableIdSchema,
  customerId: nullableIdSchema,
  orderType: orderTypeEnum.optional().default("counter"),
  items: z.array(createOrderItemSchema).min(1, "Order must have at least one item"),
  createdByStaffId: nullableIdSchema,
})

export const updateOrderSchema = z.object({
  id: idSchema,
  status: orderStatusEnum.optional(),
  items: z.array(createOrderItemSchema).min(1).optional(),
})

export const updateOrderStatusSchema = z.object({
  orderId: idSchema,
  status: orderStatusEnum,
  changedByStaffId: nullableIdSchema,
})

export const orderStatusHistorySchema = z.object({
  id: idSchema,
  orderId: idSchema,
  status: z.string().max(30),
  changedByStaffId: idSchema.nullable().optional(),
  changedAt: z.coerce.date().optional(),
})

export const orderVoidSchema = z.object({
  id: idSchema,
  orderId: idSchema,
  requestedByStaffId: idSchema,
  approvedByStaffId: idSchema.nullable().optional(),
  reason: z.string().min(1, "Reason is required").max(1000),
  status: orderVoidStatusEnum.default("pending"),
  requestedAt: z.coerce.date().optional(),
  resolvedAt: z.coerce.date().nullable().optional(),
})

export const createOrderVoidSchema = z.object({
  orderId: idSchema,
  requestedByStaffId: idSchema,
  reason: z.string().min(3, "Reason must be at least 3 characters").max(1000),
})

export const resolveOrderVoidSchema = z.object({
  voidId: idSchema,
  approvedByStaffId: idSchema,
  status: z.enum(["approved", "rejected"]),
  resolutionNotes: z.string().max(1000).nullable().optional(),
})

export const reservationSchema = z.object({
  id: idSchema,
  customerId: idSchema.nullable().optional(),
  customerName: z.string().min(1, "Customer name is required").max(100),
  contactNumber: phoneSchema,
  email: z.string().email("Invalid email").nullable().optional(),
  tableId: idSchema.nullable().optional(),
  reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  reservationTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Format must be HH:MM"),
  numberOfGuests: z.number().int().positive("Guests must be at least 1"),
  status: reservationStatusEnum.default("pending"),
  notes: z.string().max(1000).nullable().optional(),
  createdByStaffId: idSchema.nullable().optional(),
  createdAt: z.coerce.date().optional(),
})

export const createReservationSchema = z.object({
  customerId: nullableIdSchema,
  customerName: z.string().min(1, "Customer name is required").max(100),
  contactNumber: phoneSchema,
  email: z.string().email("Invalid email").nullable().optional().or(z.literal("").transform(() => null)),
  tableId: nullableIdSchema,
  reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  reservationTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Format must be HH:MM"),
  numberOfGuests: z.number().int().positive("Guests must be at least 1"),
  notes: z.string().max(1000).nullable().optional(),
  createdByStaffId: nullableIdSchema,
})

export const updateReservationSchema = createReservationSchema.partial().extend({
  id: idSchema,
  status: reservationStatusEnum.optional(),
})

export const paymentSchema = z.object({
  id: idSchema,
  orderId: idSchema,
  receiptNumber: z.string().min(1).max(30),
  amountPaid: currencyAmountSchema,
  paymentMethod: paymentMethodEnum,
  referenceNumber: z.string().max(100).nullable().optional(),
  processedByStaffId: idSchema,
  paidAt: z.coerce.date().optional(),
})

export const createPaymentSchema = z.object({
  orderId: idSchema,
  amountPaid: currencyAmountSchema,
  paymentMethod: paymentMethodEnum,
  referenceNumber: z.string().max(100).nullable().optional(),
  processedByStaffId: nullableIdSchema,
})

export type Order = z.infer<typeof orderSchema>
export type OrderItem = z.infer<typeof orderItemSchema>
export type OrderStatus = z.infer<typeof orderStatusEnum>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
export type OrderVoid = z.infer<typeof orderVoidSchema>
export type CreateOrderVoidInput = z.infer<typeof createOrderVoidSchema>
export type ResolveOrderVoidInput = z.infer<typeof resolveOrderVoidSchema>
export type Reservation = z.infer<typeof reservationSchema>
export type CreateReservationInput = z.infer<typeof createReservationSchema>
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>
export type Payment = z.infer<typeof paymentSchema>
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
