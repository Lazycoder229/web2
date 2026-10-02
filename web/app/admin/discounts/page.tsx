"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/sonner"

import { useDiscountsData } from "./hooks/useDiscountsData"
import { pageTabs, emptyDiscountForm, emptyPromoForm } from "./constants"
import { promoStatus } from "./utils"
import type { DiscountType, DiscountTypeForm, Promotion, PromotionForm } from "./types"

import { StatsCards } from "./components/StatsCards"
import { PromotionsList } from "./components/PromotionsList"
import { DiscountTypesList } from "./components/DiscountTypesList"
import { PromotionFormSheet } from "./components/PromotionFormSheet"
import { PromotionDetailSheet } from "./components/PromotionDetailSheet"
import { DiscountFormSheet } from "./components/DiscountFormSheet"
import { DiscountDetailSheet } from "./components/DiscountDetailSheet"

export default function DiscountsPage() {
  const [pageTab, setPageTab] = useState("promos")

  const {
    promos,
    discounts,
    menuItems,
    loading,
    saving,
    savePromo,
    deletePromo,
    togglePromoActive,
    saveDiscount,
    deleteDiscount,
    toggleDiscountActive,
  } = useDiscountsData()

  // ---- Promo sheet state ----
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null)
  const [promoSheetOpen, setPromoSheetOpen] = useState(false)
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null)
  const [promoForm, setPromoForm] = useState<PromotionForm>(emptyPromoForm)

  // ---- Discount sheet state ----
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountType | null>(null)
  const [discountSheetOpen, setDiscountSheetOpen] = useState(false)
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null)
  const [discountForm, setDiscountForm] = useState<DiscountTypeForm>(emptyDiscountForm)

  const counts = useMemo(
    () => ({
      active: promos.filter((p) => promoStatus(p) === "active").length,
      scheduled: promos.filter((p) => promoStatus(p) === "scheduled").length,
      totalUsage: promos.reduce((sum, p) => sum + p.usageCount, 0),
      discountTypes: discounts.filter((d) => d.isActive).length,
    }),
    [promos, discounts],
  )

  // ---- Promo handlers ----

  function openCreatePromo() {
    setEditingPromoId(null)
    setPromoForm(emptyPromoForm)
    setPromoSheetOpen(true)
  }

  function openEditPromo(promo: Promotion) {
    setEditingPromoId(promo.id)
    setPromoForm({
      name: promo.name,
      description: promo.description,
      promoType: promo.promoType,
      discountValue: promo.discountValue,
      minSpend: promo.minSpend,
      startDate: promo.startDate,
      endDate: promo.endDate,
      usageLimit: promo.usageLimit,
      isActive: promo.isActive,
      menuItemIds: promo.menuItemIds,
    })
    setPromoSheetOpen(true)
  }

  async function handleSavePromo() {
    const ok = await savePromo(promoForm, editingPromoId)
    if (ok) setPromoSheetOpen(false)
  }

  async function handleDeletePromo(promo: Promotion) {
    const ok = await deletePromo(promo)
    if (ok) setSelectedPromo(null)
  }

  async function handleTogglePromoActive(promo: Promotion) {
    const next = await togglePromoActive(promo)
    if (next !== null) {
      setSelectedPromo((current) => (current?.id === promo.id ? { ...current, isActive: next } : current))
    }
  }

  // ---- Discount handlers ----

  function openCreateDiscount() {
    setEditingDiscountId(null)
    setDiscountForm(emptyDiscountForm)
    setDiscountSheetOpen(true)
  }

  function openEditDiscount(discount: DiscountType) {
    setEditingDiscountId(discount.id)
    setDiscountForm({
      name: discount.name,
      percentage: discount.percentage,
      requiresIdVerification: discount.requiresIdVerification,
      isActive: discount.isActive,
    })
    setDiscountSheetOpen(true)
  }

  async function handleSaveDiscount() {
    const ok = await saveDiscount(discountForm, editingDiscountId)
    if (ok) setDiscountSheetOpen(false)
  }

  async function handleDeleteDiscount(discount: DiscountType) {
    const ok = await deleteDiscount(discount)
    if (ok) setSelectedDiscount(null)
  }

  async function handleToggleDiscountActive(discount: DiscountType) {
    const next = await toggleDiscountActive(discount)
    if (next !== null) {
      setSelectedDiscount((current) =>
        current?.id === discount.id ? { ...current, isActive: next } : current,
      )
    }
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden pb-16 sm:pb-8">
      <Toaster richColors position="top-center" />
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Discounts &amp; Promos</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Manage promotions, Senior Citizen / PWD discounts, and special rates.
            </p>
          </div>
          <Button
            onClick={pageTab === "promos" ? openCreatePromo : openCreateDiscount}
            className="h-11 w-full bg-amber-500 font-semibold text-neutral-950 shadow-sm hover:bg-amber-400 sm:h-10 sm:w-auto"
          >
            <Plus className="mr-2 size-4" />
            {pageTab === "promos" ? "New promotion" : "Add discount type"}
          </Button>
        </div>

        <StatsCards {...counts} loading={loading} />

        <div className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Tabs value={pageTab} onValueChange={setPageTab}>
            <TabsList className="inline-flex h-10 w-max justify-start rounded-lg bg-muted p-1">
              {pageTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="px-3 text-xs font-medium sm:px-4">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {pageTab === "promos" && (
          <PromotionsList promos={promos} loading={loading} onView={setSelectedPromo} onEdit={openEditPromo} onDelete={handleDeletePromo} />
        )}

        {pageTab === "discounts" && (
          <DiscountTypesList discounts={discounts} loading={loading} onView={setSelectedDiscount} onEdit={openEditDiscount} onDelete={handleDeleteDiscount} />
        )}
      </div>

      <PromotionFormSheet
        open={promoSheetOpen}
        onOpenChange={setPromoSheetOpen}
        form={promoForm}
        onFormChange={setPromoForm}
        menuItems={menuItems}
        editing={Boolean(editingPromoId)}
        saving={saving}
        onSave={handleSavePromo}
      />

      <PromotionDetailSheet
        promo={selectedPromo}
        menuItems={menuItems}
        onClose={() => setSelectedPromo(null)}
        onEdit={openEditPromo}
        onDelete={handleDeletePromo}
        onToggleActive={handleTogglePromoActive}
      />

      <DiscountFormSheet
        open={discountSheetOpen}
        onOpenChange={setDiscountSheetOpen}
        form={discountForm}
        onFormChange={setDiscountForm}
        editing={Boolean(editingDiscountId)}
        saving={saving}
        onSave={handleSaveDiscount}
      />

      <DiscountDetailSheet
        discount={selectedDiscount}
        onClose={() => setSelectedDiscount(null)}
        onEdit={openEditDiscount}
        onDelete={handleDeleteDiscount}
        onToggleActive={handleToggleDiscountActive}
      />
    </div>
  )
}
