"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus, QrCode, ShoppingBag, Utensils, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/sonner"
import { getMenuDataAction } from "@/lib/api/menu"
import { fetchTables, occupyTableAction } from "@/lib/api/tables"
import { getCustomerAccessToken } from "@/lib/api/client"
import { createCustomerQrOrder } from "@/lib/api/customer"
import { fetchSystemSettings } from "@/lib/api/settings"
import type { Category, MenuItem } from "@/types/admin/menu"

type TableOption = {
  id: string
  tableNumber: string
  capacity: number
  status?: string
}
type CartLine = { item: MenuItem; quantity: number }
type CustomerPaymentMethod = "counter" | "gcash" | "maya"

type QrOrderExperienceProps = {
  tableId?: string
  embedded?: boolean
  showCartWhenEmpty?: boolean
  restoreLastOrder?: boolean
  allowSavedTableContext?: boolean
}

const money = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function QrOrderExperience({
  tableId: initialTableId,
  embedded = false,
  showCartWhenEmpty = false,
  restoreLastOrder = false,
  allowSavedTableContext = true,
}: QrOrderExperienceProps) {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [tables, setTables] = useState<TableOption[]>([])
  const [allTables, setAllTables] = useState<TableOption[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [cartSheetOpen, setCartSheetOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] =
    useState<CustomerPaymentMethod>("counter")
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentQrImages, setPaymentQrImages] = useState({
    gcash: "",
    maya: "",
  })
  const [selectedTable, setSelectedTable] = useState(initialTableId ?? "")
  const [activeCategory, setActiveCategory] = useState("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [tablesError, setTablesError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    let active = true
    void Promise.all([
      getMenuDataAction(),
      fetchTables(),
      fetchSystemSettings(),
    ])
      .then(([menuResult, tableResult, settingsResult]) => {
        if (!active) return
        if (menuResult.success && menuResult.data) {
          setCategories(
            menuResult.data.categories.filter((category) => category.isActive)
          )
          setItems(menuResult.data.items.filter((item) => item.isAvailable))
        } else setLoadError(menuResult.error ?? "Could not load the menu.")
        const tableRows = Array.isArray(tableResult)
          ? tableResult
          : tableResult?.success && Array.isArray(tableResult.data)
            ? tableResult.data
            : null
        if (tableRows) {
          setAllTables(tableRows)
          const availableTables = tableRows.filter(
            (table: TableOption) => table.status !== "reserved"
          )
          setTables(availableTables)
          if (availableTables.length === 0) {
            setTablesError(
              "No tables are available right now. Please ask staff for help."
            )
          }
        } else {
          setTablesError(
            tableResult?.error ?? "Could not load restaurant tables. Try again."
          )
        }
        if (settingsResult.success && settingsResult.data) {
          setPaymentQrImages({
            gcash: settingsResult.data.gcashQrImage ?? "",
            maya: settingsResult.data.mayaQrImage ?? "",
          })
        }
      })
      .catch(() => {
        if (active)
          setLoadError("Could not connect to the menu. Please try again.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (initialTableId) setSelectedTable(initialTableId)
  }, [initialTableId])

  // Scanning a table QR marks that table occupied right away, so staff see it
  // in the admin before the customer has ordered or paid. Only signed-in
  // customers can order, so only they hold a table.
  useEffect(() => {
    if (initialTableId && getCustomerAccessToken()) {
      void occupyTableAction(initialTableId)
    }
  }, [initialTableId])

  useEffect(() => {
    if (
      !allowSavedTableContext ||
      initialTableId ||
      typeof window === "undefined"
    )
      return
    const saved = window.sessionStorage.getItem("prime-pos:customer-table-id")
    if (saved) setSelectedTable(saved)
  }, [allowSavedTableContext, initialTableId])

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter(
      (item) =>
        (activeCategory === "all" || item.categoryId === activeCategory) &&
        (!query ||
          `${item.name} ${item.description ?? ""}`
            .toLowerCase()
            .includes(query))
    )
  }, [items, activeCategory, search])
  const subtotal = cart.reduce(
    (sum, line) => sum + line.item.price * line.quantity,
    0
  )
  const table = allTables.find((row) => row.id === selectedTable)
  // A scanned QR locks the table, but only when that table really exists.
  // If the QR points to an unknown table, let the customer pick one instead
  // of leaving them stuck on a locked, empty choice.
  const tableLocked =
    Boolean(initialTableId) &&
    (loading ||
      allTables.length === 0 ||
      allTables.some((row) => row.id === initialTableId))

  useEffect(() => {
    if (
      initialTableId &&
      !loading &&
      allTables.length > 0 &&
      !allTables.some((row) => row.id === initialTableId)
    ) {
      setSelectedTable((current) => (current === initialTableId ? "" : current))
    }
  }, [initialTableId, loading, allTables])

  function addItem(item: MenuItem) {
    setCart((current) => {
      const existing = current.find((line) => line.item.id === item.id)
      return existing
        ? current.map((line) =>
            line.item.id === item.id
              ? { ...line, quantity: line.quantity + 1 }
              : line
          )
        : [...current, { item, quantity: 1 }]
    })
  }

  function changeQuantity(itemId: string, amount: number) {
    setCart((current) =>
      current
        .map((line) =>
          line.item.id === itemId
            ? { ...line, quantity: line.quantity + amount }
            : line
        )
        .filter((line) => line.quantity > 0)
    )
  }

  async function placeOrder() {
    if (!selectedTable) {
      toast.error("Choose a table before placing your QR order.")
      return
    }
    if (!cart.length) {
      toast.error("Add at least one item to your order.")
      return
    }
    if (paymentMethod !== "counter") {
      if (!paymentQrImages[paymentMethod]) {
        toast.error(`${paymentMethod.toUpperCase()} is not available yet.`, {
          description: "Please pay at the counter or ask staff for help.",
        })
        return
      }
      setPaymentReference("")
      setCartSheetOpen(false)
      setPaymentDialogOpen(true)
      return
    }
    await submitOrder()
  }

  async function submitOrder(referenceNumber?: string) {
    const hasCustomerAccount = Boolean(getCustomerAccessToken())
    setSubmitting(true)
    const result = await createCustomerQrOrder({
      tableId: selectedTable,
      orderType: "qr",
      ...(paymentMethod !== "counter"
        ? { paymentMethod, paymentReference: referenceNumber }
        : {}),
      items: cart.map(({ item, quantity }) => ({
        menuItemId: item.id,
        quantity,
      })),
    })
    setSubmitting(false)
    if (!result.success || !result.data) {
      toast.error("Could not place your order", {
        description:
          result.error ??
          "The server did not confirm the order. Check with staff before trying again.",
      })
      return
    }
    if (typeof window !== "undefined")
      window.sessionStorage.setItem(
        "prime-pos:customer-table-id",
        selectedTable
      )
    setCart([])
    setCartSheetOpen(false)
    setPaymentDialogOpen(false)
    toast.success(
      paymentMethod === "counter"
        ? "Order sent to the kitchen."
        : "Payment submitted for verification.",
      {
        description:
          paymentMethod === "counter"
            ? `Order ${result.data.orderNumber}`
            : `Order ${result.data.orderNumber} · ${paymentMethod.toUpperCase()}`,
      }
    )
    if (
      hasCustomerAccount &&
      paymentMethod !== "gcash" &&
      paymentMethod !== "maya"
    ) {
      router.push(`/customer/receipt/${result.data.order.id}`)
    } else if (hasCustomerAccount) {
      router.push("/customer/orders")
    }
  }

  async function submitWalletOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const reference = paymentReference.trim()
    if (!reference) {
      toast.error("Enter the transaction reference shown by your wallet app.")
      return
    }
    await submitOrder(reference)
  }

  return (
    <div className="space-y-5 pb-24 xl:pb-0">
      <Toaster />
      {!embedded && (
        <section className="rounded-xl border bg-card p-5 shadow-xs sm:p-7">
          <p className="text-xs font-semibold tracking-wide text-amber-600 uppercase">
            {tableIdLabel(selectedTable, table)}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Order from the menu
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose your items and send your order directly to the kitchen.
          </p>
        </section>
      )}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-4">
          <Card className="shadow-xs">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <QrCode className="size-4 text-amber-600" />
                {table ? table.tableNumber : "Choose your table"}
              </div>
              {tableLocked ? (
                <Badge variant="outline">QR table locked</Badge>
              ) : (
                <select
                  value={selectedTable}
                  onChange={(event) => setSelectedTable(event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm sm:w-auto sm:min-w-52"
                >
                  <option value="">Select a table</option>
                  {tables.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.tableNumber} · {row.capacity} seats
                    </option>
                  ))}
                </select>
              )}
            </CardContent>
          </Card>
          {tablesError && !tableLocked && (
            <p
              role="status"
              className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-800 dark:text-amber-300"
            >
              {tablesError}
            </p>
          )}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              size="default"
              variant={activeCategory === "all" ? "default" : "outline"}
              className={
                activeCategory === "all"
                  ? "min-h-11 shrink-0 bg-amber-500 text-amber-950 hover:bg-amber-400"
                  : "min-h-11 shrink-0"
              }
              onClick={() => setActiveCategory("all")}
            >
              All items
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                size="default"
                variant={activeCategory === category.id ? "default" : "outline"}
                className={
                  activeCategory === category.id
                    ? "min-h-11 shrink-0 bg-amber-500 text-amber-950 hover:bg-amber-400"
                    : "min-h-11 shrink-0"
                }
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search menu"
            aria-label="Search menu"
            className="min-h-11"
          />
          {loadError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {loadError}
            </p>
          )}
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((row) => (
                <Skeleton key={row} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                No menu items match your search.
              </CardContent>
            </Card>
          ) : (
            <div className="grid items-stretch gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {visibleItems.map((item) => (
                <Card
                  key={item.id}
                  className="flex h-full min-w-0 flex-col overflow-hidden border shadow-xs transition-shadow hover:shadow-md"
                >
                  <div
                    className="relative h-36 w-full shrink-0 overflow-hidden bg-muted sm:h-40"
                    style={{ height: "clamp(9rem, 22vw, 11rem)" }}
                  >
                    <div className="grid size-full place-items-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="absolute inset-0 block size-full object-cover"
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <Utensils className="size-8 text-muted-foreground/50" />
                      )}
                    </div>
                  </div>
                  <CardContent className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 text-sm leading-5 font-semibold sm:text-base">
                        {item.name}
                      </h3>
                      <span className="shrink-0 text-sm font-bold text-foreground">
                        {money(item.price)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-end pt-4">
                      <Button
                        onClick={() => addItem(item)}
                        className="min-h-10 bg-amber-500 text-amber-950 hover:bg-amber-400"
                      >
                        <Plus className="mr-1" />
                        Add to order
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
        {(showCartWhenEmpty || cart.length > 0) && (
          <aside className="hidden xl:block">
            <Card className="sticky top-6 shadow-xs">
              <CartContents
                cart={cart}
                subtotal={subtotal}
                submitting={submitting}
                onChangeQuantity={changeQuantity}
                onRemove={(itemId) =>
                  setCart((current) =>
                    current.filter((line) => line.item.id !== itemId)
                  )
                }
                paymentMethod={paymentMethod}
                paymentQrImages={paymentQrImages}
                onPaymentMethodChange={setPaymentMethod}
                onPlaceOrder={placeOrder}
              />
            </Card>
          </aside>
        )}
      </div>
      {(showCartWhenEmpty || cart.length > 0) && (
        <>
          <div className="fixed inset-x-3 bottom-3 z-40 xl:hidden">
            <Button
              onClick={() => setCartSheetOpen(true)}
              className="h-12 w-full justify-between bg-amber-500 px-4 text-amber-950 shadow-lg hover:bg-amber-400"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="size-4" />
                {cart.reduce((sum, line) => sum + line.quantity, 0)} items
              </span>
              <span>
                {cart.length
                  ? `Review order · ${money(subtotal)}`
                  : "View order"}
              </span>
            </Button>
          </div>
          <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
            <SheetContent
              side="bottom"
              className="max-h-[88dvh] overflow-y-auto rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <SheetHeader className="pr-12 text-left">
                <SheetTitle>Your order</SheetTitle>
                <SheetDescription>
                  Review items before sending them to the kitchen.
                </SheetDescription>
              </SheetHeader>
              <CartContents
                cart={cart}
                subtotal={subtotal}
                submitting={submitting}
                onChangeQuantity={changeQuantity}
                onRemove={(itemId) =>
                  setCart((current) =>
                    current.filter((line) => line.item.id !== itemId)
                  )
                }
                paymentMethod={paymentMethod}
                paymentQrImages={paymentQrImages}
                onPaymentMethodChange={setPaymentMethod}
                onPlaceOrder={placeOrder}
              />
            </SheetContent>
          </Sheet>
        </>
      )}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay with {paymentMethod.toUpperCase()}</DialogTitle>
            <DialogDescription>
              Scan the restaurant QR code, complete the transfer, then enter the
              transaction reference from your wallet app.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitWalletOrder} className="space-y-4">
            <div className="rounded-xl border bg-white p-3">
              <img
                src={
                  paymentQrImages[
                    paymentMethod === "counter" ? "gcash" : paymentMethod
                  ]
                }
                alt={`${paymentMethod.toUpperCase()} payment QR code`}
                className="mx-auto max-h-[min(45dvh,360px)] w-full object-contain"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Amount due</span>
              <span className="font-semibold">{money(subtotal)}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-payment-reference">
                Transaction reference
              </Label>
              <Input
                id="wallet-payment-reference"
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder="Enter the reference from your payment receipt"
                className="min-h-11"
                maxLength={100}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="min-h-11 w-full bg-amber-500 text-amber-950 hover:bg-amber-400"
            >
              {submitting ? "Submitting order…" : "I’ve paid · Submit order"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Staff will verify your payment before marking the order as paid.
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CartContents({
  cart,
  subtotal,
  submitting,
  onChangeQuantity,
  onRemove,
  paymentMethod,
  paymentQrImages,
  onPaymentMethodChange,
  onPlaceOrder,
}: {
  cart: CartLine[]
  subtotal: number
  submitting: boolean
  onChangeQuantity: (itemId: string, amount: number) => void
  onRemove: (itemId: string) => void
  paymentMethod: CustomerPaymentMethod
  paymentQrImages: { gcash: string; maya: string }
  onPaymentMethodChange: (method: CustomerPaymentMethod) => void
  onPlaceOrder: () => void
}) {
  return (
    <CardContent className="p-4 pt-0">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShoppingBag className="size-4 text-amber-600" />
          Your order
        </h2>
        <Badge variant="secondary">
          {cart.reduce((sum, line) => sum + line.quantity, 0)} items
        </Badge>
      </div>
      {cart.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Your cart is empty. Add something from the menu to get started.
        </div>
      ) : (
        <div className="max-h-[40dvh] space-y-3 overflow-y-auto">
          {cart.map(({ item, quantity }) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 border-b pb-3"
            >
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {money(item.price * quantity)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={`Remove one ${item.name}`}
                  onClick={() => onChangeQuantity(item.id, -1)}
                >
                  <Minus />
                </Button>
                <span className="w-4 text-center text-sm">{quantity}</span>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={`Add one ${item.name}`}
                  onClick={() => onChangeQuantity(item.id, 1)}
                >
                  <Plus />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => onRemove(item.id)}
                >
                  <X />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <fieldset className="mt-4 space-y-2">
        <legend className="mb-2 text-sm font-medium">Payment method</legend>
        {(
          [
            ["counter", "Pay at the counter", "Settle your bill with staff."],
            [
              "gcash",
              "GCash",
              "Scan the restaurant QR and submit your reference.",
            ],
            [
              "maya",
              "Maya",
              "Scan the restaurant QR and submit your reference.",
            ],
          ] as const
        ).map(([method, label, description]) => {
          const isWallet = method !== "counter"
          const isConfigured = !isWallet || Boolean(paymentQrImages[method])
          const isSelected = paymentMethod === method
          return (
            <button
              key={method}
              type="button"
              aria-pressed={isSelected}
              disabled={!isConfigured}
              onClick={() => onPaymentMethodChange(method)}
              className={`flex min-h-14 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isSelected ? "border-amber-500 bg-amber-500/5" : "hover:bg-muted/50"}`}
            >
              <span
                className={`grid size-4 shrink-0 place-items-center rounded-full border ${isSelected ? "border-amber-600" : "border-muted-foreground/50"}`}
              >
                {isSelected && (
                  <span className="size-2 rounded-full bg-amber-600" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">
                  {isConfigured
                    ? description
                    : "QR not uploaded in admin settings."}
                </span>
              </span>
            </button>
          )
        })}
      </fieldset>
      <div className="mt-4 flex justify-between border-t pt-4 font-semibold">
        <span>Subtotal</span>
        <span>{money(subtotal)}</span>
      </div>
      <Button
        disabled={submitting || cart.length === 0}
        onClick={onPlaceOrder}
        className="mt-4 h-11 w-full bg-amber-500 text-amber-950 hover:bg-amber-400"
      >
        {submitting
          ? "Sending order…"
          : paymentMethod === "counter"
            ? "Place order"
            : "Continue to payment"}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Staff will verify wallet payments before your order is marked as paid.
      </p>
    </CardContent>
  )
}

function tableIdLabel(id: string, table?: TableOption) {
  return table
    ? table.tableNumber
    : id
      ? "Table QR order"
      : "Choose your table"
}
