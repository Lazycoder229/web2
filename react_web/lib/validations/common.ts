import { z } from "zod"

export const idSchema = z.string().uuid().or(z.string().min(1, "ID is required").max(36))

export const nullableIdSchema = idSchema
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null))

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})

export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional(),
})

export const decimalStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,3})?$/, "Must be a valid decimal amount")
  .or(z.number().transform((val) => val.toFixed(2)))

export const currencyAmountSchema = z
  .number()
  .min(0, "Amount must be greater than or equal to 0")
  .or(
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid monetary amount")
      .transform((val) => Number(val))
  )

export const phoneSchema = z
  .string()
  .regex(/^(09|\+639)\d{9}$|^(\+?[1-9]\d{1,14})$/, "Invalid phone number format")
  .or(z.string().min(7).max(20))

export type PaginationInput = z.infer<typeof paginationSchema>
export type DateRangeInput = z.infer<typeof dateRangeSchema>
