import { z } from "zod"
import { currencyAmountSchema, idSchema, phoneSchema } from "./common"

export const loyaltyTransactionTypeEnum = z.enum(["earn", "redeem"])

export const customerSchema = z.object({
  id: idSchema,
  email: z.string().email("Invalid email").nullable().optional(),
  password: z.string().nullable().optional(),
  name: z.string().min(1, "Name is required").max(100),
  contactNumber: phoneSchema.nullable().optional(),
  loyaltyPointsBalance: z.number().int().min(0).default(0),
  isGuest: z.boolean().default(true),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(100),
  email: z.string().email("Invalid email").optional(),
  contactNumber: phoneSchema.optional(),
  isGuest: z.boolean().default(false),
})

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  id: idSchema,
})

export const loyaltySettingSchema = z.object({
  id: idSchema,
  pointsPerPeso: currencyAmountSchema.default(1),
  pesoValuePerPoint: currencyAmountSchema.default(0.5),
  updatedAt: z.coerce.date().optional(),
})

export const updateLoyaltySettingSchema = z.object({
  pointsPerPeso: currencyAmountSchema,
  pesoValuePerPoint: currencyAmountSchema,
})

export const loyaltyTransactionSchema = z.object({
  id: idSchema,
  customerId: idSchema,
  orderId: idSchema.nullable().optional(),
  type: loyaltyTransactionTypeEnum,
  points: z.number().int(),
  balanceAfter: z.number().int().min(0),
  createdAt: z.coerce.date().optional(),
})

export const createLoyaltyTransactionSchema = z.object({
  customerId: idSchema,
  orderId: idSchema.optional(),
  type: loyaltyTransactionTypeEnum,
  points: z.number().int().positive("Points must be positive"),
})

export const loyaltyRewardSchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Reward name is required").max(150),
  pointsCost: z.number().int().positive("Points cost must be positive"),
  description: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().default(true),
})

export const createLoyaltyRewardSchema = z.object({
  name: z.string().min(1, "Reward name is required").max(150),
  pointsCost: z.number().int().positive("Points cost must be positive"),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().default(true),
})

export const updateLoyaltyRewardSchema = createLoyaltyRewardSchema.partial().extend({
  id: idSchema,
})

export type Customer = z.infer<typeof customerSchema>
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type LoyaltySetting = z.infer<typeof loyaltySettingSchema>
export type UpdateLoyaltySettingInput = z.infer<typeof updateLoyaltySettingSchema>
export type LoyaltyTransaction = z.infer<typeof loyaltyTransactionSchema>
export type CreateLoyaltyTransactionInput = z.infer<typeof createLoyaltyTransactionSchema>
export type LoyaltyReward = z.infer<typeof loyaltyRewardSchema>
export type CreateLoyaltyRewardInput = z.infer<typeof createLoyaltyRewardSchema>
export type UpdateLoyaltyRewardInput = z.infer<typeof updateLoyaltyRewardSchema>
