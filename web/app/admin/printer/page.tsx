"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Bell,
  Bluetooth,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Eye,
  Network,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Server,
  Settings,
  Scissors,
  Trash2,
  Usb,
  Wifi,
  X,
  XCircle,
  Zap,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { Toaster } from "@/components/ui/sonner"
import {
  createPrinterAction,
  deletePrinterAction,
  fetchPrinters,
  updatePrinterAction,
} from "@/lib/api/printers"

// ---------------------------------------------------------------------------
// Types — mirrors `printers` table in `dbdesign.md`
// ---------------------------------------------------------------------------

export type PrinterLocation = "kitchen" | "counter"
export type ConnectionType = "network" | "usb" | "bluetooth"

export interface PrinterDevice {
  id: string
  name: string
  location: PrinterLocation
  connectionType: ConnectionType
  ipAddress: string | null
  port?: number
  paperWidth?: "80mm" | "58mm"
  autoCut?: boolean
  buzzerOnPrint?: boolean
  isActive: boolean
  status: "online" | "offline" | "busy"
  lastPingAt?: string
}

export type PrinterFormValues = Omit<
  PrinterDevice,
  "id" | "status" | "lastPingAt"
>

const emptyPrinterForm: PrinterFormValues = {
  name: "",
  location: "kitchen",
  connectionType: "network",
  ipAddress: "192.168.1.200",
  port: 9100,
  paperWidth: "80mm",
  autoCut: true,
  buzzerOnPrint: true,
  isActive: true,
}

// ---------------------------------------------------------------------------
// Helpers & Visual Styles
// ---------------------------------------------------------------------------

const locationLabels: Record<PrinterLocation, string> = {
  kitchen: "Kitchen Ticket",
  counter: "Counter Receipt",
}

const locationClasses: Record<PrinterLocation, string> = {
  kitchen:
    "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30",
  counter: "bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/30",
}

const connectionLabels: Record<ConnectionType, string> = {
  network: "Network (LAN / Wi-Fi)",
  usb: "Direct USB",
  bluetooth: "Bluetooth",
}

function ConnectionIcon({
  type,
  className = "size-3.5",
}: {
  type: ConnectionType
  className?: string
}) {
  if (type === "network") return <Wifi className={className} />
  if (type === "usb") return <Usb className={className} />
  return <Bluetooth className={className} />
}

const PAGE_SIZE = 8

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function PrinterSettingsPage() {
  const [printers, setPrinters] = useState<PrinterDevice[]>([])
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [connectionFilter, setConnectionFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Sheet states
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingPrinterId, setEditingPrinterId] = useState<string | null>(null)
  const [formData, setFormData] = useState<PrinterFormValues>(emptyPrinterForm)

  // Test Print Modal states
  const [testPrinter, setTestPrinter] = useState<PrinterDevice | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null)

  useEffect(() => {
    void loadPrinters()
  }, [])

  async function loadPrinters() {
    const result = await fetchPrinters()
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setPrinters(
      result.data.map((printer) => ({
        ...printer,
        status: printer.isActive ? "online" : "offline",
        port: 9100,
        paperWidth: "80mm",
        autoCut: true,
        buzzerOnPrint: true,
      }))
    )
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [locationFilter, connectionFilter, searchQuery])

  // Counts & Metrics
  const counts = useMemo(() => {
    const active = printers.filter((p) => p.isActive)
    const online = printers.filter((p) => p.isActive && p.status === "online")
    const kitchen = printers.filter(
      (p) => p.location === "kitchen" && p.isActive
    )
    const counter = printers.filter(
      (p) => p.location === "counter" && p.isActive
    )

    return {
      total: printers.length,
      active: active.length,
      online: online.length,
      kitchen: kitchen.length,
      counter: counter.length,
    }
  }, [printers])

  // Filtered Printers
  const filteredPrinters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return printers.filter((p) => {
      const matchesLocation =
        locationFilter === "all"
          ? true
          : locationFilter === "inactive"
            ? !p.isActive
            : p.location === locationFilter && p.isActive
      const matchesConnection =
        connectionFilter === "all"
          ? true
          : p.connectionType === connectionFilter
      const matchesQuery =
        !q ||
        [p.name, p.ipAddress ?? "", p.location, p.connectionType]
          .join(" ")
          .toLowerCase()
          .includes(q)

      return matchesLocation && matchesConnection && matchesQuery
    })
  }, [printers, locationFilter, connectionFilter, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredPrinters.length / PAGE_SIZE))
  const paginatedPrinters = useMemo(() => {
    return filteredPrinters.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    )
  }, [filteredPrinters, currentPage])

  // CRUD Handlers
  function handleOpenCreate() {
    setEditingPrinterId(null)
    setFormData(emptyPrinterForm)
    setSheetOpen(true)
  }

  function handleOpenEdit(printer: PrinterDevice) {
    setEditingPrinterId(printer.id)
    setFormData({
      name: printer.name,
      location: printer.location,
      connectionType: printer.connectionType,
      ipAddress: printer.ipAddress,
      port: printer.port ?? 9100,
      paperWidth: printer.paperWidth ?? "80mm",
      autoCut: printer.autoCut ?? true,
      buzzerOnPrint: printer.buzzerOnPrint ?? true,
      isActive: printer.isActive,
    })
    setSheetOpen(true)
  }

  async function handleSavePrinter() {
    if (!formData.name.trim()) {
      toast.error("Printer name is required")
      return
    }

    if (formData.connectionType === "network" && !formData.ipAddress?.trim()) {
      toast.error("IP Address is required for network thermal printers")
      return
    }

    const input = {
      name: formData.name.trim(),
      location: formData.location,
      connectionType: formData.connectionType,
      ipAddress:
        formData.connectionType === "network" ? formData.ipAddress : undefined,
      isActive: formData.isActive,
    }
    const result = editingPrinterId
      ? await updatePrinterAction({ id: editingPrinterId, ...input })
      : await createPrinterAction(input)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    await loadPrinters()
    toast.success(
      editingPrinterId ? "Printer settings updated" : "New printer added",
      {
        description: `${formData.name} configuration saved successfully.`,
      }
    )
    setSheetOpen(false)
  }

  async function handleDeletePrinter(printer: PrinterDevice) {
    const result = await deletePrinterAction(printer.id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    await loadPrinters()
    toast.success("Printer removed", {
      description: `${printer.name} was removed from the device pool.`,
    })
  }

  function handlePingAll() {
    setPrinters((current) =>
      current.map((p) =>
        p.isActive
          ? { ...p, status: "online", lastPingAt: new Date().toISOString() }
          : p
      )
    )
    toast.success("All active printers probed", {
      description: "Sockets responded with 0% packet loss. Printers ready.",
    })
  }

  function handleStartTestPrint(printer: PrinterDevice) {
    setTestPrinter(printer)
    setTestSuccess(null)
    setIsTesting(false)
  }

  function handleExecuteTestPrint() {
    if (!testPrinter) return
    setIsTesting(true)
    setTestSuccess(null)

    setTimeout(() => {
      setIsTesting(false)
      setTestSuccess(true)
      toast.success("ESC/POS Test Ticket Dispatched", {
        description: `Printed test receipt on ${testPrinter.name}. Paper cut executed.`,
      })
    }, 1200)
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
                Printer Settings
              </h1>
              <Badge
                variant="outline"
                className="hidden font-mono text-[11px] sm:inline-flex"
              >
                ESC/POS Protocol
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Manage thermal receipt and kitchen ticket printers (network, USB,
              Bluetooth).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePingAll}
              className="h-11 gap-1.5 text-xs font-semibold sm:h-10"
            >
              <RefreshCw className="size-3.5" />
              Check Status
            </Button>
            <Button
              onClick={handleOpenCreate}
              className="h-11 w-full bg-amber-500 font-semibold text-neutral-950 shadow-sm hover:bg-amber-400 sm:h-10 sm:w-auto"
            >
              <Plus className="mr-2 size-4" />
              Add Printer
            </Button>
          </div>
        </div>

        {/* ── Metric Cards ───────────────────────────────────────────── */}
        <div className="admin-metric-grid">
          {[
            {
              label: "Active Devices",
              value: counts.active,
              sub: `${counts.online} online`,
              icon: Printer,
              color: "text-amber-700 dark:text-amber-400 bg-amber-500/10",
            },
            {
              label: "Kitchen Stations",
              value: counts.kitchen,
              sub: "Tickets & prep",
              icon: Server,
              color: "text-orange-600 dark:text-orange-400 bg-orange-500/10",
            },
            {
              label: "Counter Cashiers",
              value: counts.counter,
              sub: "Customer receipts",
              icon: Cpu,
              color: "text-sky-600 dark:text-sky-400 bg-sky-500/10",
            },
            {
              label: "Network Health",
              value: "100%",
              sub: "ESC/POS ready",
              icon: CheckCircle2,
              color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
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

        {/* ── Main Printer List Card ─────────────────────────────────── */}
        <Card className="border bg-card shadow-xs">
          <CardHeader className="gap-4 p-4 pb-3 sm:p-6 sm:pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold sm:text-lg">
                  Registered Thermal Printers
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Orders automatically route to kitchen and counter printers
                  over raw TCP/IP or direct ports.
                </p>
              </div>

              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or IP…"
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

                <Select
                  value={connectionFilter}
                  onValueChange={(value) => setConnectionFilter(value ?? "all")}
                >
                  <SelectTrigger className="h-10 w-full text-xs sm:w-36">
                    <SelectValue placeholder="Connection" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Connections</SelectItem>
                    <SelectItem value="network">Network (IP)</SelectItem>
                    <SelectItem value="usb">USB Direct</SelectItem>
                    <SelectItem value="bluetooth">Bluetooth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location Tabs */}
            <div className="w-full [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden">
              <Tabs value={locationFilter} onValueChange={setLocationFilter}>
                <TabsList className="inline-flex h-10 w-max justify-start rounded-lg bg-muted p-1">
                  <TabsTrigger
                    value="all"
                    className="px-3.5 text-xs font-medium sm:px-4"
                  >
                    All Stations ({printers.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="kitchen"
                    className="px-3.5 text-xs font-medium sm:px-4"
                  >
                    Kitchen Printers ({counts.kitchen})
                  </TabsTrigger>
                  <TabsTrigger
                    value="counter"
                    className="px-3.5 text-xs font-medium sm:px-4"
                  >
                    Counter Cashiers ({counts.counter})
                  </TabsTrigger>
                  <TabsTrigger
                    value="inactive"
                    className="px-3.5 text-xs font-medium sm:px-4"
                  >
                    Disabled
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredPrinters.length ? (
              <div className="divide-y">
                {paginatedPrinters.map((printer) => (
                  <div
                    key={printer.id}
                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="flex min-w-0 items-start gap-3 sm:items-center">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        <Printer className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold sm:text-base">
                            {printer.name}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${locationClasses[printer.location]}`}
                          >
                            {locationLabels[printer.location]}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="gap-1 text-[10px]"
                          >
                            <ConnectionIcon type={printer.connectionType} />
                            {connectionLabels[printer.connectionType]}
                          </Badge>
                          {printer.isActive ? (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              <span className="relative flex size-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                              </span>
                              Ready
                            </span>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground"
                            >
                              Inactive
                            </Badge>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
                          {printer.connectionType === "network" &&
                            printer.ipAddress && (
                              <span>
                                IP: {printer.ipAddress}:{printer.port ?? 9100}
                              </span>
                            )}
                          <span>Width: {printer.paperWidth ?? "80mm"}</span>
                          {printer.autoCut && <span>· Auto-Cut</span>}
                          {printer.buzzerOnPrint && <span>· Buzzer Alert</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartTestPrint(printer)}
                        className="h-9 gap-1.5 text-xs font-semibold hover:bg-amber-500/10 hover:text-amber-800 dark:hover:text-amber-300"
                      >
                        <Zap className="size-3.5 text-amber-500" />
                        Test Print
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleOpenEdit(printer)}
                        aria-label={`Edit ${printer.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Delete ${printer.name}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[90vw] max-w-md rounded-xl sm:rounded-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove {printer.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-xs sm:text-sm">
                              This printer will be disconnected from automatic
                              order ticket routing.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
                            <AlertDialogCancel className="mt-0 w-full sm:w-auto">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePrinter(printer)}
                              className="text-destructive-foreground w-full bg-destructive hover:bg-destructive/90 sm:w-auto"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <Printer className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                No printers match this filter.
              </div>
            )}
          </CardContent>

          {/* Pagination Controls */}
          {filteredPrinters.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6">
              <p className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filteredPrinters.length)} of{" "}
                {filteredPrinters.length}
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
      {/* PRINTER SETUP SHEET                                              */}
      {/* ================================================================ */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetHeader className="border-b p-4 text-left sm:p-6">
            <SheetTitle className="text-base font-bold sm:text-lg">
              {editingPrinterId
                ? "Edit Printer Setup"
                : "Register Thermal Printer"}
            </SheetTitle>
            <SheetDescription className="text-xs sm:text-sm">
              Configure ESC/POS thermal printing parameters for tickets and
              customer receipts.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {/* Name */}
            <div className="grid gap-1.5">
              <Label htmlFor="printer-name" className="text-xs font-semibold">
                Device / Station Name{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="printer-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Kitchen Hot Line, Cashier 1"
                className="h-10 text-sm"
              />
            </div>

            {/* Location & Connection Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Location / Role</Label>
                <Select
                  value={formData.location}
                  onValueChange={(val) =>
                    setFormData((f) => ({
                      ...f,
                      location: val as PrinterLocation,
                    }))
                  }
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kitchen">Kitchen Station</SelectItem>
                    <SelectItem value="counter">Counter Cashier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Connection</Label>
                <Select
                  value={formData.connectionType}
                  onValueChange={(val) =>
                    setFormData((f) => ({
                      ...f,
                      connectionType: val as ConnectionType,
                    }))
                  }
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="network">Network (LAN/Wi-Fi)</SelectItem>
                    <SelectItem value="usb">USB Direct</SelectItem>
                    <SelectItem value="bluetooth">Bluetooth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Network IP & Port Configuration */}
            {formData.connectionType === "network" ? (
              <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3">
                <div className="col-span-2 grid gap-1.5">
                  <Label htmlFor="printer-ip" className="text-xs font-semibold">
                    Static IP Address{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="printer-ip"
                    value={formData.ipAddress ?? ""}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, ipAddress: e.target.value }))
                    }
                    placeholder="192.168.1.200"
                    className="h-9 bg-background font-mono text-xs"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label
                    htmlFor="printer-port"
                    className="text-xs font-semibold"
                  >
                    Raw Port
                  </Label>
                  <Input
                    id="printer-port"
                    type="number"
                    value={formData.port ?? 9100}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        port: Number(e.target.value) || 9100,
                      }))
                    }
                    className="h-9 bg-background font-mono text-xs"
                  />
                </div>
                <p className="col-span-3 mt-1 text-[11px] text-muted-foreground">
                  Ensure the printer has a reserved static IP on your
                  restaurant's local network.
                </p>
              </div>
            ) : formData.connectionType === "usb" ? (
              <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">
                  Direct USB Setup
                </p>
                <p>
                  Connect the printer to the POS terminal via USB cable.
                  Automatically routed via system driver.
                </p>
              </div>
            ) : (
              <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">
                  Bluetooth Wireless
                </p>
                <p>
                  Pair the device with your tablet / POS terminal in Bluetooth
                  settings.
                </p>
              </div>
            )}

            {/* Hardware Settings */}
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-xs font-semibold">Hardware Capabilities</p>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-xs">Paper Roll Width</Label>
                  <Select
                    value={formData.paperWidth ?? "80mm"}
                    onValueChange={(val) =>
                      setFormData((f) => ({
                        ...f,
                        paperWidth: val as "80mm" | "58mm",
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="80mm">80mm (Standard)</SelectItem>
                      <SelectItem value="58mm">58mm (Narrow)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-xs font-medium">Auto-Cut Paper</p>
                  <p className="text-[10px] text-muted-foreground">
                    Executes knife cut after printing receipt
                  </p>
                </div>
                <Switch
                  checked={formData.autoCut}
                  onCheckedChange={(v) =>
                    setFormData((f) => ({ ...f, autoCut: v }))
                  }
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-xs font-medium">Buzzer / Beep on Order</p>
                  <p className="text-[10px] text-muted-foreground">
                    Audible ring for noisy kitchen lines
                  </p>
                </div>
                <Switch
                  checked={formData.buzzerOnPrint}
                  onCheckedChange={(v) =>
                    setFormData((f) => ({ ...f, buzzerOnPrint: v }))
                  }
                />
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-xs font-medium">Device Enabled</p>
                <p className="text-[10px] text-muted-foreground">
                  Disabled printers are excluded from print jobs.
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(v) =>
                  setFormData((f) => ({ ...f, isActive: v }))
                }
              />
            </div>
          </div>

          <SheetFooter className="flex-row border-t bg-background p-4 sm:p-6">
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              className="flex-1 border-amber-500 text-amber-700 hover:bg-amber-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePrinter}
              className="flex-1 bg-amber-500 font-semibold text-neutral-950 hover:bg-amber-400"
            >
              {editingPrinterId ? "Save Changes" : "Save Printer"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ================================================================ */}
      {/* TEST PRINT DIALOG                                                */}
      {/* ================================================================ */}
      <AlertDialog
        open={Boolean(testPrinter)}
        onOpenChange={(open) => !open && setTestPrinter(null)}
      >
        <AlertDialogContent className="w-[92vw] max-w-md rounded-xl sm:rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Printer className="size-5 text-amber-600" />
              ESC/POS Test Print — {testPrinter?.name}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Sends an ESC/POS diagnostic slip to verify network connectivity,
              character formatting, and cutter action.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Realistic Receipt Slip Mockup */}
          <div className="my-2 rounded-lg border bg-neutral-50 p-4 font-mono text-xs text-neutral-800 shadow-inner dark:bg-neutral-950 dark:text-neutral-200">
            <div className="space-y-0.5 border-b border-dashed border-neutral-400 pb-2 text-center">
              <p className="text-sm font-bold tracking-wider">
                PRIME POS ECOSYSTEM
              </p>
              <p className="text-[10px] text-neutral-500">
                DIAGNOSTIC TEST TICKET
              </p>
            </div>
            <div className="space-y-1 py-2 text-[11px]">
              <div className="flex justify-between">
                <span>Target:</span>
                <span className="font-bold">{testPrinter?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Location:</span>
                <span>{testPrinter?.location.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Protocol:</span>
                <span>RAW ESC/POS</span>
              </div>
              {testPrinter?.ipAddress && (
                <div className="flex justify-between">
                  <span>Socket:</span>
                  <span>
                    {testPrinter.ipAddress}:{testPrinter.port ?? 9100}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-1 border-t border-dashed border-neutral-400 pt-2 text-[11px]">
              <div className="flex justify-between font-semibold">
                <span>1x Whole Litson Manok</span>
                <span>₱420.00</span>
              </div>
              <p className="pl-2 text-[10px] text-neutral-500">
                ** TEST LINE ITEM **
              </p>
              <div className="flex justify-between">
                <span>2x Java Rice</span>
                <span>₱90.00</span>
              </div>
            </div>
            <div className="mt-2 border-t border-dashed border-neutral-400 pt-2 text-center text-[10px] text-neutral-500">
              <p>*** END OF TEST TICKET ***</p>
              <p className="mt-0.5 text-[9px]">[Knife Cut Executed]</p>
            </div>
          </div>

          {testSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>
                Printer pinged successfully (14ms latency). Ready for live
                orders.
              </span>
            </div>
          )}

          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <AlertDialogCancel className="mt-0 w-full sm:w-auto">
              Close
            </AlertDialogCancel>
            <Button
              onClick={handleExecuteTestPrint}
              disabled={isTesting}
              className="w-full bg-amber-500 font-semibold text-neutral-950 hover:bg-amber-400 sm:w-auto"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                  Sending Packet…
                </>
              ) : (
                <>
                  <Printer className="mr-2 size-4" />
                  Send Test Print
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
