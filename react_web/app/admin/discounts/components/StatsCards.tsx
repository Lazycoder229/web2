import { BadgePercent, CalendarRange, Flame, ShoppingBag } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface StatsCardsProps {
  active: number
  scheduled: number
  totalUsage: number
  discountTypes: number
  loading?: boolean
}

export function StatsCards({
  active,
  scheduled,
  totalUsage,
  discountTypes,
  loading = false,
}: StatsCardsProps) {
  const metrics = [
    { label: "Active promotions", value: active, icon: Flame },
    { label: "Scheduled promos", value: scheduled, icon: CalendarRange },
    { label: "Total promo uses", value: totalUsage, icon: ShoppingBag },
    {
      label: "Active discount types",
      value: discountTypes,
      icon: BadgePercent,
    },
  ]

  return (
    <div className="admin-metric-grid">
      {metrics.map((metric) => (
        <Card key={metric.label} className="border bg-card shadow-xs">
          <CardContent className="flex items-center gap-2 p-2.5 sm:p-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <metric.icon className="size-3.5" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[10px] font-medium text-muted-foreground">
                {metric.label}
              </p>
              {loading ? (
                <Skeleton className="h-5 w-12" />
              ) : (
                <p className="truncate text-sm font-bold sm:text-base">
                  {metric.value}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
