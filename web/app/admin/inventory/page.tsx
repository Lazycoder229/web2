"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Archive,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Layers,
  PackagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  TrendingDown,
  Utensils,
  X,
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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Toaster } from "@/components/ui/sonner"
import {
  adjustStockAction,
  createInventoryItemAction,
  deleteInventoryItemAction,
  fetchInventoryAccessAction,
  fetchInventory,
  updateInventoryItemAction,
} from "@/lib/api/inventory"
import type { InventoryAccess } from "@/lib/api/inventory"

// ---------------------------------------------------------------------------
// Types — mirrors the new inventory DB tables
// ---------------------------------------------------------------------------

type StockLogType = "stock_in" | "adjustment" | "waste" | "consumed"
type StockItemType = "ingredient" | "menu_item"

interface InventoryCategory {
  id: string
  name: string
}

interface InventoryItem {
  id: string
  categoryId: string | null
  categoryName: string | null
  name: string
  unit: string
  stockQuantity: number
  reorderThreshold: number | null
  unitCost: number | null
  supplier: string | null
  isActive: boolean
}

interface StockLog {
  id: string
  itemType: StockItemType
  inventoryItemId?: string | null
  menuItemId?: string | null
  itemName: string
  unit: string
  type: StockLogType
  quantityChange: number
  quantityAfter: number | null
  note: string | null
  performedByStaffId: string
  staffName: string
  createdAt: string
}

/** menu_items — only stock-managed ones (stock_quantity IS NOT NULL) */
interface MenuStockItem {
  id: string
  name: string
  category: string
  price: number
  stockQuantity: number | null // null = unlimited
  isAvailable: boolean
}

type InventoryItemForm = Omit<InventoryItem, "id" | "categoryName">
type StockAdjustForm = {
  type: StockLogType
  quantityChange: number
  note: string
  performedByStaffId: string
}

interface MenuStockUpdateForm {
  isUnlimited: boolean
  mode: "adjust" | "set"
  quantityChange: number
  exactQuantity: number
  type: StockLogType
  performedByStaffId: string
  note: string
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

const UNITS = [
  "kg",
  "g",
  "L",
  "mL",
  "pcs",
  "pack",
  "box",
  "bottle",
  "tray",
  "bag",
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number) {
  return `₱${value.toLocaleString("en-PH")}`
}

function formatQty(qty: number, unit: string) {
  return `${qty % 1 === 0 ? qty : qty.toFixed(2)} ${unit}`
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

function stockLevel(item: InventoryItem): "ok" | "low" | "critical" | "out" {
  if (item.stockQuantity <= 0) return "out"
  if (item.reorderThreshold == null) return "ok"
  if (item.stockQuantity <= item.reorderThreshold * 0.5) return "critical"
  if (item.stockQuantity <= item.reorderThreshold) return "low"
  return "ok"
}

function menuStockLevel(
  item: MenuStockItem
): "ok" | "low" | "out" | "unlimited" {
  if (item.stockQuantity == null) return "unlimited"
  if (item.stockQuantity <= 0) return "out"
  if (item.stockQuantity <= 5) return "low"
  return "ok"
}

const stockLevelClasses = {
  ok: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  low: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  critical: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  out: "bg-destructive/10 text-destructive border-destructive/20",
  unlimited: "bg-muted text-muted-foreground border-border",
}

const stockLevelLabels = {
  ok: "OK",
  low: "Low stock",
  critical: "Critical",
  out: "Out of stock",
  unlimited: "Unlimited",
}

const logTypeLabels: Record<StockLogType, string> = {
  stock_in: "Stock in",
  adjustment: "Adjustment",
  waste: "Waste",
  consumed: "Consumed",
}

const logTypeClasses: Record<StockLogType, string> = {
  stock_in: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  adjustment: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  waste: "bg-destructive/10 text-destructive border-destructive/20",
  consumed: "bg-amber-500/10 text-amber-700 border-amber-500/20",
}

const itemTypeLabels: Record<StockItemType, string> = {
  ingredient: "Ingredient",
  menu_item: "Menu item",
}

const itemTypeClasses: Record<StockItemType, string> = {
  ingredient:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  menu_item:
    "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
}

const pageTabs = [
  { value: "ingredients", label: "Ingredients & supplies" },
  { value: "menu", label: "Menu item stock" },
  { value: "logs", label: "Stock log" },
]

const ingredientTabs = [
  { value: "all", label: "All items" },
  { value: "low", label: "Low / Critical" },
  { value: "out", label: "Out of stock" },
  { value: "inactive", label: "Inactive" },
]

const menuStockTabs = [
  { value: "all", label: "All items" },
  { value: "low", label: "Low stock (≤ 5)" },
  { value: "out", label: "Out of stock" },
  { value: "unlimited", label: "Unlimited" },
]

const logSourceTabs = [
  { value: "all", label: "All logs" },
  { value: "ingredient", label: "Ingredients" },
  { value: "menu_item", label: "Menu items" },
]

const emptyItemForm: InventoryItemForm = {
  categoryId: null,
  name: "",
  unit: "kg",
  stockQuantity: 0,
  reorderThreshold: null,
  unitCost: null,
  supplier: null,
  isActive: true,
}

const emptyAdjustForm: StockAdjustForm = {
  type: "stock_in",
  quantityChange: 0,
  note: "",
  performedByStaffId: "",
}

const emptyMenuStockForm: MenuStockUpdateForm = {
  isUnlimited: false,
  mode: "adjust",
  quantityChange: 0,
  exactQuantity: 0,
  type: "stock_in",
  performedByStaffId: "",
  note: "",
}

const pageSize = 8

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function InventoryPage() {
  const [pageTab, setPageTab] = useState("ingredients")
  const [inventoryAccess, setInventoryAccess] =
    useState<InventoryAccess | null>(null)
  const [isCheckingInventoryAccess, setIsCheckingInventoryAccess] =
    useState(true)

  // ---- Ingredient state ----
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [ingredientTab, setIngredientTab] = useState("all")
  const [ingredientSearch, setIngredientSearch] = useState("")
  const [ingredientPage, setIngredientPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [itemSheetOpen, setItemSheetOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [itemForm, setItemForm] = useState<InventoryItemForm>(emptyItemForm)

  // ---- Stock adjust sheet ----
  const [adjustSheetOpen, setAdjustSheetOpen] = useState(false)
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null)
  const [adjustForm, setAdjustForm] = useState<StockAdjustForm>(emptyAdjustForm)

  // ---- Menu stock state ----
  const [menuItems, setMenuItems] = useState<MenuStockItem[]>([])
  const [menuSearch, setMenuSearch] = useState("")
  const [menuTab, setMenuTab] = useState("all")
  const [menuStockSheetOpen, setMenuStockSheetOpen] = useState(false)
  const [updatingMenuItem, setUpdatingMenuItem] =
    useState<MenuStockItem | null>(null)
  const [menuStockForm, setMenuStockForm] =
    useState<MenuStockUpdateForm>(emptyMenuStockForm)

  // ---- Stock logs state ----
  const [logs, setLogs] = useState<StockLog[]>([])
  const [logSearch, setLogSearch] = useState("")
  const [logSourceTab, setLogSourceTab] = useState("all")
  const [logTypeFilter, setLogTypeFilter] = useState("all")
  const [logPage, setLogPage] = useState(1)

  useEffect(() => {
    setIngredientPage(1)
  }, [ingredientTab, ingredientSearch])
  useEffect(() => {
    setLogPage(1)
  }, [logSearch, logSourceTab, logTypeFilter])

  useEffect(() => {
    let active = true
    void (async () => {
      const access = await fetchInventoryAccessAction()
      if (!active) return
      if (!access.success || !access.data.canView) {
        setInventoryAccess(access.success ? access.data : null)
        setIsCheckingInventoryAccess(false)
        return
      }
      setInventoryAccess(access.data)
      await loadInventory()
      if (active) setIsCheckingInventoryAccess(false)
    })()
    return () => {
      active = false
    }
  }, [])

  async function loadInventory(): Promise<boolean> {
    const result = await fetchInventory()
    if (!result.success) {
      toast.error(result.error)
      return false
    }
    setCategories(result.data.categories)
    setItems(result.data.items)
    setLogs(result.data.logs)
    setMenuItems(result.data.menuStock)
    return true
  }

  // ---- Counts ----
  const counts = useMemo(
    () => ({
      lowStock: items.filter((i) => ["low", "critical"].includes(stockLevel(i)))
        .length,
      outOfStock: items.filter((i) => stockLevel(i) === "out").length,
      totalItems: items.filter((i) => i.isActive).length,
      inventoryValue: items
        .filter((i) => i.isActive && i.unitCost != null)
        .reduce((sum, i) => sum + i.stockQuantity * (i.unitCost ?? 0), 0),
    }),
    [items]
  )

  // ---- Filtered ingredients ----
  const filteredItems = useMemo(() => {
    const query = ingredientSearch.trim().toLowerCase()
    return items.filter((item) => {
      const matchesSearch =
        !query ||
        [item.name, item.categoryName ?? "", item.supplier ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query)
      const level = stockLevel(item)
      const matchesTab =
        ingredientTab === "all"
          ? item.isActive
          : ingredientTab === "low"
            ? item.isActive && ["low", "critical"].includes(level)
            : ingredientTab === "out"
              ? item.isActive && level === "out"
              : !item.isActive
      return matchesSearch && matchesTab
    })
  }, [items, ingredientTab, ingredientSearch])

  const totalIngredientPages = Math.max(
    1,
    Math.ceil(filteredItems.length / pageSize)
  )
  const paginatedItems = useMemo(
    () =>
      filteredItems.slice(
        (ingredientPage - 1) * pageSize,
        ingredientPage * pageSize
      ),
    [filteredItems, ingredientPage]
  )

  // ---- Filtered menu items ----
  const filteredMenuItems = useMemo(() => {
    const query = menuSearch.trim().toLowerCase()
    return menuItems.filter((m) => {
      const matchesSearch =
        !query || [m.name, m.category].join(" ").toLowerCase().includes(query)
      const level = menuStockLevel(m)
      const matchesTab =
        menuTab === "all"
          ? true
          : menuTab === "low"
            ? level === "low"
            : menuTab === "out"
              ? level === "out"
              : level === "unlimited"
      return matchesSearch && matchesTab
    })
  }, [menuItems, menuSearch, menuTab])

  // ---- Filtered logs ----
  const filteredLogs = useMemo(() => {
    const query = logSearch.trim().toLowerCase()
    return logs.filter((l) => {
      const matchesSource =
        logSourceTab === "all" ? true : l.itemType === logSourceTab
      const matchesType =
        logTypeFilter === "all" ? true : l.type === logTypeFilter
      const matchesSearch =
        !query ||
        [
          l.itemName,
          logTypeLabels[l.type],
          l.note ?? "",
          l.staffName,
          l.itemType === "menu_item" ? "menu item" : "ingredient",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      return matchesSource && matchesType && matchesSearch
    })
  }, [logs, logSearch, logSourceTab, logTypeFilter])

  const totalLogPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize))
  const paginatedLogs = useMemo(
    () => filteredLogs.slice((logPage - 1) * pageSize, logPage * pageSize),
    [filteredLogs, logPage]
  )

  // ---- Ingredient CRUD ----
  function openCreateItem() {
    setEditingItemId(null)
    setItemForm(emptyItemForm)
    setItemSheetOpen(true)
  }

  function openEditItem(item: InventoryItem) {
    setEditingItemId(item.id)
    setItemForm({
      categoryId: item.categoryId,
      name: item.name,
      unit: item.unit,
      stockQuantity: item.stockQuantity,
      reorderThreshold: item.reorderThreshold,
      unitCost: item.unitCost,
      supplier: item.supplier,
      isActive: item.isActive,
    })
    setItemSheetOpen(true)
  }

  async function saveItem() {
    if (!inventoryAccess?.canManage) {
      toast.error("You do not have permission to manage inventory items")
      return
    }
    if (!itemForm.name.trim()) {
      toast.error("Item name is required")
      return
    }
    const result = editingItemId
      ? await updateInventoryItemAction({
          id: editingItemId,
          categoryId: itemForm.categoryId,
          name: itemForm.name,
          unit: itemForm.unit,
          stockQuantity: String(itemForm.stockQuantity),
          reorderThreshold:
            itemForm.reorderThreshold == null
              ? null
              : String(itemForm.reorderThreshold),
          unitCost:
            itemForm.unitCost == null ? null : String(itemForm.unitCost),
          supplier: itemForm.supplier,
          isActive: itemForm.isActive,
        })
      : await createInventoryItemAction({
          categoryId: itemForm.categoryId ?? undefined,
          name: itemForm.name,
          unit: itemForm.unit,
          stockQuantity: String(itemForm.stockQuantity),
          reorderThreshold:
            itemForm.reorderThreshold == null
              ? undefined
              : String(itemForm.reorderThreshold),
          unitCost: itemForm.unitCost ?? undefined,
          supplier: itemForm.supplier ?? undefined,
          isActive: itemForm.isActive,
        })
    if (!result.success) {
      toast.error(result.error)
      return
    }
    if (!(await loadInventory())) return
    toast.success(editingItemId ? "Item updated" : "Item added", {
      description: `${itemForm.name} was saved.`,
    })
    setItemSheetOpen(false)
  }

  async function deleteItem(item: InventoryItem) {
    if (!inventoryAccess?.canManage) {
      toast.error("You do not have permission to manage inventory items")
      return
    }
    const result = await deleteInventoryItemAction(item.id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    if (!(await loadInventory())) return
    setSelectedItem(null)
    toast.success("Item removed", { description: `${item.name} was deleted.` })
  }

  // ---- Stock adjustment ----
  function openAdjust(item: InventoryItem) {
    setAdjustingItem(item)
    setAdjustForm({ ...emptyAdjustForm })
    setAdjustSheetOpen(true)
  }

  async function saveAdjustment() {
    if (!adjustingItem) return
    const canAdjustType =
      adjustForm.type === "stock_in"
        ? inventoryAccess?.canStockIn
        : adjustForm.type === "waste"
          ? inventoryAccess?.canLogWaste
          : inventoryAccess?.canManage
    if (!canAdjustType) {
      toast.error("You do not have permission for this stock adjustment")
      return
    }
    if (adjustForm.quantityChange === 0) {
      toast.error("Quantity change cannot be zero")
      return
    }

    const change =
      adjustForm.type === "stock_in"
        ? Math.abs(adjustForm.quantityChange)
        : adjustForm.type === "adjustment"
          ? adjustForm.quantityChange
          : -Math.abs(adjustForm.quantityChange)

    const result = await adjustStockAction({
      itemType: "ingredient",
      inventoryItemId: adjustingItem.id,
      type: adjustForm.type,
      quantityChange: String(change),
      note: adjustForm.note || undefined,
      performedByStaffId: adjustForm.performedByStaffId,
    })
    if (!result.success) {
      toast.error(result.error)
      return
    }
    if (!(await loadInventory())) return

    toast.success("Stock updated", {
      description: `${adjustingItem.name}: ${change >= 0 ? "+" : ""}${change} ${adjustingItem.unit}`,
    })
    setAdjustSheetOpen(false)
  }

  // ---- Menu stock rich update sheet ----
  function openUpdateMenuStock(item: MenuStockItem) {
    setUpdatingMenuItem(item)
    const isUnl = item.stockQuantity == null
    setMenuStockForm({
      isUnlimited: isUnl,
      mode: isUnl ? "set" : "adjust",
      quantityChange: 0,
      exactQuantity: item.stockQuantity ?? 0,
      type: "stock_in",
      performedByStaffId: "",
      note: "",
    })
    setMenuStockSheetOpen(true)
  }

  async function saveMenuStockUpdate() {
    if (!updatingMenuItem) return
    const canAdjustType =
      menuStockForm.type === "stock_in"
        ? inventoryAccess?.canStockIn
        : menuStockForm.type === "waste"
          ? inventoryAccess?.canLogWaste
          : inventoryAccess?.canManage
    if (
      (menuStockForm.isUnlimited || menuStockForm.mode === "set") &&
      !inventoryAccess?.canManage
    ) {
      toast.error(
        "Managing exact menu stock requires inventory management access"
      )
      return
    }
    if (!menuStockForm.isUnlimited && !canAdjustType) {
      toast.error("You do not have permission for this stock adjustment")
      return
    }

    let newQty: number | null = null
    let diff = 0
    const prevQty = updatingMenuItem.stockQuantity

    if (menuStockForm.isUnlimited) {
      newQty = null
      diff = 0
    } else if (menuStockForm.mode === "set") {
      newQty = Math.max(0, Math.floor(menuStockForm.exactQuantity))
      diff = newQty - (prevQty ?? 0)
    } else {
      const isPositive = menuStockForm.type === "stock_in"
      const delta =
        menuStockForm.type === "adjustment"
          ? menuStockForm.quantityChange
          : isPositive
            ? Math.abs(menuStockForm.quantityChange)
            : -Math.abs(menuStockForm.quantityChange)

      if (delta === 0) {
        toast.error("Adjustment quantity cannot be zero")
        return
      }
      diff = delta
      newQty = Math.max(0, (prevQty ?? 0) + delta)
    }

    const logType: StockLogType = menuStockForm.isUnlimited
      ? "adjustment"
      : menuStockForm.mode === "set"
        ? "adjustment"
        : menuStockForm.type

    const note =
      menuStockForm.note.trim() ||
      (menuStockForm.isUnlimited
        ? "Switched stock to unlimited"
        : prevQty == null
          ? "Enabled stock tracking"
          : menuStockForm.mode === "set"
            ? `Physical inventory count set to ${newQty} pcs`
            : null)

    const result = await adjustStockAction({
      itemType: "menu_item",
      menuItemId: updatingMenuItem.id,
      type: logType,
      quantityChange: String(diff),
      setQuantity:
        menuStockForm.mode === "set" && !menuStockForm.isUnlimited
          ? newQty
          : undefined,
      isUnlimited: menuStockForm.isUnlimited,
      note: note ?? undefined,
      performedByStaffId: menuStockForm.performedByStaffId,
    })
    if (!result.success) {
      toast.error(result.error)
      return
    }
    if (!(await loadInventory())) return

    toast.success("Menu stock updated", {
      description: `${updatingMenuItem.name}: ${
        newQty == null
          ? "Now unlimited"
          : `${prevQty == null ? "Unlimited" : `${prevQty} pcs`} → ${newQty} pcs (${diff >= 0 ? "+" : ""}${diff} pcs)`
      }`,
    })

    setMenuStockSheetOpen(false)
  }

  return !isCheckingInventoryAccess && !inventoryAccess?.canView ? (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          You do not have permission to view inventory.
        </CardContent>
      </Card>
    </div>
  ) : (
    <div className="w-full min-w-0 overflow-x-hidden pb-16 sm:pb-8">
      <Toaster richColors position="top-center" />
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Inventory
              </h1>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Track ingredients, supplies, and menu item stock levels.{" "}
              {isCheckingInventoryAccess && (
                <span className="ml-2" role="status">
                  Checking access and loading…
                </span>
              )}
            </p>
          </div>
          {pageTab === "ingredients" && inventoryAccess?.canManage && (
            <Button
              onClick={openCreateItem}
              className="h-11 w-full bg-amber-500 font-semibold text-neutral-950 shadow-sm hover:bg-amber-400 sm:h-10 sm:w-auto"
            >
              <Plus className="mr-2 size-4" />
              Add item
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="admin-metric-grid">
          {[
            { label: "Active items", value: counts.totalItems, icon: Archive },
            {
              label: "Low / critical",
              value: counts.lowStock,
              icon: TrendingDown,
            },
            {
              label: "Out of stock",
              value: counts.outOfStock,
              icon: AlertTriangle,
            },
            {
              label: "Inventory value",
              value: formatCurrency(counts.inventoryValue),
              icon: ShoppingCart,
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
                  <p className="truncate text-sm font-bold sm:text-base">
                    {metric.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Page tab */}
        <div className="w-full [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <Tabs value={pageTab} onValueChange={setPageTab}>
            <TabsList className="inline-flex h-10 w-max justify-start rounded-lg bg-muted p-1">
              {pageTabs.map((tab) => (
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

        {/* ============================================================== */}
        {/* INGREDIENTS & SUPPLIES TAB                                      */}
        {/* ============================================================== */}
        {pageTab === "ingredients" && (
          <Card className="border bg-card shadow-xs">
            <CardHeader className="gap-4 p-4 pb-3 sm:p-6 sm:pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base font-bold sm:text-lg">
                  Ingredients &amp; supplies
                </CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
                  <Input
                    value={ingredientSearch}
                    onChange={(e) => setIngredientSearch(e.target.value)}
                    placeholder="Search items…"
                    className="h-10 pr-9 pl-9 text-sm"
                  />
                  {ingredientSearch && (
                    <button
                      type="button"
                      aria-label="Clear"
                      onClick={() => setIngredientSearch("")}
                      className="absolute top-2.5 right-2.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden">
                <Tabs value={ingredientTab} onValueChange={setIngredientTab}>
                  <TabsList className="inline-flex h-10 w-max justify-start rounded-lg bg-muted p-1">
                    {ingredientTabs.map((tab) => (
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

            <CardContent className="p-0">
              {filteredItems.length ? (
                <div className="divide-y">
                  {paginatedItems.map((item) => {
                    const level = stockLevel(item)
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            <Archive className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{item.name}</p>
                              {item.categoryName && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {item.categoryName}
                                </Badge>
                              )}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {formatQty(item.stockQuantity, item.unit)}
                              {item.reorderThreshold != null
                                ? ` · reorder at ${formatQty(item.reorderThreshold, item.unit)}`
                                : ""}
                              {item.supplier ? ` · ${item.supplier}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <p className="text-sm font-bold text-amber-600">
                            {item.unitCost != null
                              ? formatCurrency(item.unitCost) + `/${item.unit}`
                              : "—"}
                          </p>
                          <Badge
                            variant="outline"
                            className={`min-w-24 justify-center text-[11px] ${stockLevelClasses[level]}`}
                          >
                            {stockLevelLabels[level]}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setSelectedItem(item)}
                            aria-label={`View ${item.name}`}
                          >
                            <Eye className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  No items match this view.
                </div>
              )}
            </CardContent>

            {filteredItems.length > pageSize && (
              <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6">
                <p className="text-xs text-muted-foreground">
                  Showing {(ingredientPage - 1) * pageSize + 1}–
                  {Math.min(ingredientPage * pageSize, filteredItems.length)} of{" "}
                  {filteredItems.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={ingredientPage === 1}
                    onClick={() => setIngredientPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="px-2 text-xs font-medium">
                    {ingredientPage} / {totalIngredientPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={ingredientPage === totalIngredientPages}
                    onClick={() =>
                      setIngredientPage((p) =>
                        Math.min(totalIngredientPages, p + 1)
                      )
                    }
                    aria-label="Next"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ============================================================== */}
        {/* MENU ITEM STOCK TAB                                             */}
        {/* ============================================================== */}
        {pageTab === "menu" && (
          <Card className="border bg-card shadow-xs">
            <CardHeader className="gap-4 p-4 pb-3 sm:p-6 sm:pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-bold sm:text-lg">
                    Menu item stock
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Based on{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                      menu_items.stock_quantity
                    </code>
                    . Track real-time inventory and availability for prepared
                    foods and drinks.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
                  <Input
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="Search menu items…"
                    className="h-10 pr-9 pl-9 text-sm"
                  />
                  {menuSearch && (
                    <button
                      type="button"
                      onClick={() => setMenuSearch("")}
                      className="absolute top-2.5 right-2.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden">
                <Tabs value={menuTab} onValueChange={setMenuTab}>
                  <TabsList className="inline-flex h-10 w-max justify-start rounded-lg bg-muted p-1">
                    {menuStockTabs.map((tab) => (
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

            <CardContent className="p-0">
              {filteredMenuItems.length ? (
                <div className="divide-y">
                  {filteredMenuItems.map((item) => {
                    const level = menuStockLevel(item)
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            <Utensils className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{item.name}</p>
                              <Badge variant="outline" className="text-[10px]">
                                {item.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(item.price)} ·{" "}
                              {item.stockQuantity == null
                                ? "Unlimited stock"
                                : `${item.stockQuantity} pcs remaining`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <Badge
                            variant="outline"
                            className={`min-w-24 justify-center text-[11px] ${stockLevelClasses[level]}`}
                          >
                            {stockLevelLabels[level]}
                          </Badge>
                          {inventoryAccess?.canManage && (
                            <Button
                              size="sm"
                              className="h-9 gap-1.5 bg-amber-500 font-semibold text-neutral-950 hover:bg-amber-400"
                              onClick={() => openUpdateMenuStock(item)}
                            >
                              <PackagePlus className="size-4" />
                              Update stock
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  No menu items match this view.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ============================================================== */}
        {/* STOCK LOG TAB                                                   */}
        {/* ============================================================== */}
        {pageTab === "logs" && (
          <Card className="border bg-card shadow-xs">
            <CardHeader className="gap-4 p-4 pb-3 sm:p-6 sm:pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-bold sm:text-lg">
                    Stock log
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Immutable audit ledger of inventory movements across
                    ingredients and menu items.
                  </p>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
                    <Input
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      placeholder="Search logs…"
                      className="h-10 pr-9 pl-9 text-sm"
                    />
                    {logSearch && (
                      <button
                        type="button"
                        onClick={() => setLogSearch("")}
                        className="absolute top-2.5 right-2.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                  <Select
                    value={logTypeFilter}
                    onValueChange={(value) => setLogTypeFilter(value ?? "all")}
                  >
                    <SelectTrigger className="h-10 w-full text-xs sm:w-40">
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All actions</SelectItem>
                      <SelectItem value="stock_in">Stock in</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                      <SelectItem value="waste">Waste</SelectItem>
                      <SelectItem value="consumed">Consumed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="w-full [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden">
                <Tabs value={logSourceTab} onValueChange={setLogSourceTab}>
                  <TabsList className="inline-flex h-10 w-max justify-start rounded-lg bg-muted p-1">
                    {logSourceTabs.map((tab) => (
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

            <CardContent className="p-0">
              {filteredLogs.length ? (
                <div className="divide-y">
                  {paginatedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                          {log.itemType === "menu_item" ? (
                            <Utensils className="size-5" />
                          ) : (
                            <Archive className="size-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{log.itemName}</p>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${itemTypeClasses[log.itemType]}`}
                            >
                              {itemTypeLabels[log.itemType]}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${logTypeClasses[log.type]}`}
                            >
                              {logTypeLabels[log.type]}
                            </Badge>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {log.staffName} · {formatDateTime(log.createdAt)}
                            {log.note ? ` · ${log.note}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-3">
                        <div className="text-right">
                          <p
                            className={`font-bold ${log.quantityChange >= 0 ? "text-emerald-700" : "text-destructive"}`}
                          >
                            {log.quantityChange >= 0 ? "+" : ""}
                            {log.quantityChange} {log.unit}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            →{" "}
                            {log.quantityAfter == null
                              ? "Unlimited"
                              : `${log.quantityAfter} ${log.unit}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  No log entries match this search and filter.
                </div>
              )}
            </CardContent>

            {filteredLogs.length > pageSize && (
              <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6">
                <p className="text-xs text-muted-foreground">
                  Showing {(logPage - 1) * pageSize + 1}–
                  {Math.min(logPage * pageSize, filteredLogs.length)} of{" "}
                  {filteredLogs.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={logPage === 1}
                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="px-2 text-xs font-medium">
                    {logPage} / {totalLogPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={logPage === totalLogPages}
                    onClick={() =>
                      setLogPage((p) => Math.min(totalLogPages, p + 1))
                    }
                    aria-label="Next"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ================================================================ */}
      {/* INGREDIENT — CREATE / EDIT SHEET                                 */}
      {/* ================================================================ */}
      <Sheet open={itemSheetOpen} onOpenChange={setItemSheetOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetHeader className="border-b p-4 text-left sm:p-6">
            <SheetTitle>
              {editingItemId ? "Edit item" : "New inventory item"}
            </SheetTitle>
            <SheetDescription>
              {editingItemId
                ? "Update the item details and stock settings."
                : "Add an ingredient or supply to track."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 overflow-y-auto p-4 sm:p-6">
            <div className="grid gap-1.5">
              <Label htmlFor="item-name">Item name</Label>
              <Input
                id="item-name"
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm((c) => ({ ...c, name: e.target.value }))
                }
                placeholder="e.g. Whole Chicken"
                className="h-11 sm:h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select
                  value={itemForm.categoryId ?? "none"}
                  onValueChange={(v) =>
                    setItemForm((c) => ({
                      ...c,
                      categoryId: v === "none" ? null : v,
                    }))
                  }
                >
                  <SelectTrigger className="h-11 w-full sm:h-10">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Unit</Label>
                <Select
                  value={itemForm.unit}
                  onValueChange={(v) =>
                    setItemForm((c) => ({ ...c, unit: v ?? c.unit }))
                  }
                >
                  <SelectTrigger className="h-11 w-full sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="stock-qty">Current stock</Label>
                <Input
                  id="stock-qty"
                  type="number"
                  min={0}
                  step={0.001}
                  value={itemForm.stockQuantity}
                  onChange={(e) =>
                    setItemForm((c) => ({
                      ...c,
                      stockQuantity: Number(e.target.value) || 0,
                    }))
                  }
                  className="h-11 sm:h-10"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="reorder-threshold">Reorder at</Label>
                <Input
                  id="reorder-threshold"
                  type="number"
                  min={0}
                  step={0.001}
                  value={itemForm.reorderThreshold ?? ""}
                  onChange={(e) =>
                    setItemForm((c) => ({
                      ...c,
                      reorderThreshold: Number(e.target.value) || null,
                    }))
                  }
                  placeholder="No alert"
                  className="h-11 sm:h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="unit-cost">Unit cost (₱)</Label>
                <Input
                  id="unit-cost"
                  type="number"
                  min={0}
                  step={0.01}
                  value={itemForm.unitCost ?? ""}
                  onChange={(e) =>
                    setItemForm((c) => ({
                      ...c,
                      unitCost: Number(e.target.value) || null,
                    }))
                  }
                  placeholder="Optional"
                  className="h-11 sm:h-10"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  value={itemForm.supplier ?? ""}
                  onChange={(e) =>
                    setItemForm((c) => ({
                      ...c,
                      supplier: e.target.value || null,
                    }))
                  }
                  placeholder="Optional"
                  className="h-11 sm:h-10"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  Inactive items are hidden from the main list.
                </p>
              </div>
              <Switch
                checked={itemForm.isActive}
                onCheckedChange={(v) =>
                  setItemForm((c) => ({ ...c, isActive: v }))
                }
              />
            </div>
          </div>

          <SheetFooter className="flex-row border-t bg-background p-4 sm:p-6">
            <Button
              variant="outline"
              onClick={() => setItemSheetOpen(false)}
              className="flex-1 border-amber-500 text-amber-700 hover:bg-amber-50"
            >
              Cancel
            </Button>
            <Button
              onClick={saveItem}
              className="flex-1 bg-amber-500 font-semibold text-neutral-950 hover:bg-amber-400"
            >
              {editingItemId ? "Save changes" : "Add item"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ================================================================ */}
      {/* INGREDIENT — DETAIL SHEET                                        */}
      {/* ================================================================ */}
      <Sheet
        open={Boolean(selectedItem)}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          {selectedItem && (
            <>
              <SheetHeader className="border-b p-4 text-left sm:p-6">
                <div className="flex items-start justify-between gap-4 pr-8">
                  <div>
                    <SheetTitle>{selectedItem.name}</SheetTitle>
                    <SheetDescription>
                      {selectedItem.categoryName ?? "Uncategorized"} ·{" "}
                      {selectedItem.unit}
                    </SheetDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={stockLevelClasses[stockLevel(selectedItem)]}
                  >
                    {stockLevelLabels[stockLevel(selectedItem)]}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Current stock",
                      value: formatQty(
                        selectedItem.stockQuantity,
                        selectedItem.unit
                      ),
                    },
                    {
                      label: "Reorder at",
                      value:
                        selectedItem.reorderThreshold != null
                          ? formatQty(
                              selectedItem.reorderThreshold,
                              selectedItem.unit
                            )
                          : "No alert",
                    },
                    {
                      label: "Unit cost",
                      value:
                        selectedItem.unitCost != null
                          ? `${formatCurrency(selectedItem.unitCost)}/${selectedItem.unit}`
                          : "—",
                    },
                    { label: "Supplier", value: selectedItem.supplier ?? "—" },
                  ].map((field) => (
                    <div
                      key={field.label}
                      className="rounded-lg border bg-muted/30 p-3"
                    >
                      <p className="text-xs text-muted-foreground">
                        {field.label}
                      </p>
                      <p className="mt-1 text-sm font-medium">{field.value}</p>
                    </div>
                  ))}
                </div>

                {/* Recent logs for this item */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Recent activity
                  </p>
                  <div className="space-y-1">
                    {logs
                      .filter((l) => l.inventoryItemId === selectedItem.id)
                      .slice(0, 4)
                      .map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between rounded-lg px-1 py-2 text-sm hover:bg-muted/40"
                        >
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${logTypeClasses[log.type]}`}
                            >
                              {logTypeLabels[log.type]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(log.createdAt)}
                            </span>
                          </div>
                          <span
                            className={`text-xs font-bold ${log.quantityChange >= 0 ? "text-emerald-700" : "text-destructive"}`}
                          >
                            {log.quantityChange >= 0 ? "+" : ""}
                            {log.quantityChange}
                          </span>
                        </div>
                      ))}
                    {logs.filter((l) => l.inventoryItemId === selectedItem.id)
                      .length === 0 && (
                      <p className="py-3 text-center text-xs text-muted-foreground">
                        No activity logged yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <SheetFooter className="flex-col gap-2 border-t bg-background p-4 sm:p-6">
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      openEditItem(selectedItem)
                      setSelectedItem(null)
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
                          Delete {selectedItem.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs sm:text-sm">
                          This removes the item and all its stock log history.
                          This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
                        <AlertDialogCancel className="mt-0 w-full sm:w-auto">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteItem(selectedItem)}
                          className="text-destructive-foreground w-full bg-destructive hover:bg-destructive/90 sm:w-auto"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <Button
                  onClick={() => {
                    openAdjust(selectedItem)
                    setSelectedItem(null)
                  }}
                  className="w-full bg-amber-500 font-semibold text-neutral-950 hover:bg-amber-400"
                >
                  <PackagePlus className="mr-2 size-4" />
                  Adjust stock
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ================================================================ */}
      {/* STOCK ADJUSTMENT SHEET                                           */}
      {/* ================================================================ */}
      <Sheet open={adjustSheetOpen} onOpenChange={setAdjustSheetOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetHeader className="border-b p-4 text-left sm:p-6">
            <SheetTitle>Adjust stock — {adjustingItem?.name}</SheetTitle>
            <SheetDescription>
              Current:{" "}
              {adjustingItem
                ? formatQty(adjustingItem.stockQuantity, adjustingItem.unit)
                : ""}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 p-4 sm:p-6">
            <div className="grid gap-1.5">
              <Label>Adjustment type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    "stock_in",
                    "adjustment",
                    "waste",
                    "consumed",
                  ] as StockLogType[]
                ).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAdjustForm((c) => ({ ...c, type }))}
                    className={`rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition ${
                      adjustForm.type === type
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-border text-muted-foreground hover:border-amber-400"
                    }`}
                  >
                    {logTypeLabels[type]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="qty-change">
                Quantity ({adjustingItem?.unit})
                {adjustForm.type === "adjustment" && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    use negative to subtract
                  </span>
                )}
              </Label>
              <Input
                id="qty-change"
                type="number"
                step={0.001}
                min={adjustForm.type === "adjustment" ? undefined : 0}
                value={adjustForm.quantityChange || ""}
                onChange={(e) =>
                  setAdjustForm((c) => ({
                    ...c,
                    quantityChange: Number(e.target.value) || 0,
                  }))
                }
                placeholder="e.g. 10"
                className="h-11 sm:h-10"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="adj-note">Note (optional)</Label>
              <Textarea
                id="adj-note"
                value={adjustForm.note}
                maxLength={255}
                onChange={(e) =>
                  setAdjustForm((c) => ({ ...c, note: e.target.value }))
                }
                placeholder="Reason for adjustment, supplier name, etc."
                className="resize-none"
                rows={2}
              />
            </div>

            {adjustingItem && adjustForm.quantityChange !== 0 && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <span className="text-muted-foreground">
                  New stock will be{" "}
                </span>
                <span className="font-bold">
                  {formatQty(
                    Math.max(
                      0,
                      adjustingItem.stockQuantity +
                        (adjustForm.type === "stock_in"
                          ? Math.abs(adjustForm.quantityChange)
                          : adjustForm.type === "adjustment"
                            ? adjustForm.quantityChange
                            : -Math.abs(adjustForm.quantityChange))
                    ),
                    adjustingItem.unit
                  )}
                </span>
              </div>
            )}
          </div>

          <SheetFooter className="flex-row border-t bg-background p-4 sm:p-6">
            <Button
              variant="outline"
              onClick={() => setAdjustSheetOpen(false)}
              className="flex-1 border-amber-500 text-amber-700 hover:bg-amber-50"
            >
              Cancel
            </Button>
            <Button
              onClick={saveAdjustment}
              className="flex-1 bg-amber-500 font-semibold text-neutral-950 hover:bg-amber-400"
            >
              Save adjustment
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ================================================================ */}
      {/* MENU ITEM — STOCK UPDATE SHEET                                   */}
      {/* ================================================================ */}
      <Sheet open={menuStockSheetOpen} onOpenChange={setMenuStockSheetOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          {updatingMenuItem && (
            <>
              <SheetHeader className="border-b p-4 text-left sm:p-6">
                <div className="flex items-start justify-between gap-3 pr-6">
                  <div>
                    <SheetTitle className="text-base font-bold sm:text-lg">
                      Update Menu Stock
                    </SheetTitle>
                    <SheetDescription className="text-xs sm:text-sm">
                      {updatingMenuItem.name} · {updatingMenuItem.category}
                    </SheetDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      stockLevelClasses[menuStockLevel(updatingMenuItem)]
                    }
                  >
                    {stockLevelLabels[menuStockLevel(updatingMenuItem)]}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                {/* Current Item Summary */}
                <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="text-sm font-semibold">
                      {formatCurrency(updatingMenuItem.price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Current Stock
                    </p>
                    <p className="text-sm font-semibold">
                      {updatingMenuItem.stockQuantity == null
                        ? "Unlimited"
                        : `${updatingMenuItem.stockQuantity} pcs`}
                    </p>
                  </div>
                </div>

                {/* Stock Tracking Toggle */}
                <div className="flex items-center justify-between rounded-lg border p-3.5">
                  <div className="space-y-0.5 pr-2">
                    <Label
                      htmlFor="menu-unlimited"
                      className="cursor-pointer text-sm font-semibold"
                    >
                      Unlimited Stock
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable for items made to order without portion limits.
                    </p>
                  </div>
                  <Switch
                    id="menu-unlimited"
                    checked={menuStockForm.isUnlimited}
                    onCheckedChange={(checked) =>
                      setMenuStockForm((f) => ({ ...f, isUnlimited: checked }))
                    }
                  />
                </div>

                {!menuStockForm.isUnlimited && (
                  <div className="space-y-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 sm:p-4">
                    {/* Mode selector */}
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-semibold">
                        Adjustment Mode
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setMenuStockForm((f) => ({ ...f, mode: "adjust" }))
                          }
                          className={`rounded-lg border px-3 py-2 text-center text-xs font-semibold transition ${
                            menuStockForm.mode === "adjust"
                              ? "border-amber-500 bg-amber-500 text-neutral-950 shadow-xs"
                              : "border-border bg-background text-muted-foreground hover:border-amber-400"
                          }`}
                        >
                          Quick Adjust (+ / -)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setMenuStockForm((f) => ({ ...f, mode: "set" }))
                          }
                          className={`rounded-lg border px-3 py-2 text-center text-xs font-semibold transition ${
                            menuStockForm.mode === "set"
                              ? "border-amber-500 bg-amber-500 text-neutral-950 shadow-xs"
                              : "border-border bg-background text-muted-foreground hover:border-amber-400"
                          }`}
                        >
                          Set Exact Balance
                        </button>
                      </div>
                    </div>

                    {menuStockForm.mode === "adjust" ? (
                      <>
                        {/* Adjustment Type pills */}
                        <div className="grid gap-1.5">
                          <Label className="text-xs font-semibold">
                            Movement Reason
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              {
                                type: "stock_in",
                                label: "Restock / Prepared",
                                desc: "Batch cooked or delivered",
                              },
                              {
                                type: "adjustment",
                                label: "Recount / Correction",
                                desc: "Physical audit recount",
                              },
                              {
                                type: "waste",
                                label: "Waste / Spoilage",
                                desc: "Expired, burnt, or dropped",
                              },
                              {
                                type: "consumed",
                                label: "Consumed / Promo",
                                desc: "Staff meal or tasting",
                              },
                            ].map((item) => (
                              <button
                                key={item.type}
                                type="button"
                                onClick={() =>
                                  setMenuStockForm((f) => ({
                                    ...f,
                                    type: item.type as StockLogType,
                                  }))
                                }
                                className={`rounded-lg border p-2.5 text-left text-xs transition ${
                                  menuStockForm.type === item.type
                                    ? "border-amber-500 bg-amber-500/10 font-semibold text-amber-900 dark:text-amber-300"
                                    : "border-border bg-background text-muted-foreground hover:border-amber-400"
                                }`}
                              >
                                <p className="font-semibold">{item.label}</p>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                  {item.desc}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Quantity change input */}
                        <div className="grid gap-1.5">
                          <Label
                            htmlFor="menu-qty-change"
                            className="text-xs font-semibold"
                          >
                            Quantity Change (pcs)
                            {menuStockForm.type === "adjustment" && (
                              <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                                (positive adds, negative subtracts)
                              </span>
                            )}
                          </Label>
                          <Input
                            id="menu-qty-change"
                            type="number"
                            min={
                              menuStockForm.type === "adjustment"
                                ? undefined
                                : 0
                            }
                            value={menuStockForm.quantityChange || ""}
                            onChange={(e) =>
                              setMenuStockForm((f) => ({
                                ...f,
                                quantityChange: Number(e.target.value) || 0,
                              }))
                            }
                            placeholder="e.g. 10"
                            className="h-10 bg-background text-sm"
                          />
                        </div>

                        {/* Quick pills */}
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Quick adjust pills:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {menuStockForm.type === "stock_in"
                              ? [1, 5, 10, 20, 50].map((n) => (
                                  <Button
                                    key={n}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 bg-background px-2.5 text-xs hover:bg-amber-50 hover:text-amber-700"
                                    onClick={() =>
                                      setMenuStockForm((f) => ({
                                        ...f,
                                        quantityChange:
                                          (f.quantityChange || 0) + n,
                                      }))
                                    }
                                  >
                                    +{n}
                                  </Button>
                                ))
                              : menuStockForm.type === "adjustment"
                                ? [-10, -5, -1, 1, 5, 10].map((n) => (
                                    <Button
                                      key={n}
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 bg-background px-2.5 text-xs hover:bg-amber-50 hover:text-amber-700"
                                      onClick={() =>
                                        setMenuStockForm((f) => ({
                                          ...f,
                                          quantityChange:
                                            (f.quantityChange || 0) + n,
                                        }))
                                      }
                                    >
                                      {n >= 0 ? `+${n}` : n}
                                    </Button>
                                  ))
                                : [1, 2, 5, 10].map((n) => (
                                    <Button
                                      key={n}
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 bg-background px-2.5 text-xs hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() =>
                                        setMenuStockForm((f) => ({
                                          ...f,
                                          quantityChange:
                                            (f.quantityChange || 0) + n,
                                        }))
                                      }
                                    >
                                      -{n}
                                    </Button>
                                  ))}
                            {menuStockForm.quantityChange !== 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() =>
                                  setMenuStockForm((f) => ({
                                    ...f,
                                    quantityChange: 0,
                                  }))
                                }
                              >
                                Reset
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Set exact balance */
                      <div className="grid gap-1.5">
                        <Label
                          htmlFor="menu-exact-qty"
                          className="text-xs font-semibold"
                        >
                          New Exact Stock (pcs)
                        </Label>
                        <Input
                          id="menu-exact-qty"
                          type="number"
                          min={0}
                          value={menuStockForm.exactQuantity}
                          onChange={(e) =>
                            setMenuStockForm((f) => ({
                              ...f,
                              exactQuantity: Math.max(
                                0,
                                Number(e.target.value) || 0
                              ),
                            }))
                          }
                          className="h-10 bg-background text-sm"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Directly sets the available count in the POS and
                          online menu.
                        </p>
                      </div>
                    )}

                    {/* Real-time Calculation Summary */}
                    <div className="space-y-1.5 rounded-lg border bg-background p-3 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Current stock:</span>
                        <span>
                          {updatingMenuItem.stockQuantity == null
                            ? "Unlimited"
                            : `${updatingMenuItem.stockQuantity} pcs`}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Resulting stock:</span>
                        <span className="text-sm font-bold text-amber-600">
                          {menuStockForm.isUnlimited
                            ? "Unlimited"
                            : menuStockForm.mode === "set"
                              ? `${menuStockForm.exactQuantity} pcs`
                              : `${Math.max(
                                  0,
                                  (updatingMenuItem.stockQuantity ?? 0) +
                                    (menuStockForm.type === "stock_in"
                                      ? Math.abs(menuStockForm.quantityChange)
                                      : menuStockForm.type === "adjustment"
                                        ? menuStockForm.quantityChange
                                        : -Math.abs(
                                            menuStockForm.quantityChange
                                          ))
                                )} pcs`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional Note */}
                <div className="grid gap-1.5">
                  <Label
                    htmlFor="menu-stock-note"
                    className="text-xs font-semibold"
                  >
                    Audit Note{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    id="menu-stock-note"
                    value={menuStockForm.note}
                    maxLength={255}
                    onChange={(e) =>
                      setMenuStockForm((f) => ({ ...f, note: e.target.value }))
                    }
                    placeholder="Reason for change, batch roasted, recount details..."
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>
              </div>

              <SheetFooter className="flex-row border-t bg-background p-4 sm:p-6">
                <Button
                  variant="outline"
                  onClick={() => setMenuStockSheetOpen(false)}
                  className="flex-1 border-amber-500 text-amber-700 hover:bg-amber-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveMenuStockUpdate}
                  className="flex-1 bg-amber-500 font-semibold text-neutral-950 hover:bg-amber-400"
                >
                  Save Stock
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
