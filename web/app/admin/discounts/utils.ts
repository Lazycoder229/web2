import type { Promotion, PromoType, PromoStatus } from "./types"

export const fmt = (d: Date) => d.toISOString().split("T")[0]
export const today = new Date()

export const addDays = (d: Date, n: number) => {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

export function formatCurrency(value: number) {
  return `₱${value.toLocaleString("en-PH")}`
}

export function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function promoTypeLabel(type: PromoType) {
  return type === "percentage"
    ? "Percentage off"
    : type === "fixed_amount"
    ? "Fixed amount off"
    : "Buy X Get Y"
}

export function promoValueLabel(promo: Promotion) {
  if (promo.promoType === "percentage" && promo.discountValue != null)
    return `${promo.discountValue}% off`
  if (promo.promoType === "fixed_amount" && promo.discountValue != null)
    return `${formatCurrency(promo.discountValue)} off`
  return "—"
}

export function promoStatus(promo: Promotion): PromoStatus {
  if (!promo.isActive) return "inactive"
  const now = fmt(today)
  if (promo.endDate < now) return "expired"
  if (promo.startDate > now) return "scheduled"
  return "active"
}

export const promoStatusLabels: Record<string, string> = {
  active: "Active",
  scheduled: "Scheduled",
  expired: "Expired",
  inactive: "Inactive",
}

export const promoStatusClasses: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  scheduled: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  expired: "bg-muted text-muted-foreground border-border",
  inactive: "bg-destructive/10 text-destructive border-destructive/20",
}
