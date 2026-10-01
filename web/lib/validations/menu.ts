import { z } from "zod"
import { currencyAmountSchema, idSchema } from "./common"

export const tableStatusEnum = z.enum(["available", "occupied", "reserved"])

export const categorySchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Category name is required").max(100),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date().optional(),
})

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: idSchema,
})

export const menuItemSchema = z.object({
  id: idSchema,
  categoryId: idSchema,
  name: z.string().min(1, "Item name is required").max(150),
  description: z.string().max(1000).nullable().optional(),
  price: currencyAmountSchema,
  imageUrl: z.string().url("Invalid image URL").max(500).nullable().optional(),
  isAvailable: z.boolean().default(true),
  stockQuantity: z.number().int().min(0).nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

export const createMenuItemSchema = z.object({
  categoryId: idSchema,
  name: z.string().min(1, "Item name is required").max(150),
  description: z.string().max(1000).nullable().optional(),
  price: currencyAmountSchema,
  imageUrl: z.string().url("Invalid image URL").max(500).nullable().optional(),
  isAvailable: z.boolean().default(true),
  stockQuantity: z.number().int().min(0).nullable().optional(),
})

export const updateMenuItemSchema = createMenuItemSchema.partial().extend({
  id: idSchema,
})

export const restaurantTableSchema = z.object({
  id: idSchema,
  tableNumber: z.string().min(1, "Table number is required").max(20),
  capacity: z.number().int().positive("Capacity must be at least 1"),
  qrCodeUrl: z.string().max(500).nullable().optional(),
  status: tableStatusEnum.default("available"),
  createdAt: z.coerce.date().optional(),
})

export const createRestaurantTableSchema = z.object({
  tableNumber: z.string().min(1, "Table number is required").max(20),
  capacity: z.number().int().positive("Capacity must be at least 1"),
  qrCodeUrl: z.string().max(500).optional(),
  status: tableStatusEnum.default("available"),
})

export const updateRestaurantTableSchema = createRestaurantTableSchema.partial().extend({
  id: idSchema,
})

export type Category = z.infer<typeof categorySchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type MenuItem = z.infer<typeof menuItemSchema>
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>
export type RestaurantTable = z.infer<typeof restaurantTableSchema>
export type CreateRestaurantTableInput = z.infer<typeof createRestaurantTableSchema>
export type UpdateRestaurantTableInput = z.infer<typeof updateRestaurantTableSchema>
