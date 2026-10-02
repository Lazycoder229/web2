"use client"

import * as React from "react"
import Link from "next/link"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  CalendarCheck,
  CreditCard,
  LayoutGrid,
  QrCode,
  RefreshCw,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { DashboardData, LiveOrder, TopItem } from "@/types/admin/dashboard"

import { fetchDashboardData } from "@/lib/api/dashboard"

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
})

/* ------------------------------------------------------------------ */
/* KPI card                                                            */
/* ------------------------------------------------------------------ */

function KpiCard({
  title,
  value,
  note,
  icon: Icon,
  positive,
  loading,
  className,
}: {
  title: string
  value: string
  note: string
  icon: LucideIcon
  positive?: boolean
  loading: boolean
  className?: string
}) {
  return (
    <Card className={cn("gap-2 border bg-card py-4 shadow-xs", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4">
        <CardDescription className="truncate text-xs lg:text-sm">
          {title}
        </CardDescription>
        <Icon className="hidden size-4 shrink-0 text-muted-foreground lg:block" />
      </CardHeader>
      <CardContent className="space-y-1 px-4">
        {loading ? (
          <>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <div className="text-xl font-bold tracking-tight lg:text-2xl">
              {value}
            </div>
            <p
              className={
                positive
                  ? "truncate text-xs text-emerald-600"
                  : "truncate text-xs text-muted-foreground"
              }
            >
              {note}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

const revenueConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig

const sourceConfig = {
  orders: { label: "Orders", color: "var(--chart-2)" },
} satisfies ChartConfig

function RevenueChart({ data }: { data: DashboardData["revenueTrend"] }) {
  return (
    <ChartContainer config={revenueConfig} className="h-60 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v) => `₱${v}`}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <Area
          dataKey="revenue"
          type="monotone"
          fill="var(--color-revenue)"
          fillOpacity={0.15}
          stroke="var(--color-revenue)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}

function SourceChart({ data }: { data: DashboardData["ordersBySource"] }) {
  return (
    <ChartContainer config={sourceConfig} className="h-60 w-full">
      <BarChart data={data} margin={{ left: 4, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="source"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={32}
          allowDecimals={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="orders" fill="var(--color-orders)" radius={6} />
      </BarChart>
    </ChartContainer>
  )
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

const statusStyle: Record<LiveOrder["status"], string> = {
  Pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  Preparing: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  Ready: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  Served: "bg-muted text-muted-foreground hover:bg-muted",
}

function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 px-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  )
}

function LiveOrders({
  orders,
  loading,
}: {
  orders: LiveOrder[]
  loading: boolean
}) {
  return (
    <Card className="border bg-card shadow-xs lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 sm:p-6 sm:pb-4">
        <CardTitle className="text-lg">Live orders</CardTitle>
        <Link
          href="/admin/orders"
          className="text-sm font-semibold text-orange-500 hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {loading ? (
          <TableSkeleton />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={3}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No live orders.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.id}</TableCell>
                    <TableCell>{o.source}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={statusStyle[o.status]}>
                        {o.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function TopSelling({
  items,
  loading,
}: {
  items: TopItem[]
  loading: boolean
}) {
  return (
    <Card className="border bg-card shadow-xs">
      <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4">
        <CardTitle className="text-lg">Top selling items</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {loading ? (
          <TableSkeleton />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={2}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No sales yet today.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((i) => (
                  <TableRow key={i.name}>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell className="text-right">{i.sales}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminDashboardPage() {
  const [data, setData] = React.useState<DashboardData | null>(null)
  const [error, setError] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const load = React.useCallback(() => {
    setIsRefreshing(true)
    setError(false)
    fetchDashboardData()
      .then((res) => {
        setData(res)
        setIsRefreshing(false)
      })
      .catch((err) => {
        console.error("Dashboard error:", err)
        setError(true)
        setIsRefreshing(false)
      })
  }, [])

  React.useEffect(() => {
    load()
    const timer = setInterval(load, 30_000)
    return () => clearInterval(timer)
  }, [load])

  const loading = data === null && !error

  if (error && !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">
          Hindi ma-load ang dashboard data. Subukan muli.
        </p>
        <button
          onClick={load}
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          Retry
        </button>
      </div>
    )
  }

  const d = data
  const qrShare =
    d && d.totalOrders > 0 ? Math.round((d.qrOrders / d.totalOrders) * 100) : 0
  const capacity =
    d && d.totalTables > 0
      ? Math.round((d.occupiedTables / d.totalTables) * 100)
      : 0

  return (
    <div className="w-full min-w-0 overflow-x-hidden pb-16 sm:pb-8">
      <div className="space-y-4 sm:space-y-6">
        {/* Header bar with title and refresh button */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Dashboard
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Live operational overview of sales, tables, reservations, and orders.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw
                className={cn("size-3.5", isRefreshing && "animate-spin")}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* KPI cards: 2 cols on mobile, 5 in one row from md up */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <KpiCard
            loading={loading}
            title="Total Orders"
            icon={ShoppingBag}
            value={String(d?.totalOrders ?? 0)}
            note={
              d?.ordersYesterday
                ? `${d.ordersYesterday} orders yesterday`
                : "No orders yesterday"
            }
          />
          <KpiCard
            loading={loading}
            title="Total Revenue"
            icon={CreditCard}
            value={peso.format(d?.revenue ?? 0)}
            note={
              d?.revenueYesterday
                ? `${peso.format(d.revenueYesterday)} yesterday`
                : "No revenue yesterday"
            }
          />
          <KpiCard
            loading={loading}
            title="Occupied Tables"
            icon={LayoutGrid}
            value={`${d?.occupiedTables ?? 0} / ${d?.totalTables ?? 0}`}
            note={`${capacity}% current capacity`}
          />
          <KpiCard
            loading={loading}
            title="Today's Reservations"
            icon={CalendarCheck}
            value={String(d?.reservationsToday ?? 0)}
            note="Today's scheduled guests"
            positive
          />
          <KpiCard
            className="col-span-2 md:col-span-1"
            loading={loading}
            title="QR Orders"
            icon={QrCode}
            value={String(d?.qrOrders ?? 0)}
            note={`${qrShare}% of total orders`}
            positive
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border bg-card shadow-xs lg:col-span-2">
            <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4">
              <CardTitle className="text-lg">Revenue this week</CardTitle>
              <CardDescription>Daily revenue, Monday to Sunday</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              {loading || !d ? (
                <Skeleton className="h-60 w-full" />
              ) : (
                <RevenueChart data={d.revenueTrend} />
              )}
            </CardContent>
          </Card>

          <Card className="border bg-card shadow-xs">
            <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4">
              <CardTitle className="text-lg">Orders by source</CardTitle>
              <CardDescription>
                Where today&apos;s orders come from
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              {loading || !d ? (
                <Skeleton className="h-60 w-full" />
              ) : (
                <SourceChart data={d.ordersBySource} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Live orders + top items */}
      <div className="mt-4 grid gap-4 sm:mt-6 lg:grid-cols-3">
        <LiveOrders orders={d?.liveOrders ?? []} loading={loading} />
        <TopSelling items={d?.topItems ?? []} loading={loading} />
      </div>
    </div>
  )
}
