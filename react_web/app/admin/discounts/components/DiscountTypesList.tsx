"use client"

import { useMemo, useState } from "react"
import { BadgePercent, Eye, Pencil, Search, Trash2, X } from "lucide-react"

import { AdminDeleteDialog } from "@/components/admin-delete-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import type { DiscountType } from "../types"

interface DiscountTypesListProps {
  discounts: DiscountType[]
  loading: boolean
  onView: (discount: DiscountType) => void
  onEdit: (discount: DiscountType) => void
  onDelete: (discount: DiscountType) => void
}

export function DiscountTypesList({ discounts, loading, onView, onEdit, onDelete }: DiscountTypesListProps) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return discounts.filter((d) => !query || d.name.toLowerCase().includes(query))
  }, [discounts, search])

  return (
    <Card className="border bg-card shadow-xs">
      <CardHeader className="gap-4 p-4 pb-3 sm:p-6 sm:pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-bold sm:text-lg">Discount types</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Senior Citizen, PWD, and other fixed-rate discounts applied at checkout.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search discount types…"
              className="h-10 pl-9 pr-9 text-sm"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="hidden grid-cols-[minmax(0,1fr)_100px_100px_120px] border-y bg-muted/30 px-4 py-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase sm:grid sm:px-6">
          <span>Discount type</span>
          <span>Rate</span>
          <span>Status</span>
          <span className="text-center">Actions</span>
        </div>
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-3 p-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : filtered.length ? (
          <div className="divide-y">
            {filtered.map((discount) => (
              <div
                key={discount.id}
                className="grid gap-3 p-4 transition-colors hover:bg-muted/30 sm:grid-cols-[minmax(0,1fr)_100px_100px_120px] sm:items-center sm:px-6"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    <BadgePercent className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{discount.name}</p>
                      {discount.requiresIdVerification && (
                        <Badge variant="outline" className="text-[10px]">
                          ID required
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {discount.percentage}% off · {discount.isActive ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold text-amber-600">{discount.percentage}%</p>
                <Badge
                  variant="outline"
                  className={
                    discount.isActive
                      ? "w-fit border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                      : "w-fit border-border bg-muted text-muted-foreground"
                  }
                >
                  {discount.isActive ? "Active" : "Inactive"}
                </Badge>
                <div className="flex items-center justify-end gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon-sm" onClick={() => onView(discount)} aria-label={`View ${discount.name}`}>
                        <Eye className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View discount type</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon-sm" onClick={() => onEdit(discount)} aria-label={`Edit ${discount.name}`}>
                        <Pencil className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit discount type</TooltipContent>
                  </Tooltip>
                  <AdminDeleteDialog title={`Delete ${discount.name}?`} description="This discount type will be permanently removed." onConfirm={() => onDelete(discount)}>
                    <Button variant="outline" size="icon-sm" className="text-destructive hover:text-destructive" aria-label={`Delete ${discount.name}`}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </AdminDeleteDialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No discount types match this search.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
