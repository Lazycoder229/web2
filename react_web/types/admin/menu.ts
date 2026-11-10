import type { MenuItem } from "@/lib/validations/menu"

// Single source of truth: the zod schemas in lib/validation/menu.ts
export type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
  MenuItem,
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from "@/lib/validations/menu"

export type MenuItemFormValues = Omit<MenuItem, "id" | "createdAt" | "updatedAt">

/** Same shape your real API layer returns. */
export type ActionResult<T> = {
  success: boolean
  data?: T
  error?: string
}