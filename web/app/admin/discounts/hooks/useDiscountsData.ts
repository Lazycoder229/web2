"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import {
  createDiscountTypeAction,
  createPromotionAction,
  deleteDiscountTypeAction,
  deletePromotionAction,
  fetchDiscounts,
  updateDiscountTypeAction,
  updatePromotionAction,
} from "@/lib/api/discounts"
import { fetchMenuItems } from "@/lib/api/discounts"

import type {
  DiscountType,
  DiscountTypeForm,
  MenuItemOption,
  Promotion,
  PromotionForm,
} from "../types"

/**
 * Owns all server data + CRUD side-effects for the Discounts & Promos page.
 * Returns plain success booleans (or the new value, for toggles) so the
 * calling component decides what UI state to update (close a sheet, clear
 * a selection, etc). This hook never touches sheet/selection state itself.
 */
export function useDiscountsData() {
  const [promos, setPromos] = useState<Promotion[]>([])
  const [discounts, setDiscounts] = useState<DiscountType[]>([])
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [discountsRes, menuRes] = await Promise.all([fetchDiscounts(), fetchMenuItems()])

      if (discountsRes.success) {
        setDiscounts(discountsRes.data.discountTypes as DiscountType[])
        setPromos(discountsRes.data.promotions as Promotion[])
      } else {
        toast.error("Failed to load data", { description: (discountsRes as any).error })
      }

      if (menuRes.success) {
        setMenuItems((menuRes.data as any[]).map((m) => ({ id: m.id, name: m.name })))
      }
    } catch (err: any) {
      toast.error("Failed to load data", { description: err.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ---- Promo CRUD ----

  async function savePromo(form: PromotionForm, editingId: string | null) {
    if (!form.name.trim()) {
      toast.error("Promo name is required")
      return false
    }
    if (form.endDate < form.startDate) {
      toast.error("End date must be after start date")
      return false
    }

    setSaving(true)
    try {
      if (editingId) {
        const result = await updatePromotionAction({ id: editingId, ...form })
        if (!result.success) {
          toast.error("Failed to update promotion", { description: result.error })
          return false
        }
        toast.success("Promotion updated", { description: `${form.name} was saved.` })
      } else {
        const result = await createPromotionAction(form)
        if (!result.success) {
          toast.error("Failed to create promotion", { description: result.error })
          return false
        }
        setPromos((current) => [...current.filter((promo) => promo.id !== result.data.id), result.data as Promotion])
        toast.success("Promotion created", { description: `${form.name} is now live.` })
      }
      await loadData()
      return true
    } catch (err: any) {
      toast.error("Something went wrong", { description: err.message })
      return false
    } finally {
      setSaving(false)
    }
  }

  async function deletePromo(promo: Promotion) {
    try {
      const result = await deletePromotionAction(promo.id)
      if (!result.success) {
        toast.error("Failed to delete promotion", { description: result.error })
        return false
      }
      toast.success("Promotion deleted", { description: `${promo.name} was removed.` })
      await loadData()
      return true
    } catch (err: any) {
      toast.error("Something went wrong", { description: err.message })
      return false
    }
  }

  /** Returns the new isActive value on success, or null on failure. */
  async function togglePromoActive(promo: Promotion) {
    try {
      const next = !promo.isActive
      const result = await updatePromotionAction({ id: promo.id, isActive: next })
      if (!result.success) {
        toast.error("Failed to update promotion", { description: result.error })
        return null
      }
      toast.success(next ? `${promo.name} activated` : `${promo.name} deactivated`)
      await loadData()
      return next
    } catch (err: any) {
      toast.error("Something went wrong", { description: err.message })
      return null
    }
  }

  // ---- Discount CRUD ----

  async function saveDiscount(form: DiscountTypeForm, editingId: string | null) {
    if (!form.name.trim()) {
      toast.error("Discount name is required")
      return false
    }
    if (form.percentage <= 0 || form.percentage > 100) {
      toast.error("Percentage must be between 1 and 100")
      return false
    }

    setSaving(true)
    try {
      if (editingId) {
        const result = await updateDiscountTypeAction({ id: editingId, ...form })
        if (!result.success) {
          toast.error("Failed to update discount", { description: result.error })
          return false
        }
        toast.success("Discount type updated", { description: `${form.name} was saved.` })
      } else {
        const result = await createDiscountTypeAction(form)
        if (!result.success) {
          toast.error("Failed to create discount", { description: result.error })
          return false
        }
        setDiscounts((current) => [...current.filter((discount) => discount.id !== result.data.id), result.data as DiscountType])
        toast.success("Discount type added", {
          description: `${form.name} is now available at checkout.`,
        })
      }
      await loadData()
      return true
    } catch (err: any) {
      toast.error("Something went wrong", { description: err.message })
      return false
    } finally {
      setSaving(false)
    }
  }

  async function deleteDiscount(discount: DiscountType) {
    try {
      const result = await deleteDiscountTypeAction(discount.id)
      if (!result.success) {
        toast.error("Failed to delete discount", { description: result.error })
        return false
      }
      toast.success("Discount type removed", { description: `${discount.name} was deleted.` })
      await loadData()
      return true
    } catch (err: any) {
      toast.error("Something went wrong", { description: err.message })
      return false
    }
  }

  /** Returns the new isActive value on success, or null on failure. */
  async function toggleDiscountActive(discount: DiscountType) {
    try {
      const next = !discount.isActive
      const result = await updateDiscountTypeAction({ id: discount.id, isActive: next })
      if (!result.success) {
        toast.error("Failed to update discount", { description: result.error })
        return null
      }
      toast.success(next ? `${discount.name} enabled` : `${discount.name} disabled`)
      await loadData()
      return next
    } catch (err: any) {
      toast.error("Something went wrong", { description: err.message })
      return null
    }
  }

  return {
    promos,
    discounts,
    menuItems,
    loading,
    saving,
    loadData,
    savePromo,
    deletePromo,
    togglePromoActive,
    saveDiscount,
    deleteDiscount,
    toggleDiscountActive,
  }
}
