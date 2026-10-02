import { api } from "./client"
import type { DashboardData, LiveOrder, TopItem } from "@/types/admin/dashboard"

export async function fetchDashboardData(): Promise<DashboardData> {
  const result = await api<DashboardData>("/dashboard")
  if (result.success && result.data) {
    return {
      totalOrders: Number(result.data.totalOrders ?? 0),
      ordersYesterday: Number(result.data.ordersYesterday ?? 0),
      revenue: Number(result.data.revenue ?? 0),
      revenueYesterday: Number(result.data.revenueYesterday ?? 0),
      occupiedTables: Number(result.data.occupiedTables ?? 0),
      totalTables: Number(result.data.totalTables ?? 0),
      reservationsToday: Number(result.data.reservationsToday ?? 0),
      qrOrders: Number(result.data.qrOrders ?? 0),
      revenueTrend: Array.isArray(result.data.revenueTrend)
        ? result.data.revenueTrend
        : [
            { day: "Mon", revenue: 0 },
            { day: "Tue", revenue: 0 },
            { day: "Wed", revenue: 0 },
            { day: "Thu", revenue: 0 },
            { day: "Fri", revenue: 0 },
            { day: "Sat", revenue: 0 },
            { day: "Sun", revenue: 0 },
          ],
      ordersBySource: Array.isArray(result.data.ordersBySource)
        ? result.data.ordersBySource
        : [
            { source: "QR", orders: 0 },
            { source: "Dine-in", orders: 0 },
            { source: "Takeout", orders: 0 },
          ],
      liveOrders: Array.isArray(result.data.liveOrders)
        ? (result.data.liveOrders as LiveOrder[])
        : [],
      topItems: Array.isArray(result.data.topItems)
        ? (result.data.topItems as TopItem[])
        : [],
    }
  }

  // Fallback: If dedicated dashboard endpoint returned an error, aggregate from individual endpoints
  try {
    const [reportsRes, tablesRes, ordersRes, reservationsRes] = await Promise.all([
      api<any>("/reports"),
      api<any>("/tables"),
      api<any>("/orders"),
      api<any>("/reservations"),
    ])

    const today = new Date().toISOString().slice(0, 10)
    const yesterdayDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

    const rawOrders = Array.isArray(ordersRes.data?.orders) ? ordersRes.data.orders : []
    const rawTables = Array.isArray(tablesRes.data?.tables) ? tablesRes.data.tables : []
    const rawReservations = Array.isArray(reservationsRes.data?.reservations)
      ? reservationsRes.data.reservations
      : []

    let totalOrdersToday = 0
    let ordersYesterday = 0
    let revenueToday = 0
    let revenueYesterday = 0
    let qrOrders = 0
    let dineInOrders = 0
    let takeoutOrders = 0

    const liveOrders: LiveOrder[] = []

    for (const order of rawOrders) {
      const orderDate = String(order.createdAt ?? "").slice(0, 10)
      const total = Number(order.total ?? 0)
      const isPaid = order.paymentStatus === "paid" || order.status === "completed"

      if (orderDate === today) {
        totalOrdersToday++
        if (isPaid) revenueToday += total
        const type = String(order.orderType ?? "").toLowerCase()
        if (type === "qr") qrOrders++
        else if (type === "takeout" || type === "take_out") takeoutOrders++
        else dineInOrders++
      } else if (orderDate === yesterdayDate) {
        ordersYesterday++
        if (isPaid) revenueYesterday += total
      }

      const st = String(order.status ?? "").toLowerCase()
      if (["pending", "preparing", "ready", "served"].includes(st) && liveOrders.length < 10) {
        const type = String(order.orderType ?? "").toLowerCase()
        const source = type === "qr" ? "QR" : type.includes("take") ? "Takeout" : "Dine-in"
        const formattedStatus =
          st === "pending"
            ? "Pending"
            : st === "preparing"
              ? "Preparing"
              : st === "ready"
                ? "Ready"
                : "Served"
        liveOrders.push({
          id: String(order.orderNumber ?? order.id),
          source,
          status: formattedStatus,
        })
      }
    }

    const occupiedTables = rawTables.filter(
      (t: any) => String(t.status).toLowerCase() === "occupied"
    ).length

    const reservationsToday = rawReservations.filter((r: any) => {
      const date = String(r.reservationDate ?? "").slice(0, 10)
      return (
        date === today &&
        !["cancelled", "declined", "completed", "no_show"].includes(
          String(r.status ?? "").toLowerCase()
        )
      )
    }).length

    const topItems: TopItem[] = Array.isArray(reportsRes.data?.topSellingItems)
      ? reportsRes.data.topSellingItems.slice(0, 5).map((item: any) => ({
          name: item.name ?? "Item",
          sales: Number(item.quantitySold ?? item.sales ?? 0),
        }))
      : []

    return {
      totalOrders: totalOrdersToday,
      ordersYesterday,
      revenue: revenueToday,
      revenueYesterday,
      occupiedTables,
      totalTables: rawTables.length,
      reservationsToday,
      qrOrders,
      revenueTrend: [
        { day: "Mon", revenue: 0 },
        { day: "Tue", revenue: 0 },
        { day: "Wed", revenue: 0 },
        { day: "Thu", revenue: 0 },
        { day: "Fri", revenue: 0 },
        { day: "Sat", revenue: 0 },
        { day: "Sun", revenue: 0 },
      ],
      ordersBySource: [
        { source: "QR", orders: qrOrders },
        { source: "Dine-in", orders: dineInOrders },
        { source: "Takeout", orders: takeoutOrders },
      ],
      liveOrders,
      topItems,
    }
  } catch (err) {
    throw new Error(result.error ?? "Failed to load dashboard data")
  }
}
