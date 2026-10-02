"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  CalendarDays,
  Gift,
  QrCode,
  ReceiptText,
  Sparkles,
  UserRound,
} from "lucide-react"
import {
  customerLoyaltyAction,
  customerOrdersAction,
  customerReservationsAction,
} from "@/lib/api/customer"
import { Card, CardContent } from "@/components/ui/card"
import { useCustomerSession } from "@/components/customer/customer-session-context"

const quickLinks = [
  {
    href: "/customer/menu",
    label: "Order via QR",
    detail: "Browse the menu and place a QR order from your table.",
    icon: QrCode,
  },
  {
    href: "/customer/orders",
    label: "Order history",
    detail: "Review your past orders and digital receipts.",
    icon: ReceiptText,
  },
  {
    href: "/customer/reservations",
    label: "Reservations",
    detail: "Create or manage your reservations.",
    icon: CalendarDays,
  },
  {
    href: "/customer/loyalty",
    label: "Rewards",
    detail: "Check your points and available rewards.",
    icon: Gift,
  },
  {
    href: "/customer/account",
    label: "Account details",
    detail: "Update your customer profile.",
    icon: UserRound,
  },
]


export default function CustomerDashboardPage() {
  const router = useRouter()
  const {
    profile,
    status: profileStatus,
    loading: profileLoading,
  } = useCustomerSession()
  const [name, setName] = useState("")
  const [stats, setStats] = useState({ orders: 0, points: 0, reservations: 0 })
  const [loadError, setLoadError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (profileLoading || profileStatus === null)
      return () => {
        active = false
      }
    if (!profile) {
      if (profileStatus === 401 || profileStatus === 403)
        router.replace("/customer/login")
      else {
        setLoadError("Could not connect to your customer account. Please try again.")
        setLoading(false)
      }
      return () => {
        active = false
      }
    }
    setLoading(true)
    void Promise.all([
      customerOrdersAction(),
      customerLoyaltyAction(),
      customerReservationsAction(),
    ])
      .then(([orders, loyalty, reservations]) => {
        if (!active) return
        setLoadError("")
        setName(profile.name ?? "")
        setStats({
          orders:
            orders.success && Array.isArray(orders.data)
              ? orders.data.length
              : 0,
          points:
            loyalty.success && loyalty.data
              ? Number(loyalty.data.balance ?? 0)
              : 0,
          reservations:
            reservations.success && Array.isArray(reservations.data)
              ? reservations.data.filter((reservation: any) =>
                  ["pending", "confirmed"].includes(reservation.status)
                ).length
              : 0,
        })
      })
      .catch(() => {
        if (active)
          setLoadError("Could not connect to your customer account. Please try again.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [router, profile, profileLoading, profileStatus])

  const summaries = [
    {
      label: "Orders placed",
      value: String(stats.orders),
      icon: ReceiptText,
      note: "Your order history",
    },
    {
      label: "Loyalty points",
      value: stats.points.toLocaleString("en-PH"),
      icon: Gift,
      note: "Available to redeem",
    },
    {
      label: "Reservations",
      value: String(stats.reservations),
      icon: CalendarDays,
      note: "Upcoming or pending",
    },
  ]

  return (
    <main className="w-full min-w-0 space-y-4 sm:space-y-6">
      <section className="rounded-xl border bg-card p-4 shadow-xs sm:p-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-amber-600 uppercase">
            <Sparkles className="size-4" />
            Customer dashboard
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
            Welcome back, {name || "Customer"}!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your orders, reservations, and rewards are all in one place. Choose
            where you would like to continue.
          </p>
        </div>
      </section>

      {loadError && (
        <section
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <p className="font-medium">Your dashboard could not be loaded.</p>
          <p className="mt-1 text-muted-foreground">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 font-semibold text-amber-700 underline underline-offset-4"
          >
            Try again
          </button>
        </section>
      )}
      {loading && (
        <p className="sr-only" role="status">
          Loading customer dashboard
        </p>
      )}

      <section className="grid min-w-0 grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {summaries.map(({ label, value, icon: Icon, note }) => (
          <Card key={label} className="min-w-0 border bg-card shadow-xs">
            <CardContent className="flex items-start justify-between gap-3 p-3 sm:p-4">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
                  {label}
                </p>
                <p className="mt-1 text-lg font-bold tracking-tight sm:text-2xl">
                  {value}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs">
                  {note}
                </p>
              </div>
              <Icon className="size-4 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-bold sm:text-lg">Your account</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Quick access to your customer services.
            </p>
          </div>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {quickLinks.map(({ href, label, detail, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group block h-full rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Card className="h-full border bg-card shadow-xs transition-colors group-hover:border-amber-500/50">
                <CardContent className="flex h-full flex-col p-3 sm:p-4">
                  <span className="grid size-9 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
                    <Icon className="size-4" />
                  </span>
                  <h4 className="mt-3 font-semibold">{label}</h4>
                  <p className="mt-1 flex-1 text-sm leading-5 text-muted-foreground">
                    {detail}
                  </p>
                  <span className="mt-3 inline-flex items-center text-sm font-semibold text-amber-600">
                    Open{" "}
                    <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
