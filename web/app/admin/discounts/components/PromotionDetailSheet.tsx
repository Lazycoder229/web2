"use client"

import { Pencil, Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import type { MenuItemOption, Promotion } from "../types"
import {
  formatCurrency,
  formatDate,
  promoStatus,
  promoStatusClasses,
  promoStatusLabels,
  promoTypeLabel,
  promoValueLabel,
} from "../utils"

interface PromotionDetailSheetProps {
  promo: Promotion | null
  menuItems: MenuItemOption[]
  onClose: () => void
  onEdit: (promo: Promotion) => void
  onDelete: (promo: Promotion) => void
  onToggleActive: (promo: Promotion) => void
}

export function PromotionDetailSheet({
  promo,
  menuItems,
  onClose,
  onEdit,
  onDelete,
  onToggleActive,
}: PromotionDetailSheetProps) {
  const menuItemIds = Array.isArray(promo?.menuItemIds) ? promo.menuItemIds : []

  return (
    <Sheet open={Boolean(promo)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full p-0 sm:max-w-md">
        {promo && (
          <>
            <SheetHeader className="border-b p-4 text-left sm:p-6">
              <div className="flex items-start justify-between gap-4 pr-8">
                <div>
                  <SheetTitle>{promo.name}</SheetTitle>
                  <SheetDescription>
                    {promoTypeLabel(promo.promoType)}
                    {promo.discountValue != null ? ` · ${promoValueLabel(promo)}` : ""}
                  </SheetDescription>
                </div>
                <Badge variant="outline" className={promoStatusClasses[promoStatus(promo)]}>
                  {promoStatusLabels[promoStatus(promo)]}
                </Badge>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
              {promo.description && (
                <p className="text-sm text-muted-foreground">{promo.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Start date</p>
                  <p className="mt-1 text-sm font-medium">{formatDate(promo.startDate)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">End date</p>
                  <p className="mt-1 text-sm font-medium">{formatDate(promo.endDate)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Times used</p>
                  <p className="mt-1 text-sm font-medium">
                    {promo.usageCount}
                    {promo.usageLimit != null ? ` / ${promo.usageLimit}` : " (unlimited)"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Min. spend</p>
                  <p className="mt-1 text-sm font-medium">
                    {promo.minSpend != null ? formatCurrency(promo.minSpend) : "None"}
                  </p>
                </div>
              </div>

              {menuItemIds.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="mb-2 text-xs text-muted-foreground">Linked menu items</p>
                  <div className="flex flex-wrap gap-1.5">
                    {menuItemIds.map((id) => {
                      const item = menuItems.find((m) => m.id === id)
                      return (
                        <Badge key={id} variant="outline" className="text-xs">
                          {item?.name ?? id}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <SheetFooter className="flex-col gap-2 border-t bg-background p-4 sm:p-6">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    onEdit(promo)
                    onClose()
                  }}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-destructive hover:text-destructive">
                      <Trash2 className="mr-2 size-4" />Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-[90vw] max-w-md rounded-xl sm:rounded-lg">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {promo.name}?</AlertDialogTitle>
                      <AlertDialogDescription className="text-xs sm:text-sm">
                        This permanently removes the promotion. Orders that already used it won't
                        be affected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
                      <AlertDialogCancel className="mt-0 w-full sm:w-auto">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(promo)}
                        className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <Button
                onClick={() => onToggleActive(promo)}
                variant="outline"
                className={`w-full ${
                  promo.isActive
                    ? "text-destructive hover:text-destructive"
                    : "text-emerald-700 hover:text-emerald-700"
                }`}
              >
                {promo.isActive ? "Deactivate promotion" : "Activate promotion"}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
