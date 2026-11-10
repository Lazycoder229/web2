import { z } from "zod"
import { currencyAmountSchema, decimalStringSchema, idSchema } from "./common"

export const stockLogItemTypeEnum = z.enum(["ingredient", "menu_item"])
export const stockLogTypeEnum = z.enum(["stock_in", "adjustment", "waste", "consumed"])

export const inventoryCategorySchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Category name is required").max(100),
  createdAt: z.coerce.date().optional(),
})

export const createInventoryCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
})

export const inventoryItemSchema = z.object({
  id: idSchema,
  categoryId: idSchema.nullable().optional(),
  name: z.string().min(1, "Item name is required").max(150),
  unit: z.string().min(1, "Unit of measure is required (e.g., kg, L, pcs)").max(30),
  stockQuantity: decimalStringSchema.default("0.000"),
  reorderThreshold: decimalStringSchema.nullable().optional(),
  unitCost: currencyAmountSchema.nullable().optional(),
  supplier: z.string().max(150).nullable().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

export const createInventoryItemSchema = z.object({
  categoryId: idSchema.optional(),
  name: z.string().min(1, "Item name is required").max(150),
  unit: z.string().min(1, "Unit of measure is required").max(30),
  stockQuantity: decimalStringSchema.optional().default("0.000"),
  reorderThreshold: decimalStringSchema.optional(),
  unitCost: currencyAmountSchema.optional(),
  supplier: z.string().max(150).optional(),
  isActive: z.boolean().default(true),
})

export const updateInventoryItemSchema = createInventoryItemSchema.partial().extend({
  id: idSchema,
})

export const inventoryStockLogSchema = z.object({
  id: idSchema,
  itemType: stockLogItemTypeEnum,
  inventoryItemId: idSchema.nullable().optional(),
  menuItemId: idSchema.nullable().optional(),
  type: stockLogTypeEnum,
  quantityChange: decimalStringSchema,
  quantityAfter: decimalStringSchema.nullable().optional(),
  note: z.string().max(255).nullable().optional(),
  performedByStaffId: idSchema,
  createdAt: z.coerce.date().optional(),
})

export const createStockLogSchema = z.object({
  itemType: stockLogItemTypeEnum,
  inventoryItemId: idSchema.optional(),
  menuItemId: idSchema.optional(),
  type: stockLogTypeEnum,
  quantityChange: decimalStringSchema,
  note: z.string().max(255).optional(),
  performedByStaffId: idSchema,
})

export const menuItemIngredientSchema = z.object({
  menuItemId: idSchema,
  inventoryItemId: idSchema,
  quantityUsed: decimalStringSchema,
})

export const createRecipeMappingSchema = z.object({
  menuItemId: idSchema,
  ingredients: z.array(
    z.object({
      inventoryItemId: idSchema,
      quantityUsed: decimalStringSchema,
    })
  ).min(1, "Recipe must contain at least one ingredient"),
})

export type InventoryCategory = z.infer<typeof inventoryCategorySchema>
export type CreateInventoryCategoryInput = z.infer<typeof createInventoryCategorySchema>
export type InventoryItem = z.infer<typeof inventoryItemSchema>
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>
export type InventoryStockLog = z.infer<typeof inventoryStockLogSchema>
export type CreateStockLogInput = z.infer<typeof createStockLogSchema>
export type MenuItemIngredient = z.infer<typeof menuItemIngredientSchema>
export type CreateRecipeMappingInput = z.infer<typeof createRecipeMappingSchema>
