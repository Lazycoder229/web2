import { z } from "zod"
import { currencyAmountSchema, idSchema } from "./common"

export const expenseCategorySchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Category name is required").max(100),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date().optional(),
})

export const createExpenseCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  isActive: z.boolean().default(true),
})

export const updateExpenseCategorySchema = createExpenseCategorySchema.partial().extend({
  id: idSchema,
})

export const expenseSchema = z.object({
  id: idSchema,
  categoryId: idSchema,
  description: z.string().min(1, "Description is required").max(255),
  amount: currencyAmountSchema,
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  receiptReference: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  recordedByStaffId: idSchema,
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

export const createExpenseSchema = z.object({
  categoryId: idSchema,
  description: z.string().min(1, "Description is required").max(255),
  amount: currencyAmountSchema,
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  receiptReference: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  recordedByStaffId: idSchema,
})

export const updateExpenseSchema = createExpenseSchema.partial().extend({
  id: idSchema,
})

export type ExpenseCategory = z.infer<typeof expenseCategorySchema>
export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>
export type UpdateExpenseCategoryInput = z.infer<typeof updateExpenseCategorySchema>
export type Expense = z.infer<typeof expenseSchema>
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
