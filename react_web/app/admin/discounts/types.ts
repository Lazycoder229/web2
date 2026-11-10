export interface DiscountType {
  id: string
  name: string
  percentage: number
  requiresIdVerification: boolean
  isActive: boolean
}

export type DiscountTypeForm = Omit<DiscountType, "id">

export type PromoType = "percentage" | "fixed_amount" | "buy_x_get_y"

export interface Promotion {
  id: string
  name: string
  description: string | null
  promoType: PromoType
  discountValue: number | null
  minSpend: number | null
  startDate: string
  endDate: string
  usageLimit: number | null
  usageCount: number
  isActive: boolean
  createdByStaffId: string
  menuItemIds: string[]
}

export type PromotionForm = Omit<Promotion, "id" | "usageCount" | "createdByStaffId">

export interface MenuItemOption {
  id: string
  name: string
}

export type PromoStatus = "active" | "scheduled" | "expired" | "inactive"
