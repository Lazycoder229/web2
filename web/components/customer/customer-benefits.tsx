"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Gift, ReceiptText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { CustomerReceipt } from "./customer-receipt"
import {
  customerLoyaltyAction,
  customerOrdersAction,
  redeemCustomerLoyaltyReward,
  type CustomerOrder,
} from "@/lib/api/customer"
import { useCustomerSession } from "./customer-session-context"

const money = (amount: unknown) =>
  `₱${Number(amount ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateLabel = (value?: string | null) =>
  value
    ? new Date(value.replace(" ", "T")).toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—"

function CustomerSignInPrompt({ title }: { title: string }) {
  return (
    <Card className="shadow-xs">
      <CardContent className="flex flex-col items-center px-5 py-12 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
          <ReceiptText className="size-5" />
        </span>
        <h2 className="mt-4 font-semibold">Sign in to view {title}</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Create an account or sign in to keep your customer information private
          and in one place.
        </p>
        <Button
          asChild
          className="mt-4 bg-amber-500 text-amber-950 hover:bg-amber-400"
        >
          <Link href="/customer/login">
            Sign in or create an account <ArrowRight className="ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function CustomerOrders() {
  const { profile, status, loading: sessionLoading } = useCustomerSession()
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null)
  const selectedReceipt = orders.find((order) => order.id === selectedReceiptId)

  useEffect(() => {
    if (sessionLoading || status === null) return
    if (!profile) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    void customerOrdersAction()
      .then((result) => {
        if (!active) return
        if (result.success && Array.isArray(result.data)) setOrders(result.data)
        else setError(result.error ?? "Could not load your orders.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [profile, sessionLoading, status])

  return (
    <div className="space-y-5">
      <section>
        <p className="text-xs font-semibold tracking-wide text-amber-600 uppercase">
          Customer portal
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Order history
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review your previous orders and open a digital receipt.
        </p>
      </section>
      {status === 401 && !profile ? (
        <CustomerSignInPrompt title="your order history" />
      ) : (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="size-5 text-amber-600" />
              Your orders
            </CardTitle>
            <CardDescription>
              Orders placed while signed in are saved here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((item) => (
                  <Skeleton key={item} className="h-14 w-full" />
                ))}
              </div>
            ) : error ? (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            ) : orders.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center">
                <p className="font-medium">No orders yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your signed-in orders will appear here.
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/customer/menu">Browse menu</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-3 sm:hidden">
                  {orders.map((order) => (
                    <article key={order.id} className="rounded-xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {order.orderNumber}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {dateLabel(order.createdAt)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="shrink-0 capitalize"
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {order.items?.reduce(
                              (sum, item) => sum + Number(item.quantity),
                              0
                            ) ?? 0}{" "}
                            items
                          </p>
                          <p className="mt-1 font-semibold">
                            {money(order.total)}
                          </p>
                        </div>
                        {order.paymentStatus !== "paid" ? (
                          <Button size="sm" variant="outline" disabled>
                            Receipt after payment
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedReceiptId(order.id)}
                          >
                            View receipt
                          </Button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                <div className="hidden overflow-x-auto rounded-lg border sm:block">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                      <tr>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Items</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">
                            {order.orderNumber}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {dateLabel(order.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            {order.items?.reduce(
                              (sum, item) => sum + Number(item.quantity),
                              0
                            ) ?? 0}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="capitalize">
                              {order.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {money(order.total)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {order.paymentStatus !== "paid" ? (
                              <Button size="sm" variant="outline" disabled>
                                Receipt after payment
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedReceiptId(order.id)}
                              >
                                View receipt
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
      <Dialog
        open={Boolean(selectedReceipt)}
        onOpenChange={(open) => {
          if (!open) setSelectedReceiptId(null)
        }}
      >
        <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto">
          {selectedReceipt && (
            <>
              <DialogHeader>
                <DialogTitle>Order receipt · {selectedReceipt.orderNumber}</DialogTitle>
                <DialogDescription>
                  Receipt details for this order.
                </DialogDescription>
              </DialogHeader>
              <CustomerReceipt orderId={selectedReceipt.id} embedded />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

type LoyaltyTransaction = {
  type: string
  points: number | string
  balance_after: number | string
  created_at: string
}

type LoyaltyReward = {
  id: string
  name: string
  description: string | null
  pointsRequired: number
}

export function CustomerLoyalty() {
  const { profile, status, loading: sessionLoading } = useCustomerSession()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [selectedReward, setSelectedReward] = useState<LoyaltyReward | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (sessionLoading || status === null) return
    if (!profile) {
      setLoading(false)
      return
    }
    let active = true
    void customerLoyaltyAction()
      .then((result) => {
        if (!active) return
        if (result.success && result.data) {
          setBalance(Number(result.data.balance ?? 0))
          setTransactions(result.data.transactions ?? [])
          setRewards(result.data.rewards ?? [])
        } else setError(result.error ?? "Could not load your rewards.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [profile, sessionLoading, status])

  async function handleRedeem() {
    if (!selectedReward || redeeming) return
    setRedeeming(true)
    try {
      const result = await redeemCustomerLoyaltyReward(selectedReward.id)
      if (result.success && result.data) {
        setBalance(Number(result.data.balance))
        setTransactions((current) => [result.data!.transaction, ...current])
        toast.success(`${selectedReward.name} redeemed successfully.`)
        setSelectedReward(null)
      } else {
        toast.error(result.error ?? "Could not redeem this reward.")
      }
    } catch {
      toast.error("Could not redeem this reward. Please try again.")
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <div className="space-y-5">
      <section>
        <p className="text-xs font-semibold tracking-wide text-amber-600 uppercase">
          Customer portal
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Loyalty rewards
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          See your current points and recent activity.
        </p>
      </section>
      {status === 401 && !profile ? (
        <CustomerSignInPrompt title="your rewards" />
      ) : (
        <>
          <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-card shadow-xs">
            <CardContent className="flex items-center justify-between gap-4 p-5 sm:p-7">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Available points
                </p>
                {loading ? (
                  <Skeleton className="mt-2 h-9 w-24" />
                ) : (
                  <p className="mt-1 text-3xl font-bold tracking-tight">
                    {balance.toLocaleString("en-PH")}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Earn points on eligible purchases.
                </p>
              </div>
              <span className="grid size-12 place-items-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <Gift className="size-6" />
              </span>
            </CardContent>
          </Card>
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Available rewards</CardTitle>
              <CardDescription>
                Redeem your points for rewards configured by the restaurant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[0, 1].map((item) => <Skeleton key={item} className="h-28 w-full" />)}
                </div>
              ) : rewards.length === 0 ? (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No rewards are available right now.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {rewards.map((reward) => (
                    <article key={reward.id} className="flex flex-col justify-between gap-4 rounded-xl border p-4">
                      <div>
                        <h3 className="font-semibold">{reward.name}</h3>
                        {reward.description && <p className="mt-1 text-sm text-muted-foreground">{reward.description}</p>}
                        <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-400">
                          {reward.pointsRequired.toLocaleString("en-PH")} points
                        </p>
                      </div>
                      <Button
                        className="w-full bg-amber-500 text-amber-950 hover:bg-amber-400"
                        disabled={balance < reward.pointsRequired}
                        onClick={() => setSelectedReward(reward)}
                      >
                        {balance < reward.pointsRequired ? "Not enough points" : "Redeem reward"}
                      </Button>
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Points activity</CardTitle>
              <CardDescription>
                Your account’s recent loyalty transactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((item) => (
                    <Skeleton key={item} className="h-12 w-full" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <p className="rounded-xl border border-dashed p-9 text-center text-sm text-muted-foreground">
                  No rewards activity yet.
                </p>
              ) : (
                <>
                  <div className="space-y-3 sm:hidden">
                    {transactions.map((row, index) => (
                      <article
                        key={`mobile-${row.created_at}-${index}`}
                        className="rounded-xl border p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium capitalize">
                              {String(row.type).replaceAll("_", " ")}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {dateLabel(row.created_at)}
                            </p>
                          </div>
                          <p className="shrink-0 font-semibold">
                            {Number(row.points) > 0 ? "+" : ""}
                            {Number(row.points).toLocaleString("en-PH")} pts
                          </p>
                        </div>
                        <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                          Balance after:{" "}
                          {Number(row.balance_after).toLocaleString("en-PH")}{" "}
                          pts
                        </p>
                      </article>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto rounded-lg border sm:block">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Activity</th>
                          <th className="px-4 py-3 text-right">Points</th>
                          <th className="px-4 py-3 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {transactions.map((row, index) => (
                          <tr key={`${row.created_at}-${index}`}>
                            <td className="px-4 py-3 text-muted-foreground">
                              {dateLabel(row.created_at)}
                            </td>
                            <td className="px-4 py-3 capitalize">
                              {String(row.type).replaceAll("_", " ")}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {Number(row.points) > 0 ? "+" : ""}
                              {Number(row.points).toLocaleString("en-PH")}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {Number(row.balance_after).toLocaleString(
                                "en-PH"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
      <Dialog open={Boolean(selectedReward)} onOpenChange={(open) => !open && !redeeming && setSelectedReward(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem {selectedReward?.name}?</DialogTitle>
            <DialogDescription>
              This will use {Number(selectedReward?.pointsRequired ?? 0).toLocaleString("en-PH")} points from your balance. Ask restaurant staff how to claim your reward.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={redeeming} onClick={() => setSelectedReward(null)}>Cancel</Button>
            <Button className="bg-amber-500 text-amber-950 hover:bg-amber-400" disabled={redeeming} onClick={() => void handleRedeem()}>
              {redeeming ? "Redeeming…" : "Confirm redemption"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  )
}
