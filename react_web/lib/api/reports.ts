import { api } from "./client"

type AnyInput = Record<string, unknown>
type ReportsResult = {
  success: boolean
  data: {
    summary: any
    dailySales: any[]
    paymentBreakdown: any[]
    orderTypeBreakdown: any[]
    transactions: any[]
    topSellingItems: any[]
    categoryRevenue: any[]
    staffPerformance: any[]
    discountInsights: any[]
    promoInsights: any[]
    expenses: any[]
    categories: any[]
  }
  error?: string
}

export function fetchReportsData(): Promise<ReportsResult> {
  return api<any>("/reports").then((result) => {
    if (!result.success) return result as ReportsResult

    const data = result.data ?? {}
    return {
      ...result,
      data: {
        summary: data.summary ?? {
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
          totalTransactions: 0,
          profitMargin: 0,
        },
        dailySales: data.dailySales ?? [],
        paymentBreakdown: data.paymentBreakdown ?? [],
        orderTypeBreakdown: data.orderTypeBreakdown ?? [],
        transactions: data.transactions ?? [],
        topSellingItems: data.topSellingItems ?? [],
        categoryRevenue: data.categoryRevenue ?? [],
        staffPerformance: data.staffPerformance ?? [],
        discountInsights: data.discountInsights ?? [],
        promoInsights: data.promoInsights ?? [],
        expenses: data.expenses ?? [],
        categories: data.categories ?? [],
      },
    } as ReportsResult
  })
}
export function createExpenseAction(input: AnyInput): Promise<any> {
  return api<any>("/expenses", { method: "POST", body: JSON.stringify(input) })
}
