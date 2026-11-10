import { addDays, fmt, today } from "./utils"
import type { DiscountTypeForm, PromotionForm } from "./types"

export const emptyDiscountForm: DiscountTypeForm = {
  name: "",
  percentage: 20,
  requiresIdVerification: true,
  isActive: true,
}

export const emptyPromoForm: PromotionForm = {
  name: "",
  description: null,
  promoType: "percentage",
  discountValue: null,
  minSpend: null,
  startDate: fmt(today),
  endDate: fmt(addDays(today, 30)),
  usageLimit: null,
  isActive: true,
  menuItemIds: [],
}

export const promoTabs = [
  { value: "all", label: "All promos" },
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "expired", label: "Expired / Inactive" },
]

export const pageTabs = [
  { value: "promos", label: "Promotions" },
  { value: "discounts", label: "Discount types" },
]
