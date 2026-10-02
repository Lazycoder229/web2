"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Eye, Pencil, Search, Tag, Trash2, X } from "lucide-react"

import { AdminDeleteDialog } from "@/components/admin-delete-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { promoTabs } from "../constants"
import type { Promotion } from "../types"
import {
  formatDate,
  promoStatus,
  promoStatusClasses,
  promoStatusLabels,
  promoTypeLabel,
  promoValueLabel,
} from "../utils"

interface PromotionsListProps {
  promos: Promotion[]
  loading: boolean
  onView: (promo: Promotion) => void
  onEdit: (promo: Promotion) => void
  onDelete: (promo: Promotion) => void
}

const PAGE_SIZE = 6

export function PromotionsList({ promos, loading, onView, onEdit, onDelete }: PromotionsListProps) {
  const [tab, setTab] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return promos.filter((p) => {
      const matchesSearch =
        !query ||
        [p.name, p.description ?? "", promoTypeLabel(p.promoType)]
          .join(" ")
          .toLowerCase()
          .includes(query)
      const ps = promoStatus(p)
      const matchesTab =
        tab === "all"
          ? true
          : tab === "active"
          ? ps === "active"
          : tab === "scheduled"
          ? ps === "scheduled"
          : ps === "expired" || ps === "inactive"
      return matchesSearch && matchesTab
    })
  }, [promos, tab, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  )

  useEffect(() => setPage(1), [tab, search])

  return (
    <Card className="border bg-card shadow-xs">
      <CardHeader className="gap-4 p-4 pb-3 sm:p-6 sm:pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-bold sm:text-lg">Promotions</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search promotions…"
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
        <div className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="inline-flex h-10 w-max justify-start rounded-lg bg-muted p-1">
              {promoTabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="px-3 text-xs font-medium sm:px-4">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="hidden grid-cols-[minmax(0,1fr)_100px_120px_120px] border-y bg-muted/30 px-4 py-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase sm:grid sm:px-6">
          <span>Promotion</span>
          <span>Value</span>
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
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        ) : filtered.length ? (
          <div className="divide-y">
            {paginated.map((promo) => {
              const ps = promoStatus(promo)
              return (
                <div
                  key={promo.id}
                  className="grid gap-3 p-4 transition-colors hover:bg-muted/30 sm:grid-cols-[minmax(0,1fr)_100px_120px_120px] sm:items-center sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      <Tag className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{promo.name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {promoTypeLabel(promo.promoType)}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(promo.startDate)} – {formatDate(promo.endDate)}
                        {promo.usageLimit != null
                          ? ` · ${promo.usageCount}/${promo.usageLimit} uses`
                          : ` · ${promo.usageCount} uses`}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-amber-600">{promoValueLabel(promo)}</p>
                  <Badge
                    variant="outline"
                    className={`w-fit min-w-24 justify-center text-[11px] ${promoStatusClasses[ps]}`}
                  >
                    {promoStatusLabels[ps]}
                  </Badge>
                  <div className="flex items-center justify-end gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon-sm" onClick={() => onView(promo)} aria-label={`View ${promo.name}`}>
                          <Eye className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View promotion</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon-sm" onClick={() => onEdit(promo)} aria-label={`Edit ${promo.name}`}>
                          <Pencil className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit promotion</TooltipContent>
                    </Tooltip>
                    <AdminDeleteDialog title={`Delete ${promo.name}?`} description="This promotion will be permanently removed." onConfirm={() => onDelete(promo)}>
                      <Button variant="outline" size="icon-sm" className="text-destructive hover:text-destructive" aria-label={`Delete ${promo.name}`}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </AdminDeleteDialog>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No promotions match this view.
          </div>
        )}
      </CardContent>

      {!loading && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-xs font-medium">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
