"use client"

import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"

import type { DiscountTypeForm } from "../types"

interface DiscountFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: DiscountTypeForm
  onFormChange: (updater: (c: DiscountTypeForm) => DiscountTypeForm) => void
  editing: boolean
  saving: boolean
  onSave: () => void
}

export function DiscountFormSheet({
  open,
  onOpenChange,
  form,
  onFormChange,
  editing,
  saving,
  onSave,
}: DiscountFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4 text-left sm:p-6">
          <SheetTitle>{editing ? "Edit discount type" : "New discount type"}</SheetTitle>
          <SheetDescription>
            {editing
              ? "Update the discount rate and settings."
              : "Add a fixed-rate discount available at checkout — e.g. Senior Citizen, PWD."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-1.5">
            <Label htmlFor="disc-name">Discount name</Label>
            <Input
              id="disc-name"
              value={form.name}
              onChange={(e) => onFormChange((c) => ({ ...c, name: e.target.value }))}
              placeholder="e.g. Senior Citizen"
              className="h-11 sm:h-10"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="disc-pct">Discount percentage (%)</Label>
            <Input
              id="disc-pct"
              type="number"
              min={1}
              max={100}
              value={form.percentage}
              onChange={(e) =>
                onFormChange((c) => ({ ...c, percentage: Number(e.target.value) || 0 }))
              }
              className="h-11 sm:h-10"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Requires ID verification</p>
              <p className="text-xs text-muted-foreground">
                Cashier must check a valid government ID before applying.
              </p>
            </div>
            <Switch
              checked={form.requiresIdVerification}
              onCheckedChange={(checked) =>
                onFormChange((c) => ({ ...c, requiresIdVerification: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                Inactive types won&apos;t appear at checkout.
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
            {editing ? "Save changes" : "Add discount type"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
