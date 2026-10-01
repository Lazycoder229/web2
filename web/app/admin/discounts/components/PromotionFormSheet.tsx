"use client"

import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

import type { MenuItemOption, PromoType, PromotionForm } from "../types"

interface PromotionFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: PromotionForm
  onFormChange: (updater: (c: PromotionForm) => PromotionForm) => void
  menuItems: MenuItemOption[]
  editing: boolean
  saving: boolean
  onSave: () => void
}

export function PromotionFormSheet({
  open,
  onOpenChange,
  form,
  onFormChange,
  menuItems,
  editing,
  saving,
  onSave,
}: PromotionFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4 text-left sm:p-6">
          <SheetTitle>{editing ? "Edit promotion" : "New promotion"}</SheetTitle>
          <SheetDescription>
            {editing
              ? "Update the promotion details below."
              : "Set up a new promo to apply at checkout."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-1.5">
            <Label htmlFor="promo-name">Promotion name</Label>
            <Input
              id="promo-name"
              value={form.name}
              onChange={(e) => onFormChange((c) => ({ ...c, name: e.target.value }))}
              placeholder="e.g. Weekday Lunch Special"
              className="h-11 sm:h-10"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="promo-desc">Description (optional)</Label>
            <Textarea
              id="promo-desc"
              value={form.description ?? ""}
              onChange={(e) =>
                onFormChange((c) => ({ ...c, description: e.target.value || null }))
              }
              placeholder="Short description shown at checkout…"
              className="resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Promo type</Label>
              <Select
                value={form.promoType}
                onValueChange={(value) =>
                  onFormChange((c) => ({
                    ...c,
                    promoType: value as PromoType,
                    discountValue: null,
                  }))
                }
              >
                <SelectTrigger className="h-11 w-full sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage off</SelectItem>
                  <SelectItem value="fixed_amount">Fixed amount off</SelectItem>
                  <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.promoType !== "buy_x_get_y" && (
              <div className="grid gap-1.5">
                <Label htmlFor="promo-value">
                  {form.promoType === "percentage" ? "Discount %" : "Amount off (₱)"}
                </Label>
                <Input
                  id="promo-value"
                  type="number"
                  min={0}
                  value={form.discountValue ?? ""}
                  onChange={(e) =>
                    onFormChange((c) => ({
                      ...c,
                      discountValue: Number(e.target.value) || null,
                    }))
                  }
                  placeholder={form.promoType === "percentage" ? "e.g. 15" : "e.g. 100"}
                  className="h-11 sm:h-10"
                />
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="promo-min-spend">Minimum spend (₱, optional)</Label>
            <Input
              id="promo-min-spend"
              type="number"
              min={0}
              value={form.minSpend ?? ""}
              onChange={(e) =>
                onFormChange((c) => ({ ...c, minSpend: Number(e.target.value) || null }))
              }
              placeholder="e.g. 300"
              className="h-11 sm:h-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="promo-start">Start date</Label>
              <Input
                id="promo-start"
                type="date"
                value={form.startDate}
                onChange={(e) => onFormChange((c) => ({ ...c, startDate: e.target.value }))}
                className="h-11 sm:h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="promo-end">End date</Label>
              <Input
                id="promo-end"
                type="date"
                value={form.endDate}
                onChange={(e) => onFormChange((c) => ({ ...c, endDate: e.target.value }))}
                className="h-11 sm:h-10"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="promo-limit">Usage limit (optional)</Label>
            <Input
              id="promo-limit"
              type="number"
              min={1}
              value={form.usageLimit ?? ""}
              onChange={(e) =>
                onFormChange((c) => ({ ...c, usageLimit: Number(e.target.value) || null }))
              }
              placeholder="Unlimited"
              className="h-11 sm:h-10"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Linked menu items (optional)</Label>
            <div className="flex flex-wrap gap-2 rounded-lg border p-3">
              {menuItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">No menu items found.</p>
              ) : (
                menuItems.map((item) => {
                  const linked = form.menuItemIds.includes(item.id)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        onFormChange((c) => ({
                          ...c,
                          menuItemIds: linked
                            ? c.menuItemIds.filter((id) => id !== item.id)
                            : [...c.menuItemIds, item.id],
                        }))
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        linked
                          ? "border-amber-500 bg-amber-500 text-neutral-950"
                          : "border-border text-muted-foreground hover:border-amber-400 hover:text-amber-700"
                      }`}
                    >
                      {item.name}
                    </button>
                  )
                })
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Leave empty to apply to the entire order.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                Inactive promos won&apos;t appear at checkout.
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => onFormChange((c) => ({ ...c, isActive: checked }))}
            />
          </div>
        </div>

        <SheetFooter className="flex-row border-t bg-background p-4 sm:p-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="flex-1 border-amber-500 text-amber-700 hover:bg-amber-50"
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={saving}
            className="flex-1 bg-amber-500 font-semibold text-neutral-950 hover:bg-amber-400"
          >
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {editing ? "Save changes" : "Create promotion"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
