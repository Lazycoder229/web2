"use client"

import { useEffect, useMemo, useState } from "react"
import { Award, Coins, Gift, RefreshCw, Search, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  fetchLoyaltyRedemptionsAction,
  type LoyaltyRedemptionRecord,
} from "@/lib/api/settings"

function formatDate(value: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof Gift
}) {
  return (
    <Card className="shadow-xs">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
        </div>
        <Icon className="size-5 text-amber-500" />
      </CardContent>
    </Card>
  )
}

export default function LoyaltyRedemptionsPage() {
  const [rows, setRows] = useState<LoyaltyRedemptionRecord[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadRedemptions() {
    setLoading(true)
    setError("")
    const result = await fetchLoyaltyRedemptionsAction()
    if (result.success) setRows(result.data ?? [])
    else setError(result.error || "Unable to load redemption history.")
    setLoading(false)
  }

  useEffect(() => {
    void loadRedemptions()
  }, [])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) =>
      [row.customerName, row.customerEmail, row.rewardName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    )
  }, [rows, search])

  const uniqueCustomers = new Set(rows.map((row) => row.customerId)).size
  const totalPoints = rows.reduce((sum, row) => sum + Math.abs(row.points), 0)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <Award className="size-5 text-amber-500" />
            <h1 className="text-2xl font-bold tracking-tight">Points Redemptions</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Tingnan kung sinong customer ang nag-redeem ng bawat reward.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadRedemptions()} disabled={loading}>
          <RefreshCw className={loading ? "mr-2 size-4 animate-spin" : "mr-2 size-4"} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total redemptions" value={rows.length.toLocaleString("en-PH")} icon={Gift} />
        <StatCard label="Customers served" value={uniqueCustomers.toLocaleString("en-PH")} icon={Users} />
        <StatCard label="Points redeemed" value={totalPoints.toLocaleString("en-PH")} icon={Coins} />
      </div>

      <Card className="shadow-xs">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Redemption history</CardTitle>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer or reward"
              className="pl-9"
              aria-label="Search customer or reward"
            />
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-14 w-full" />)}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              {search ? "Walang redemption na tumugma sa search." : "Wala pang points redemption."}
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:hidden">
                {filteredRows.map((row) => (
                  <div key={row.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{row.customerName}</p>
                        <p className="text-xs text-muted-foreground">{row.customerEmail || "No email"}</p>
                      </div>
                      <Badge variant="secondary">{Math.abs(row.points).toLocaleString("en-PH")} pts</Badge>
                    </div>
                    <div className="mt-3 flex justify-between gap-3 border-t pt-3 text-sm">
                      <span>{row.rewardName}</span>
                      <span className="text-right text-muted-foreground">{formatDate(row.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto rounded-lg border sm:block">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Reward</th>
                      <th className="px-4 py-3 text-right">Points</th>
                      <th className="px-4 py-3 text-right">Balance after</th>
                      <th className="px-4 py-3 text-right">Redeemed at</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{row.customerName}</p>
                          <p className="text-xs text-muted-foreground">{row.customerEmail || "No email"}</p>
                        </td>
                        <td className="px-4 py-3">{row.rewardName}</td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-600">-{Math.abs(row.points).toLocaleString("en-PH")}</td>
                        <td className="px-4 py-3 text-right">{row.balanceAfter.toLocaleString("en-PH")} pts</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatDate(row.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}