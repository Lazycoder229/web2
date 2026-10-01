"use client"

import { Wifi } from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
// `store` mirrors the relevant fields from SystemSettingsValues (Settings >
// Receipt & Print tab), so you can pass the result of fetchSystemSettings()
// straight through after mapping it to this shape.

export interface DigitalReceiptStoreInfo {
  restaurantName: string
  branchName?: string
  address?: string
  contactNumber?: string
  tinNumber?: string
  birMin?: string
  receiptHeader?: string
  receiptFooter?: string
  currencySymbol: string
  vatEnabled: boolean
  vatRate: number
  vatInclusive: boolean
  serviceChargeEnabled?: boolean
  serviceChargeRate?: number
  showWifiOnReceipt: boolean
  wifiSsid?: string
  wifiPassword?: string
}

export interface DigitalReceiptItem {
  name: string
  quantity: number
  price: number
}

export interface DigitalReceiptOrderInfo {
  orderNumber: string
  table: string
  source: string
  customer: string
  time: string
  items: DigitalReceiptItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  status?: string
}

export interface DigitalReceiptPaymentInfo {
  receiptNumber?: string
  amountPaid?: number
  change?: number
  paymentMethod?: "cash" | "gcash" | "maya" | "card" | "other"
  referenceNumber?: string | null
}

interface DigitalReceiptProps {
  store: DigitalReceiptStoreInfo
  order: DigitalReceiptOrderInfo
  /** Pass this once a payment has been recorded to show the "paid" version of the slip. */
  payment?: DigitalReceiptPaymentInfo
  className?: string
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  gcash: "GCash",
  maya: "Maya",
  card: "Card",
  other: "Other",
}

function money(symbol: string, value: number) {
  return `${symbol}${(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DigitalReceipt({ store, order, payment, className }: DigitalReceiptProps) {
  const parsedOrderTime = order.time ? new Date(order.time) : new Date()
  const orderTime = Number.isNaN(parsedOrderTime.getTime()) ? new Date() : parsedOrderTime
  const dateLabel = orderTime.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
  const timeLabel = orderTime.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })

  return (
    <div className={`digital-receipt-print flex justify-center bg-muted/20 p-4 print:bg-white print:p-0 ${className ?? ""}`}>
      {/* Print isolation: only this slip prints, everything else on the page hides. */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .digital-receipt-print, .digital-receipt-print * { visibility: visible; }
          .digital-receipt-print { position: fixed; inset: 0; }
        }
      `}</style>

      {/* Paper slip */}
      <div className="w-full max-w-[320px] rounded border border-neutral-300 bg-amber-50/70 p-4 font-mono text-[11px] leading-relaxed text-neutral-900 shadow-md select-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 print:w-[80mm] print:max-w-none print:rounded-none print:border-0 print:bg-white print:text-black print:shadow-none">
        {/* Header */}
        <div className="space-y-0.5 border-b border-dashed border-neutral-400 pb-2 text-center dark:border-neutral-700">
          <div className="text-xs font-bold uppercase tracking-wider">{store.restaurantName}</div>
          {store.branchName && (
            <div className="text-[10px] text-neutral-600 dark:text-neutral-400">{store.branchName}</div>
          )}
          {store.address && (
            <div className="text-[9px] text-neutral-500 dark:text-neutral-400">{store.address}</div>
          )}
          {store.contactNumber && (
            <div className="text-[9px] text-neutral-500 dark:text-neutral-400">Tel: {store.contactNumber}</div>
          )}
          {store.tinNumber && (
            <div className="text-[9px] text-neutral-600 dark:text-neutral-300">VAT REG TIN: {store.tinNumber}</div>
          )}
          {store.birMin && (
            <div className="text-[9px] text-neutral-600 dark:text-neutral-300">MIN: {store.birMin}</div>
          )}
          {store.receiptHeader && (
            <div className="whitespace-pre-line pt-1 text-[9px] italic text-neutral-700 dark:text-neutral-300">
              {store.receiptHeader}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="space-y-0.5 border-b border-dashed border-neutral-400 py-2 text-[10px] dark:border-neutral-700">
          <div className="flex justify-between">
            <span>{payment?.receiptNumber ? `OR: ${payment.receiptNumber}` : `Order: ${order.orderNumber}`}</span>
            <span>{order.table}</span>
          </div>
          <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
            <span>Date: {dateLabel}</span>
            <span>{timeLabel}</span>
          </div>
          <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
            <span className="truncate pr-2">Customer: {order.customer}</span>
            <span>{order.source}</span>
          </div>
          <div className={`pt-1 text-center text-[10px] font-bold uppercase tracking-wide ${payment ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
            {payment ? `Paid · ${payment.paymentMethod ?? "Payment received"}` : "Order receipt · payment due"}
          </div>
        </div>

        {/* Items */}
        <div className="space-y-1 border-b border-dashed border-neutral-400 py-2 dark:border-neutral-700">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between gap-2 text-neutral-700 dark:text-neutral-300">
              <span className="truncate">
                {item.quantity}x {item.name}
              </span>
              <span className="shrink-0">{money(store.currencySymbol, item.quantity * item.price)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-0.5 border-b border-dashed border-neutral-400 py-2 text-[10px] dark:border-neutral-700">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{money(store.currencySymbol, order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-rose-600 dark:text-rose-400">
              <span>Discount:</span>
              <span>-{money(store.currencySymbol, order.discount)}</span>
            </div>
          )}
          {order.tax > 0 && (
            <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
              <span>
                {store.vatEnabled ? `VAT (${store.vatRate}%)${store.vatInclusive ? " incl." : ""}` : "Tax"}:
              </span>
              <span>{money(store.currencySymbol, order.tax)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-neutral-300 pt-1 text-xs font-bold dark:border-neutral-700">
            <span>TOTAL:</span>
            <span>{money(store.currencySymbol, order.total)}</span>
          </div>
        </div>

        {/* Payment (only once the order has actually been paid) */}
        {payment && payment.amountPaid !== undefined && (
          <div className="space-y-0.5 border-b border-dashed border-neutral-400 py-2 text-[10px] dark:border-neutral-700">
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="font-semibold">{paymentMethodLabels[payment.paymentMethod ?? "cash"]}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Tendered:</span>
              <span>{money(store.currencySymbol, payment.amountPaid)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Change:</span>
              <span>{money(store.currencySymbol, payment.change ?? 0)}</span>
            </div>
            {payment.referenceNumber && (
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Reference:</span>
                <span className="truncate pl-2">{payment.referenceNumber}</span>
              </div>
            )}
          </div>
        )}

        {/* Wi-Fi + footer */}
        <div className="space-y-1 pt-2 text-center text-[9px]">
          {store.showWifiOnReceipt && store.wifiSsid && (
            <div className="rounded bg-neutral-200/60 p-1.5 text-center font-mono text-[9px] dark:bg-neutral-800">
              <div className="flex items-center justify-center gap-1">
                <Wifi className="size-3" />
                Wi-Fi: <span className="font-bold">{store.wifiSsid}</span>
              </div>
              {store.wifiPassword && (
                <div>
                  Pass: <span className="font-bold">{store.wifiPassword}</span>
                </div>
              )}
            </div>
          )}
          {store.receiptFooter && (
            <div className="whitespace-pre-line pt-1 italic text-neutral-600 dark:text-neutral-400">
              {store.receiptFooter}
            </div>
          )}
          <div className="pt-1 text-[8px] text-neutral-400">
            {payment ? "THIS SERVES AS AN OFFICIAL RECEIPT" : "THIS SERVES AS AN OFFICIAL SALES INVOICE"}
          </div>
        </div>
      </div>
    </div>
  )
}