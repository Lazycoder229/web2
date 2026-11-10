
export type LiveOrder = {
  id: string
  source: "QR" | "Dine-in" | "Takeout"
  status: "Pending" | "Preparing" | "Ready" | "Served"
}

export type TopItem = { name: string; sales: number }

export type DashboardData = {
  totalOrders: number
  ordersYesterday: number
  revenue: number
  revenueYesterday: number
  occupiedTables: number
  totalTables: number
  reservationsToday: number
  qrOrders: number
  revenueTrend: { day: string; revenue: number }[]
  ordersBySource: { source: string; orders: number }[]
  liveOrders: LiveOrder[]
  topItems: TopItem[]
}
