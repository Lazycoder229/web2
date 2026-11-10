import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function AdminDataSkeleton({
  rows = 6,
  title,
  description,
}: {
  rows?: number
  title: string
  description: string
}) {
  return (
    <div className="w-full min-w-0 space-y-4 pb-16 sm:space-y-6 sm:pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {title}
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border bg-card shadow-xs">
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border bg-card shadow-xs">
        <CardHeader className="p-4 sm:p-6">
          <h2 className="text-base font-bold">Loading records</h2>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 border-b pb-3 last:border-0">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5 max-w-56" />
                <Skeleton className="h-3 w-3/5 max-w-80" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
