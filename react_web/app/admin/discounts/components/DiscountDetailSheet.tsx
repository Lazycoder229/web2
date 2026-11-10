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

import type { DiscountType } from "../types"

interface DiscountDetailSheetProps {
  discount: DiscountType | null
  onClose: () => void
  onEdit: (discount: DiscountType) => void
  onDelete: (discount: DiscountType) => void
  onToggleActive: (discount: DiscountType) => void
}

export function DiscountDetailSheet({
  discount,
  onClose,
  onEdit,
  onDelete,
  onToggleActive,
}: DiscountDetailSheetProps) {
  return (
    <Sheet open={Boolean(discount)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full p-0 sm:max-w-md">
        {discount && (
          <>
            <SheetHeader className="border-b p-4 text-left sm:p-6">
              <div className="flex items-start justify-between gap-4 pr-8">
                <div>
                  <SheetTitle>{discount.name}</SheetTitle>
                  <SheetDescription>
                    {discount.percentage}% discount ·{" "}
                    {discount.requiresIdVerification ? "ID required" : "No ID required"}
                  </SheetDescription>
                </div>
                <Badge
                  variant="outline"
                  className={
                    discount.isActive
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                      : "border-border bg-muted text-muted-foreground"
                  }
                >
                  {discount.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Rate</p>
                  <p className="mt-1 text-sm font-medium">{discount.percentage}% off</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">ID verification</p>
                  <p className="mt-1 text-sm font-medium">
                    {discount.requiresIdVerification ? "Required" : "Not required"}
                  </p>
                </div>
              </div>
            </div>

            <SheetFooter className="flex-col gap-2 border-t bg-background p-4 sm:p-6">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    onEdit(discount)
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
                      <AlertDialogTitle>Delete {discount.name}?</AlertDialogTitle>
                      <AlertDialogDescription className="text-xs sm:text-sm">
                        This removes the discount type from checkout. Historical order discounts
                        won't be affected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
                      <AlertDialogCancel className="mt-0 w-full sm:w-auto">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(discount)}
                        className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <Button
                variant="outline"
                onClick={() => onToggleActive(discount)}
                className={`w-full ${
                  discount.isActive
                    ? "text-destructive hover:text-destructive"
                    : "text-emerald-700 hover:text-emerald-700"
                }`}
              >
                {discount.isActive ? "Disable discount type" : "Enable discount type"}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
