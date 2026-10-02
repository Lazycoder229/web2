"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { AdminDeleteDialog } from "@/components/admin-delete-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Toaster } from "@/components/ui/sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  createReservationAction,
  deleteReservationAction,
  fetchReservations,
  fetchReservationTables,
  updateReservationAction,
} from "@/lib/api/reservations"

// ---------------------------------------------------------------------------
// Types — mirrors `reservations` table in the DB design
// ---------------------------------------------------------------------------

type ReservationStatus =
  "pending" | "confirmed" | "cancelled" | "completed" | "no_show"

interface Reservation {
  id: string
  customerId: string | null
  customerName: string
  contactNumber: string
  email: string | null
  tableId: string | null
  table: string | null
  reservationDate: string // ISO date string
  reservationTime: string // HH:MM
  numberOfGuests: number
  status: ReservationStatus
  notes: string | null
  createdByStaffId: string | null
}

type ReservationForm = Omit<Reservation, "id">

type CustomerOption = {
  id: string
  label: string
}

type TableOption = {
  id: string
  label: string // "Table 5"
  tableNumber: string // "5" — matches what the DB returns in res.table
  capacity: number
}

type StaffOption = {
  id: string
  label: string
}

const today = new Date()
const fmt = (d: Date) => d.toISOString().split("T")[0]
const addDays = (d: Date, n: number) => {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const statusLabels: Record<ReservationStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "No Show",
}

const statusClasses: Record<ReservationStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  confirmed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  completed: "bg-muted text-muted-foreground border-border",
  no_show: "bg-sky-500/10 text-sky-700 border-sky-500/20",
}

const allStatuses: ReservationStatus[] = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]

const tabs = [
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Today" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled / No-show" },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`
}

const todayStr = fmt(today)

const emptyForm: ReservationForm = {
  customerId: null,
  customerName: "",
  contactNumber: "",
  email: null,
  tableId: null,
  table: null,
  reservationDate: fmt(addDays(today, 1)),
  reservationTime: "18:00",
  numberOfGuests: 2,
  status: "pending",
  notes: null,
  createdByStaffId: null,
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [tables, setTables] = useState<TableOption[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [activeTab, setActiveTab] = useState("upcoming")
  const [search, setSearch] = useState("")
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ReservationForm>(emptyForm)
  const [page, setPage] = useState(1)
  const pageSize = 8

  // ---------------------------------------------------------------------------
  // Load data from server
  // ---------------------------------------------------------------------------

  const loadReservations = useCallback(async () => {
    setLoading(true)
    try {
      const [res, tableResult] = await Promise.all([
        fetchReservations(),
        fetchReservationTables(),
      ])
      if (res.success) {
        setReservations(
          (res.data as any[]).map((row) => {
            const rawStatus = String(row.status ?? "pending")
              .trim()
              .toLowerCase()
              .replace(/[\s-]+/g, "_")
            return {
              ...row,
              status: (rawStatus === "complete"
                ? "completed"
                : rawStatus) as ReservationStatus,
              reservationDate: String(row.reservationDate ?? "").slice(0, 10),
            }
          })
        )

        // Map raw DB rows into dropdown-friendly options
        setCustomers(
          (res.customers as any[]).map((c) => ({
            id: c.id,
            label: c.name ?? c.id,
          }))
        )
        const tableRows = (tableResult as any[]).length
          ? tableResult
          : (res.tables as any[])
        setTables(
          tableRows.map((t: any) => ({
            id: t.id,
            label: `Table ${t.tableNumber}`,
            tableNumber: String(t.tableNumber),
            capacity: t.capacity,
          }))
        )
        setStaff(
          (res.staff as any[]).map((s) => ({
            id: s.id,
            label: s.name ?? s.id,
          }))
        )
      } else {
        toast.error("Failed to load reservations", {
          description: (res as any).error,
        })
      }
    } catch (err: any) {
      toast.error("Failed to load reservations", { description: err.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReservations()
  }, [loadReservations])

  // ---------------------------------------------------------------------------
  // Filtering + pagination
  // ---------------------------------------------------------------------------

  const filteredReservations = useMemo(() => {
    const query = search.trim().toLowerCase()
    return reservations.filter((res) => {
      const matchesSearch =
        !query ||
        [res.customerName, res.contactNumber, res.email ?? "", res.table ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query)

      const matchesTab =
        activeTab === "upcoming"
          ? res.reservationDate >= todayStr &&
            !["cancelled", "completed", "no_show"].includes(res.status)
          : activeTab === "today"
            ? res.reservationDate === todayStr &&
              !["cancelled", "completed", "no_show"].includes(res.status)
            : activeTab === "past"
              ? res.status === "completed" ||
                (res.reservationDate < todayStr &&
                  !["cancelled", "no_show"].includes(res.status))
              : ["cancelled", "no_show"].includes(res.status)

      return matchesSearch && matchesTab
    })
  }, [reservations, activeTab, search])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReservations.length / pageSize)
  )
  const paginatedReservations = useMemo(
    () => filteredReservations.slice((page - 1) * pageSize, page * pageSize),
    [filteredReservations, page]
  )

  useEffect(() => {
    setPage(1)
  }, [activeTab, search])

  const counts = useMemo(
    () => ({
      upcoming: reservations.filter(
        (r) =>
          r.reservationDate >= todayStr &&
          !["cancelled", "completed", "no_show"].includes(r.status)
      ).length,
      today: reservations.filter(
        (r) =>
          r.reservationDate === todayStr &&
          !["cancelled", "completed", "no_show"].includes(r.status)
      ).length,
      pending: reservations.filter((r) => r.status === "pending").length,
      totalGuests: reservations
        .filter(
          (r) =>
            r.reservationDate >= todayStr &&
            !["cancelled", "completed", "no_show"].includes(r.status)
        )
        .reduce((sum, r) => sum + r.numberOfGuests, 0),
    }),
    [reservations]
  )

  // ---------------------------------------------------------------------------
  // Sheet open / close helpers
  // ---------------------------------------------------------------------------

  function openCreateSheet() {
    setSelectedReservation(null)
    setEditingId(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEditSheet(reservation: Reservation) {
    setSelectedReservation(null)
    setEditingId(reservation.id)
    setForm({
      customerId: reservation.customerId,
      customerName: reservation.customerName,
      contactNumber: reservation.contactNumber,
      email: reservation.email,
      tableId: reservation.tableId,
      table: reservation.table,
      reservationDate: reservation.reservationDate,
      reservationTime: reservation.reservationTime,
      numberOfGuests: reservation.numberOfGuests,
      status: reservation.status,
      notes: reservation.notes,
      createdByStaffId: reservation.createdByStaffId,
    })
    setSheetOpen(true)
  }

  // ---------------------------------------------------------------------------
  // CRUD actions
  // ---------------------------------------------------------------------------

  async function saveReservation() {
    if (!form.customerName.trim()) {
      toast.error("Customer name is required")
      return
    }
    if (!form.contactNumber.trim()) {
      toast.error("Contact number is required")
      return
    }
    if (!form.reservationDate) {
      toast.error("Reservation date is required")
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        const result = await updateReservationAction({
          id: editingId,
          ...form,
        })
        if (!result.success) {
          toast.error("Failed to update reservation", {
            description: result.error,
          })
          return
        }
        toast.success("Reservation updated", {
          description: `${form.customerName}'s booking was saved.`,
        })
      } else {
        const result = await createReservationAction(form)
        if (!result.success) {
          toast.error("Failed to create reservation", {
            description: result.error,
          })
          return
        }
        toast.success("Reservation created", {
          description: `${form.customerName} is booked for ${formatDate(form.reservationDate)} at ${formatTime(form.reservationTime)}.`,
        })
      }
      setSheetOpen(false)
      await loadReservations()
    } catch (err: any) {
      toast.error("Something went wrong", { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(
    reservation: Reservation,
    status: ReservationStatus
  ) {
    try {
      const result = await updateReservationAction({
        id: reservation.id,
        status,
      })
      if (!result.success) {
        toast.error("Failed to update status", { description: result.error })
        return
      }
      toast.success(
        `${reservation.customerName} marked ${statusLabels[status].toLowerCase()}`
      )
      await loadReservations()
      // Keep the detail sheet in sync
      setSelectedReservation((current) =>
        current?.id === reservation.id ? { ...current, status } : current
      )
    } catch (err: any) {
      toast.error("Something went wrong", { description: err.message })
    }
  }

  async function deleteReservation(reservation: Reservation) {
    try {
      const result = await deleteReservationAction(reservation.id)
      if (!result.success) {
        toast.error("Failed to delete reservation", {
          description: result.error,
        })
        return
      }
      setSelectedReservation(null)
      toast.success("Reservation deleted", {
        description: `${reservation.customerName}'s booking was removed.`,
      })
      await loadReservations()
    } catch (err: any) {
      toast.error("Something went wrong", { description: err.message })
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="w-full min-w-0 overflow-x-hidden pb-16 sm:pb-8">
      <Toaster richColors position="top-center" />
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Reservations
              </h1>
              <Badge variant="secondary" className="rounded-full">
                {filteredReservations.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Manage table bookings and guest reservations.
            </p>
          </div>
          <Button
            onClick={openCreateSheet}
            className="h-11 w-full bg-amber-500 font-semibold text-neutral-950 shadow-sm hover:bg-amber-400 sm:h-10 sm:w-auto"
          >
            <Plus className="mr-2 size-4" />
            New reservation
          </Button>
        </div>

        {/* Stats */}
        <div className="admin-metric-grid">
          {[
            {
              label: "Upcoming bookings",
              value: counts.upcoming,
              icon: CalendarDays,
            },
            { label: "Today's reservations", value: counts.today, icon: Clock },
            {
              label: "Awaiting confirmation",
              value: counts.pending,
              icon: UserRound,
            },
            {
              label: "Expected guests",
              value: counts.totalGuests,
              icon: Users,
            },
          ].map((metric) => (
            <Card key={metric.label} className="border bg-card shadow-xs">
              <CardContent className="flex items-center gap-2 p-2.5 sm:p-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <metric.icon className="size-3.5" />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-[10px] font-medium text-muted-foreground">
                    {metric.label}
                  </p>
                  {loading ? (
                    <Skeleton className="h-5 w-12" />
                  ) : (
                    <p className="truncate text-sm font-bold sm:text-base">
                      {metric.value}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table card */}
        <Card className="border bg-card shadow-xs">
          <CardHeader className="gap-4 p-4 pb-3 sm:p-6 sm:pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base font-bold sm:text-lg">
                Booking list
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, contact…"
                  className="h-10 pr-9 pl-9 text-sm"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                    className="absolute top-2.5 right-2.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="w-full [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="inline-flex h-10 w-max justify-start rounded-lg bg-muted p-1">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="px-3 text-xs font-medium sm:px-4"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <div className="hidden grid-cols-[minmax(0,1fr)_120px_300px] border-y bg-muted/30 px-4 py-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase sm:grid sm:px-6">
            <span>Guest &amp; booking</span>
            <span>Status</span>
            <span className="text-center">Actions</span>
          </div>

          <CardContent className="p-0">
            {loading ? (
              <div className="divide-y">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 p-4 sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Skeleton className="size-10 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </div>
                ))}
              </div>
            ) : filteredReservations.length ? (
              <div className="divide-y">
                {paginatedReservations.map((res) => (
                  <div
                    key={res.id}
                    className="grid gap-3 p-4 transition-colors hover:bg-muted/30 sm:grid-cols-[minmax(0,1fr)_120px_300px] sm:items-center sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        <UserRound className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{res.customerName}</p>
                          {res.table && (
                            <Badge variant="outline" className="text-[10px]">
                              {res.table}
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDate(res.reservationDate)} ·{" "}
                          {formatTime(res.reservationTime)} ·{" "}
                          {res.numberOfGuests} guests
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:justify-self-start">
                      <p className="text-xs text-muted-foreground sm:hidden">
                        {res.contactNumber}
                      </p>
                      <Badge
                        variant="outline"
                        className={`min-w-24 justify-center text-[11px] ${statusClasses[res.status]}`}
                      >
                        {statusLabels[res.status]}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 sm:justify-self-end">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => setSelectedReservation(res)}
                            aria-label="View reservation"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View reservation</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => openEditSheet(res)}
                            aria-label="Edit reservation"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit reservation</TooltipContent>
                      </Tooltip>
                      <AdminDeleteDialog
                        title={`Delete ${res.customerName}'s booking?`}
                        description="This reservation will be permanently removed. The guest will not be notified automatically."
                        onConfirm={() => deleteReservation(res)}
                      >
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          aria-label="Delete reservation"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </AdminDeleteDialog>
                      {res.status === "pending" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon-sm"
                              onClick={() =>
                                void updateStatus(res, "confirmed")
                              }
                              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                              aria-label="Confirm booking"
                            >
                              <Check className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Confirm booking</TooltipContent>
                        </Tooltip>
                      )}
                      {res.status === "confirmed" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon-sm"
                              onClick={() =>
                                void updateStatus(res, "completed")
                              }
                              className="bg-emerald-600 text-white hover:bg-emerald-700"
                              aria-label="Mark completed"
                            >
                              <Check className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mark completed</TooltipContent>
                        </Tooltip>
                      )}
                      {["pending", "confirmed"].includes(res.status) && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon-sm"
                                className="text-sky-700 hover:text-sky-700"
                                onClick={() =>
                                  void updateStatus(res, "no_show")
                                }
                                aria-label="Mark no show"
                              >
                                <UserRound className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Mark no show</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon-sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() =>
                                  void updateStatus(res, "cancelled")
                                }
                                aria-label="Cancel reservation"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cancel reservation</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-sm text-muted-foreground">
                No reservations match this view.
              </div>
            )}
          </CardContent>

          {!loading && filteredReservations.length > pageSize && (
            <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, filteredReservations.length)} of{" "}
                {filteredReservations.length}
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
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CREATE / EDIT SHEET                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetHeader className="border-b p-4 text-left sm:p-6">
            <SheetTitle>
              {editingId ? "Edit reservation" : "New reservation"}
            </SheetTitle>
            <SheetDescription>
              {editingId
                ? "Update the booking details below."
                : "Fill in the guest details to create a new booking."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 overflow-y-auto p-4 sm:p-6">
            {/* Guest info */}
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Guest info
              </p>

              <div className="grid gap-1.5">
                <Label htmlFor="customer-select">Existing customer</Label>
                <Select
                  value={form.customerId ?? "none"}
                  onValueChange={(value) => {
                    const customer = customers.find((c) => c.id === value)
                    setForm((current) => ({
                      ...current,
                      customerId: value === "none" ? null : value,
                      customerName:
                        value === "none"
                          ? current.customerName
                          : (customer?.label ?? current.customerName),
                    }))
                  }}
                >
                  <SelectTrigger
                    id="customer-select"
                    className="h-11 w-full sm:h-10"
                  >
                    <SelectValue placeholder="Walk-in / New guest" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Walk-in / New guest</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="customer-name">Guest name</Label>
                <Input
                  id="customer-name"
                  value={form.customerName}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      customerName: e.target.value,
                    }))
                  }
                  placeholder="e.g. Santos family"
                  className="h-11 sm:h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="contact-number">Contact number</Label>
                  <Input
                    id="contact-number"
                    value={form.contactNumber}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        contactNumber: e.target.value,
                      }))
                    }
                    placeholder="09XXXXXXXXX"
                    className="h-11 sm:h-10"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        email: e.target.value || null,
                      }))
                    }
                    placeholder="guest@email.com"
                    className="h-11 sm:h-10"
                  />
                </div>
              </div>
            </div>

            {/* Booking details */}
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Booking details
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="res-date">Date</Label>
                  <Input
                    id="res-date"
                    type="date"
                    value={form.reservationDate}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        reservationDate: e.target.value,
                      }))
                    }
                    className="h-11 sm:h-10"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="res-time">Time</Label>
                  <Input
                    id="res-time"
                    type="time"
                    value={form.reservationTime}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        reservationTime: e.target.value,
                      }))
                    }
                    className="h-11 sm:h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="guests">Number of guests</Label>
                  <Input
                    id="guests"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={form.numberOfGuests}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        numberOfGuests: Number(e.target.value) || 1,
                      }))
                    }
                    className="h-11 sm:h-10"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Table (optional)</Label>
                  <Select
                    value={form.tableId ?? "none"}
                    onValueChange={(value) => {
                      const tableItem = tables.find((t) => t.id === value)
                      setForm((current) => ({
                        ...current,
                        tableId: value === "none" ? null : value,
                        table:
                          value === "none"
                            ? null
                            : (tableItem?.tableNumber ?? null),
                      }))
                    }}
                  >
                    <SelectTrigger className="h-11 w-full sm:h-10">
                      <SelectValue placeholder="Assign later">
                        {form.tableId
                          ? (tables.find((t) => t.id === form.tableId)?.label ??
                            `Table ${form.table}`)
                          : "Assign later"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Assign later</SelectItem>
                      {tables.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label} · {t.capacity} seats
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        status: value as ReservationStatus,
                      }))
                    }
                  >
                    <SelectTrigger className="h-11 w-full sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {statusLabels[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Staff</Label>
                  <Select
                    value={form.createdByStaffId ?? "none"}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        createdByStaffId: value === "none" ? null : value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-11 w-full sm:h-10">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={form.notes ?? ""}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      notes: e.target.value || null,
                    }))
                  }
                  placeholder="Special requests, seating preferences…"
                  className="resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <SheetFooter className="flex-row border-t bg-background p-4 sm:p-6">
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={saving}
              className="flex-1 border-amber-500 text-amber-700 hover:bg-amber-50"
            >
              Cancel
            </Button>
            <Button
              onClick={saveReservation}
              disabled={saving}
              className="flex-1 bg-amber-500 font-semibold text-neutral-950 hover:bg-amber-400"
            >
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {editingId ? "Save changes" : "Create booking"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ------------------------------------------------------------------ */}
      {/* VIEW DETAIL SHEET                                                   */}
      {/* ------------------------------------------------------------------ */}
      <Sheet
        open={Boolean(selectedReservation)}
        onOpenChange={(open) => !open && setSelectedReservation(null)}
      >
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          {selectedReservation && (
            <>
              <SheetHeader className="border-b p-4 text-left sm:p-6">
                <div className="flex items-start justify-between gap-4 pr-8">
                  <div>
                    <SheetTitle>{selectedReservation.customerName}</SheetTitle>
                    <SheetDescription>
                      {selectedReservation.contactNumber}
                      {selectedReservation.email
                        ? ` · ${selectedReservation.email}`
                        : ""}
                    </SheetDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={statusClasses[selectedReservation.status]}
                  >
                    {statusLabels[selectedReservation.status]}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
                {/* Booking info */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Booking details
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="mt-1 text-sm font-medium">
                        {formatDate(selectedReservation.reservationDate)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="mt-1 text-sm font-medium">
                        {formatTime(selectedReservation.reservationTime)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Guests</p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedReservation.numberOfGuests}{" "}
                        {selectedReservation.numberOfGuests === 1
                          ? "person"
                          : "people"}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Table</p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedReservation.table ?? "Not assigned"}
                      </p>
                    </div>
                  </div>
                  {selectedReservation.notes && (
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Notes</p>
                      <p className="mt-1 text-sm">
                        {selectedReservation.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <SheetFooter className="flex-col gap-2 border-t bg-background p-4 sm:p-6">
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      openEditSheet(selectedReservation)
                      setSelectedReservation(null)
                    }}
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-[90vw] max-w-md rounded-xl sm:rounded-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete {selectedReservation.customerName}&apos;s
                          booking?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs sm:text-sm">
                          This permanently removes the reservation record. The
                          guest will not be notified automatically.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
                        <AlertDialogCancel className="mt-0 w-full sm:w-auto">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteReservation(selectedReservation)}
                          className="text-destructive-foreground w-full bg-destructive hover:bg-destructive/90 sm:w-auto"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Status actions */}
                {selectedReservation.status === "pending" && (
                  <Button
                    onClick={() =>
                      updateStatus(selectedReservation, "confirmed")
                    }
                    className="w-full bg-amber-500 font-semibold text-neutral-950 hover:bg-amber-400"
                  >
                    <Check className="mr-2 size-4" />
                    Confirm booking
                  </Button>
                )}
                {selectedReservation.status === "confirmed" && (
                  <Button
                    onClick={() =>
                      updateStatus(selectedReservation, "completed")
                    }
                    className="w-full bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                  >
                    <Check className="mr-2 size-4" />
                    Mark completed
                  </Button>
                )}
                {["pending", "confirmed"].includes(
                  selectedReservation.status
                ) && (
                  <div className="grid w-full grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        updateStatus(selectedReservation, "no_show")
                      }
                      className="text-sky-700 hover:text-sky-700"
                    >
                      No show
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        updateStatus(selectedReservation, "cancelled")
                      }
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-2 size-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
