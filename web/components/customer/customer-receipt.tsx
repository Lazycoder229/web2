"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, Printer, ReceiptText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DigitalReceipt,
  type DigitalReceiptOrderInfo,
  type DigitalReceiptStoreInfo,
} from "@/components/digital-receipt"
import { fetchSystemSettings } from "@/lib/api/settings"
import { fetchCustomerOrder } from "@/lib/api/customer"

const defaultStore: DigitalReceiptStoreInfo = {
  restaurantName: "PRIME POS",
  branchName: "",
  address: "",
  contactNumber: "",
  tinNumber: "",
  birMin: "",
  receiptHeader: "",
  receiptFooter: "Thank you for dining with us!",
  currencySymbol: "₱",
  vatEnabled: false,
  vatRate: 12,
  vatInclusive: false,
  serviceChargeEnabled: false,
  serviceChargeRate: 0,
  showWifiOnReceipt: false,
  wifiSsid: "",
  wifiPassword: "",
}

export function CustomerReceipt({
  orderId,
  embedded = false,
}: {
  orderId: string
  embedded?: boolean
}) {
  const [order, setOrder] = useState<DigitalReceiptOrderInfo | null>(null)
  const [paymentPending, setPaymentPending] = useState(false)
  const [store, setStore] = useState(defaultStore)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    void Promise.all([fetchCustomerOrder(orderId), fetchSystemSettings()])
      .then(([orderResult, settingsResult]) => {
        if (!active) return
        if (orderResult.success && orderResult.data) {
          const row = orderResult.data.order
          if (row.paymentStatus === "awaiting_verification") {
            setPaymentPending(true)
          } else
            setOrder({
              orderNumber: row.orderNumber,
              table: row.table ?? (row.tableId ? "Dine-in" : "Takeout"),
              source: row.orderType === "qr" ? "QR order" : "Order",
              customer: "Customer",
              time: row.createdAt ?? new Date().toISOString(),
              items: row.items.map((item) => ({
                name: item.name,
                quantity: Number(item.quantity),
                price: Number(item.price),
              })),
              subtotal: Number(row.subtotal),
              discount: Number(row.discount),
              tax: Number(row.tax),
              total: Number(row.total),
              status: row.status,
            })
        } else
          setError(
            orderResult.error ??
              "This order could not be found in your account."
          )
        if (settingsResult.success && settingsResult.data) {
          const settings = settingsResult.data
          setStore((current) => ({
            ...current,
            restaurantName: settings.restaurantName ?? current.restaurantName,
            branchName: settings.branchName ?? current.branchName,
            address: settings.address ?? current.address,
            contactNumber: settings.contactNumber ?? current.contactNumber,
            tinNumber: settings.tinNumber ?? current.tinNumber,
            birMin: settings.birMin ?? current.birMin,
            receiptHeader: settings.receiptHeader ?? current.receiptHeader,
            receiptFooter: settings.receiptFooter ?? current.receiptFooter,
            currencySymbol: settings.currencySymbol ?? current.currencySymbol,
            vatEnabled: Boolean(settings.vatEnabled),
            vatRate: Number(settings.vatRate ?? current.vatRate),
            vatInclusive: Boolean(settings.vatInclusive),
            serviceChargeEnabled: Boolean(settings.serviceChargeEnabled),
            serviceChargeRate: Number(settings.serviceChargeRate ?? 0),
            showWifiOnReceipt: Boolean(settings.showWifiOnReceipt),
            wifiSsid: settings.wifiSsid ?? "",
            wifiPassword: settings.wifiPassword ?? "",
          }))
        }
      })
      .catch(() => {
        if (active) setError("Could not load the order receipt.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [orderId])

  const receiptContent = loading ? (
    <Skeleton className="mx-auto h-[420px] w-full max-w-sm" />
  ) : paymentPending ? (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
      <p className="font-medium">Payment verification in progress</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Staff will verify your wallet transfer. Your digital receipt will be
        available after the payment is confirmed.
      </p>
      {!embedded && (
        <Button asChild variant="outline" className="mt-4">
          <Link href="/customer/orders">Back to orders</Link>
        </Button>
      )}
    </div>
  ) : error || !order ? (
    <div className="rounded-xl border border-dashed p-10 text-center">
      <p className="font-medium">Receipt unavailable</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {error || "This order could not be found."}
      </p>
      {!embedded && (
        <Button asChild variant="outline" className="mt-4">
          <Link href="/customer/orders">Back to orders</Link>
        </Button>
      )}
    </div>
  ) : (
    <DigitalReceipt store={store} order={order} />
  )

  if (embedded) {
    return (
      <div className="space-y-3">
        {receiptContent}
        {!loading && !paymentPending && order && (
          <Button
            onClick={() => window.print()}
            className="h-9 w-full bg-amber-500 text-amber-950 hover:bg-amber-400"
          >
            <Printer className="mr-1 size-4" />
            Print receipt
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-amber-600 uppercase">
            Customer portal
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Digital receipt
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Receipt details for an order connected to your account.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/customer/orders">
              <ArrowLeft className="mr-1" />
              Orders
            </Link>
          </Button>
          <Button
            disabled={!order}
            onClick={() => window.print()}
            className="bg-amber-500 text-amber-950 hover:bg-amber-400"
          >
            <Printer className="mr-1" />
            Print
          </Button>
        </div>
      </div>
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="size-5 text-amber-600" />
            Order receipt
          </CardTitle>
          <CardDescription>
            Based on the receipt and tax settings configured by the restaurant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {receiptContent}
        </CardContent>
      </Card>
    </div>
  )
}
