import { z } from "zod"
import { currencyAmountSchema, idSchema } from "./common"

export const promoTypeEnum = z.enum(["percentage", "fixed_amount", "buy_x_get_y"])

export const discountTypeSchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Discount name is required").max(100),
  percentage: z.number().min(0).max(100, "Percentage must be between 0 and 100"),
  requiresIdVerification: z.boolean().default(true),
  isActive: z.boolean().default(true),
})

export const createDiscountTypeSchema = z.object({
  name: z.string().min(1, "Discount name is required").max(100),
  percentage: z.number().min(0).max(100, "Percentage must be between 0 and 100"),
  requiresIdVerification: z.boolean().default(true),
  isActive: z.boolean().default(true),
})

export const updateDiscountTypeSchema = createDiscountTypeSchema.partial().extend({
  id: idSchema,
})

export const orderDiscountSchema = z.object({
  id: idSchema,
  orderId: idSchema,
  discountTypeId: idSchema,
  idNumber: z.string().max(50).nullable().optional(),
  holderName: z.string().min(1, "Holder name is required").max(100),
  discountAmount: currencyAmountSchema,
  appliedByStaffId: idSchema,
  createdAt: z.coerce.date().optional(),
})

export const applyOrderDiscountSchema = z.object({
  orderId: idSchema,
  discountTypeId: idSchema,
  idNumber: z.string().max(50).optional(),
  holderName: z.string().min(1, "Holder name is required").max(100),
  appliedByStaffId: idSchema,
})

export const promotionSchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Promotion name is required").max(150),
  description: z.string().max(1000).nullable().optional(),
  promoType: promoTypeEnum,
  discountValue: currencyAmountSchema.nullable().optional(),
  minSpend: currencyAmountSchema.nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  usageLimit: z.number().int().positive().nullable().optional(),
  usageCount: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  createdByStaffId: idSchema,
  createdAt: z.coerce.date().optional(),
})

export const createPromotionSchema = z.object({
  name: z.string().min(1, "Promotion name is required").max(150),
  description: z.string().max(1000).optional(),
  promoType: promoTypeEnum,
  discountValue: currencyAmountSchema.optional(),
  minSpend: currencyAmountSchema.optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  usageLimit: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
  menuItemIds: z.array(idSchema).optional().default([]),
})

export const updatePromotionSchema = createPromotionSchema.partial().extend({
  id: idSchema,
})

export const promotionItemSchema = z.object({
  promotionId: idSchema,
  menuItemId: idSchema,
})

export const orderPromotionSchema = z.object({
  id: idSchema,
  orderId: idSchema,
  promotionId: idSchema,
  discountAmount: currencyAmountSchema,
  appliedAt: z.coerce.date().optional(),
})

export type DiscountType = z.infer<typeof discountTypeSchema>
export type CreateDiscountTypeInput = z.infer<typeof createDiscountTypeSchema>
export type UpdateDiscountTypeInput = z.infer<typeof updateDiscountTypeSchema>
export type OrderDiscount = z.infer<typeof orderDiscountSchema>
export type ApplyOrderDiscountInput = z.infer<typeof applyOrderDiscountSchema>
export type Promotion = z.infer<typeof promotionSchema>
export type CreatePromotionInput = z.infer<typeof createPromotionSchema>
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>
export type PromotionItem = z.infer<typeof promotionItemSchema>
export type OrderPromotion = z.infer<typeof orderPromotionSchema>
