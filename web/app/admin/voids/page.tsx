"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  FileX,
  Plus,
  Receipt,
  Search,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
  X,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Toaster } from "@/components/ui/sonner"
import {
  createVoidAction,
  fetchVoids,
  resolveVoidAction,
} from "@/lib/api/voids"

// ---------------------------------------------------------------------------
// Types — mirrors `order_voids` and related tables in `dbdesign.md`
// ---------------------------------------------------------------------------

export type VoidStatus = "pending" | "approved" | "rejected"

export interface OrderItemSummary {
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes?: string | null
}

export interface OrderVoidItem {
  id: string
  orderId: string
  orderNumber: string
  tableNumber: string | null
  orderType: "qr" | "counter"
  orderTotal: number
  orderSubtotal: number
  orderDiscount: number
  orderTax: number
  orderCreatedAt: string
  items: OrderItemSummary[]
  requestedByStaffId: string
  requestedByStaffName: string
  approvedByStaffId: string | null
  approvedByStaffName: string | null
  reason: string
  resolutionNotes?: string | null
  status: VoidStatus
  requestedAt: string
  resolvedAt: string | null
}

export interface RecentOrderOption {
  id: string
  orderNumber: string
  tableNumber: string | null
  orderType: "qr" | "counter"
  total: number
  subtotal: number
  discount: number
  tax: number
  createdAt: string
  items: OrderItemSummary[]
}

// ---------------------------------------------------------------------------
// Reference Data
// ---------------------------------------------------------------------------

const STAFF_MEMBERS: { id: string; name: string; role: string }[] = []

const QUICK_REASONS = [
  "Customer changed mind / cancelled",
  "Wrong table or duplicated items",
  "Item unavailable in kitchen",
  "Customer walkout / no payment",
  "Payment method error / repunch required",
  "Food quality or preparation dispute",
]

// ---------------------------------------------------------------------------
// Helpers & Visual Styles
// ---------------------------------------------------------------------------

function formatCurrency(value: number) {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

const statusClasses: Record<VoidStatus, string> = {
  pending:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  approved:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
}

const statusLabels: Record<VoidStatus, string> = {
  pending: "Pending Approval",
  approved: "Void Approved",
  rejected: "Void Rejected",
}

const PAGE_SIZE = 8

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function VoidsPage() {
  const [voids, setVoids] = useState<OrderVoidItem[]>([])
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Sheet states
  const [selectedVoid, setSelectedVoid] = useState<OrderVoidItem | null>(null)
  const [createSheetOpen, setCreateSheetOpen] = useState(false)

  // Action Dialog States
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false)
  const [actingStaffId, setActingStaffId] = useState("")
  const [resolutionNotes, setResolutionNotes] = useState("")

  // Create Void Form State
  const [selectedOrderForVoid, setSelectedOrderForVoid] =
    useState<RecentOrderOption | null>(null)
  const [createStaffId, setCreateStaffId] = useState("")
  const [createReason, setCreateReason] = useState("")

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedStatusTab, searchQuery])

  useEffect(() => {
    void loadVoids()
  }, [])

  async function loadVoids() {
    const result = await fetchVoids()
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setVoids(
      result.data.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        orderNumber: item.orderNumber,
        tableNumber: null,
        orderType: "counter",
        orderTotal: item.amount,
        orderSubtotal: item.amount,
        orderDiscount: 0,
        orderTax: 0,
        orderCreatedAt: item.requestedAt,
        items: [],
        requestedByStaffId: "",
        requestedByStaffName: item.requestedBy,
        approvedByStaffId: null,
        approvedByStaffName: null,
        reason: item.reason,
        resolutionNotes: null,
        status: item.status as VoidStatus,
        requestedAt: item.requestedAt,
        resolvedAt: item.resolvedAt,
      }))
    )
  }

  const recentOrders = useMemo<RecentOrderOption[]>(() => {
    return voids.map((item) => ({
      id: item.orderId,
      orderNumber: item.orderNumber,
      tableNumber: item.tableNumber,
      orderType: item.orderType,
      total: item.orderTotal,
      subtotal: item.orderSubtotal,
      discount: item.orderDiscount,
      tax: item.orderTax,
      createdAt: item.orderCreatedAt,
      items: item.items,
    }))
  }, [voids])

  // ---- Summary Metrics ----
  const counts = useMemo(() => {
    const pending = voids.filter((v) => v.status === "pending")
    const approved = voids.filter((v) => v.status === "approved")
    const rejected = voids.filter((v) => v.status === "rejected")

    const pendingTotal = pending.reduce((sum, v) => sum + v.orderTotal, 0)
    const approvedTotal = approved.reduce((sum, v) => sum + v.orderTotal, 0)

    return {
      pendingCount: pending.length,
      pendingTotal,
      approvedCount: approved.length,
      approvedTotal,
      rejectedCount: rejected.length,
      totalCount: voids.length,
    }
  }, [voids])

  // ---- Filtered Voids ----
  const filteredVoids = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return voids.filter((item) => {
      const matchesTab =
        selectedStatusTab === "all" ? true : item.status === selectedStatusTab
      const matchesQuery =
        !q ||
        [
          item.orderNumber,
          item.tableNumber ?? "",
          item.requestedByStaffName,
          item.approvedByStaffName ?? "",
          item.reason,
          item.resolutionNotes ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      return matchesTab && matchesQuery
    })
  }, [voids, selectedStatusTab, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredVoids.length / PAGE_SIZE))
  const paginatedVoids = useMemo(() => {
    return filteredVoids.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    )
  }, [filteredVoids, currentPage])

  // ---- Handlers ----

  function handleOpenCreate() {
    setCreateReason("")
    setSelectedOrderForVoid(recentOrders[0] ?? null)
    setCreateStaffId("")
    setCreateSheetOpen(true)
  }

  async function handleCreateVoid() {
    if (!selectedOrderForVoid || !createReason.trim()) {
      toast.error("Please provide a reason for the void request")
      return
    }
    const result = await createVoidAction({
      orderId: selectedOrderForVoid.id,
      requestedByStaffId: createStaffId,
      reason: createReason.trim(),
    })
    if (!result.success) {
      toast.error(result.error)
      return
    }
    await loadVoids()
    toast.success("Void request submitted", {
      description: `Request for ${selectedOrderForVoid.orderNumber} is pending manager review.`,
    })
    setCreateSheetOpen(false)
  }

  async function handleApproveVoid() {
    if (!selectedVoid) return
    const result = await resolveVoidAction({
      voidId: selectedVoid.id,
      approvedByStaffId: actingStaffId,
      status: "approved",
      resolutionNotes: resolutionNotes.trim() || null,
    })
    if (!result.success) {
      toast.error(result.error)
      return
    }
    await loadVoids()
    setSelectedVoid(null)
    setApprovalDialogOpen(false)
    setResolutionNotes("")
    toast.success("Order void approved", {
      description: `${selectedVoid.orderNumber} has been officially cancelled and voided.`,
    })
  }

  async function handleRejectVoid() {
    if (!selectedVoid) return
    if (!resolutionNotes.trim()) {
      toast.error("Please provide a reason for rejecting the void")
      return
    }
    const result = await resolveVoidAction({
      voidId: selectedVoid.id,
      approvedByStaffId: actingStaffId,
      status: "rejected",
      resolutionNotes: resolutionNotes.trim(),
    })
    if (!result.success) {
      toast.error(result.error)
      return
    }
    await loadVoids()
    setSelectedVoid(null)
    setRejectionDialogOpen(false)
    setResolutionNotes("")
    toast.error("Void request rejected", {
      description: `${selectedVoid.orderNumber} remains active / charged.`,
    })
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden pb-16 sm:pb-8">
      <Toaster richColors position="top-center" />
      <div className="space-y-4 sm:space-y-6">
        {/* ── Page Header ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Void &amp; Cancellation Logs
              </h1>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Review, authorize, and audit order void requests according to BIR
              and store guidelines.
            </p>
          </div>
          <Button
            onClick={handleOpenCreate}
            className="h-11 w-full bg-amber-500 font-semibold text-neutral-950 shadow-sm hover:bg-amber-400 sm:h-10 sm:w-auto"
          >
            <Plus className="mr-2 size-4" />
            Request Void
          </Button>
        </div>

        {/* ── Stats Overview ──────────────────────────────────────────── */}
        <div className="admin-metric-grid">
          {[
            {
              label: "Pending Review",
              value: counts.pendingCount,
              sub: formatCurrency(counts.pendingTotal),
              icon: Clock,
              color: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
            },
            {
              label: "Approved Voids",
              value: counts.approvedCount,
              sub: formatCurrency(counts.approvedTotal),
              icon: CheckCircle2,
              color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
            },
            {
              label: "Rejected Voids",
              value: counts.rejectedCount,
              sub: "Declined requests",
              icon: XCircle,
              color: "text-destructive bg-destructive/10",
            },
            {
              label: "Total Requests",
              value: counts.totalCount,
              sub: "All recorded voids",
              icon: FileX,
              color: "text-sky-600 dark:text-sky-400 bg-sky-500/10",
            },
          ].map((metric) => (
            <Card key={metric.label} className="border bg-card shadow-xs">
              <CardContent className="flex items-center gap-2.5 p-3 sm:p-4">
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-9 ${metric.color}`}
                >
                  <metric.icon className="size-4 sm:size-4.5" />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-[11px] font-medium text-muted-foreground">
                    {metric.label}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-bold sm:text-lg">
                      {metric.value}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      ({metric.sub})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Main Content Card ───────────────────────────────────────── */}
        <Card className="border bg-card shadow-xs">
          <CardHeader className="gap-4 p-4 pb-3 sm:p-6 sm:pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold sm:text-lg">
                  Void Audit Trail
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  All requests track who requested, who authorized, and the
                  mandatory reason.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search order #, staff, reason…"
                  className="h-10 pr-9 pl-9 text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute top-2.5 right-2.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="w-full [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden">
              <Tabs
                value={selectedStatusTab}
                onValueChange={setSelectedStatusTab}
              >
                <TabsList className="inline-flex h-10 w-max justify-start rounded-lg bg-muted p-1">
                  <TabsTrigger
                    value="all"
                    className="px-3.5 text-xs font-medium sm:px-4"
                  >
                    All Voids ({voids.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="pending"
                    className="px-3.5 text-xs font-medium sm:px-4"
                  >
                    Pending Review
                    {counts.pendingCount > 0 && (
                      <span className="py-0.2 ml-1.5 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-neutral-950">
                        {counts.pendingCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="approved"
                    className="px-3.5 text-xs font-medium sm:px-4"
                  >
                    Approved ({counts.approvedCount})
                  </TabsTrigger>
                  <TabsTrigger
                    value="rejected"
                    className="px-3.5 text-xs font-medium sm:px-4"
                  >
                    Rejected ({counts.rejectedCount})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredVoids.length ? (
              <div className="divide-y">
                {paginatedVoids.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="flex min-w-0 items-start gap-3 sm:items-center">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        <FileX className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold sm:text-base">
                            {item.orderNumber}
                          </p>
                          {item.tableNumber && (
                            <Badge variant="outline" className="text-[10px]">
                              {item.tableNumber}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${statusClasses[item.status]}`}
                          >
                            {statusLabels[item.status]}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs font-medium text-foreground/80">
                          Reason:{" "}
                          <span className="font-normal text-muted-foreground">
                            {item.reason}
                          </span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          Requested by {item.requestedByStaffName} ·{" "}
                          {formatDateTime(item.requestedAt)}
                          {item.resolvedAt && item.approvedByStaffName && (
                            <span>
                              {" "}
                              ·{" "}
                              {item.status === "approved"
                                ? "Approved"
                                : "Rejected"}{" "}
                              by {item.approvedByStaffName}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-bold text-foreground">
                          {formatCurrency(item.orderTotal)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.items.length}{" "}
                          {item.items.length === 1 ? "item" : "items"}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setSelectedVoid(item)}
                        aria-label={`View details of void for ${item.orderNumber}`}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <FileX className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                No void requests match this view.
              </div>
            )}
          </CardContent>

          {/* Pagination Controls */}
          {filteredVoids.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6">
              <p className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filteredVoids.length)} of{" "}
                {filteredVoids.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="px-2 text-xs font-medium">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ================================================================ */}
      {/* VOID DETAILS SHEET                                               */}
      {/* ================================================================ */}
      <Sheet
        open={Boolean(selectedVoid)}
        onOpenChange={(open) => !open && setSelectedVoid(null)}
      >
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          {selectedVoid && (
            <>
              <SheetHeader className="border-b p-4 text-left sm:p-6">
                <div className="flex items-start justify-between gap-3 pr-6">
                  <div>
                    <SheetTitle className="text-base font-bold sm:text-lg">
                      Void Details
                    </SheetTitle>
                    <SheetDescription className="text-xs sm:text-sm">
                      {selectedVoid.orderNumber} ·{" "}
                      {selectedVoid.tableNumber ?? "Counter"}
                    </SheetDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={statusClasses[selectedVoid.status]}
                  >
                    {statusLabels[selectedVoid.status]}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm sm:p-6">
                {/* Order Summary Box */}
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    <span>Itemized Order</span>
                    <span>
                      Total: {formatCurrency(selectedVoid.orderTotal)}
                    </span>
                  </div>
                  <div className="divide-y divide-border/60">
                    {selectedVoid.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between py-1.5 text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-foreground">
                            {item.quantity}x {item.name}
                          </p>
                          {item.notes && (
                            <p className="text-[11px] text-muted-foreground italic">
                              "{item.notes}"
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 font-semibold">
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit Fields */}
                <div className="space-y-2.5">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Void Reason
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {selectedVoid.reason}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border p-2.5">
                      <p className="text-muted-foreground">Requested by</p>
                      <p className="mt-0.5 font-semibold">
                        {selectedVoid.requestedByStaffName}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatDateTime(selectedVoid.requestedAt)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-2.5">
                      <p className="text-muted-foreground">Authorized by</p>
                      <p className="mt-0.5 font-semibold">
                        {selectedVoid.approvedByStaffName ?? "Pending"}
                      </p>
                      {selectedVoid.resolvedAt && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {formatDateTime(selectedVoid.resolvedAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedVoid.resolutionNotes && (
                    <div className="rounded-lg border bg-muted/20 p-3 text-xs">
                      <p className="font-medium text-muted-foreground">
                        Management Notes
                      </p>
                      <p className="mt-1 font-medium">
                        {selectedVoid.resolutionNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <SheetFooter className="flex-col gap-2 border-t bg-background p-4 sm:p-6">
                {selectedVoid.status === "pending" ? (
                  <div className="grid w-full grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setResolutionNotes("")
                        setRejectionDialogOpen(true)
                      }}
                    >
                      <ThumbsDown className="mr-2 size-4" />
                      Reject Void
                    </Button>
                    <Button
                      className="bg-emerald-600 font-semibold text-white hover:bg-emerald-500"
                      onClick={() => {
                        setResolutionNotes("")
                        setApprovalDialogOpen(true)
                      }}
                    >
                      <ThumbsUp className="mr-2 size-4" />
                      Approve Void
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectedVoid(null)}
                  >
                    Close
                  </Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ================================================================ */}
      {/* REQUEST VOID SHEET                                               */}
      {/* ================================================================ */}
      <Sheet open={createSheetOpen} onOpenChange={setCreateSheetOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetHeader className="border-b p-4 text-left sm:p-6">
            <SheetTitle className="text-base font-bold sm:text-lg">
              New Void Request
            </SheetTitle>
            <SheetDescription className="text-xs sm:text-sm">
              Submit an order cancellation request for supervisor / manager
              authorization.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {/* Select Order */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">
                Select Target Order
              </Label>
              <Select
                value={selectedOrderForVoid?.id ?? ""}
                onValueChange={(val) => {
                  const ord = recentOrders.find((o) => o.id === val)
                  if (ord) setSelectedOrderForVoid(ord)
                }}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recentOrders.map((ord) => (
                    <SelectItem key={ord.id} value={ord.id}>
                      {ord.orderNumber} — {ord.tableNumber ?? "Counter"} (
                      {formatCurrency(ord.total)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Order Summary Preview */}
            <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3 text-xs">
              <div className="flex justify-between font-semibold">
                <span>Order Total:</span>
                <span className="font-bold text-amber-600">
                  {formatCurrency(selectedOrderForVoid?.total ?? 0)}
                </span>
              </div>
              <p className="text-muted-foreground">
                Placed at{" "}
                {selectedOrderForVoid
                  ? formatDateTime(selectedOrderForVoid.createdAt)
                  : "—"}
              </p>
              <div className="divide-y divide-border/40 pt-1">
                {(selectedOrderForVoid?.items ?? []).map((it, i) => (
                  <div
                    key={i}
                    className="flex justify-between py-1 text-muted-foreground"
                  >
                    <span>
                      {it.quantity}x {it.name}
                    </span>
                    <span>{formatCurrency(it.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Requesting Staff Member */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">
                Requested by Staff
              </Label>
              <Select
                value={createStaffId}
                onValueChange={(value) => setCreateStaffId(value ?? "")}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_MEMBERS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Common Reasons Quick Chips */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Common Void Reasons
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setCreateReason(r)}
                    className="rounded-md border bg-muted/40 px-2 py-1 text-left text-[11px] text-muted-foreground transition hover:border-amber-400 hover:text-foreground"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason Textarea */}
            <div className="grid gap-1.5">
              <Label
                htmlFor="void-reason-input"
                className="text-xs font-semibold"
              >
                Explanation &amp; Justification{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="void-reason-input"
                value={createReason}
                onChange={(e) => setCreateReason(e.target.value)}
                placeholder="State clearly why this order is being voided..."
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </div>

          <SheetFooter className="flex-row border-t bg-background p-4 sm:p-6">
            <Button
              variant="outline"
              onClick={() => setCreateSheetOpen(false)}
              className="flex-1 border-amber-500 text-amber-700 hover:bg-amber-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateVoid}
              className="flex-1 bg-amber-500 font-semibold text-neutral-950 hover:bg-amber-400"
            >
              Submit Request
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ================================================================ */}
      {/* APPROVE VOID DIALOG                                              */}
      {/* ================================================================ */}
      <AlertDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
      >
        <AlertDialogContent className="w-[92vw] max-w-md rounded-xl sm:rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="size-5" />
              Approve Order Void
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              You are authorizing the cancellation of{" "}
              <strong>{selectedVoid?.orderNumber}</strong> (
              {formatCurrency(selectedVoid?.orderTotal ?? 0)}). This action will
              adjust the sales register accordingly.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">
                Authorizing Manager / Owner
              </Label>
              <Select
                value={actingStaffId}
                onValueChange={(value) => setActingStaffId(value ?? "")}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_MEMBERS.filter(
                    (s) => s.role === "Manager" || s.role === "Owner"
                  ).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="approve-note" className="text-xs font-semibold">
                Authorization Remarks{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="approve-note"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g. Verified kitchen status. Cancelled."
                className="h-10 text-sm"
              />
            </div>
          </div>

          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <AlertDialogCancel className="mt-0 w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveVoid}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-500 sm:w-auto"
            >
              Confirm Authorization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ================================================================ */}
      {/* REJECT VOID DIALOG                                               */}
      {/* ================================================================ */}
      <AlertDialog
        open={rejectionDialogOpen}
        onOpenChange={setRejectionDialogOpen}
      >
        <AlertDialogContent className="w-[92vw] max-w-md rounded-xl sm:rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="size-5" />
              Reject Void Request
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              The order <strong>{selectedVoid?.orderNumber}</strong> will remain
              valid and charged. Please supply a reason for declining.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">
                Deciding Manager / Owner
              </Label>
              <Select
                value={actingStaffId}
                onValueChange={(value) => setActingStaffId(value ?? "")}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_MEMBERS.filter(
                    (s) => s.role === "Manager" || s.role === "Owner"
                  ).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="reject-note" className="text-xs font-semibold">
                Reason for Rejection <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reject-note"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g. Food already prepared and served to customer"
                className="h-10 text-sm"
              />
            </div>
          </div>

          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <AlertDialogCancel className="mt-0 w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectVoid}
              className="text-destructive-foreground w-full bg-destructive hover:bg-destructive/90 sm:w-auto"
            >
              Reject Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
