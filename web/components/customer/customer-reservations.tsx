"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { CalendarDays, Loader2, Users } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Toaster } from "@/components/ui/sonner"
import {
  fetchReservationTables,
  createReservationAction,
} from "@/lib/api/reservations"
import {
  createCustomerReservationAction,
  customerReservationsAction,
  type CustomerReservation,
} from "@/lib/api/customer"
import { useCustomerSession } from "./customer-session-context"

type TableOption = {
  id: string
  tableNumber: string
  capacity: number
  status?: string
}
const today = new Date().toLocaleDateString("en-CA")
const displayDate = (date: string, time: string) => {
  const parsed = new Date(`${date}T${time || "00:00"}`)
  return Number.isNaN(parsed.getTime())
    ? `${date} ${time}`
    : parsed.toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
}

export function CustomerReservations() {
  const { profile, status, loading: sessionLoading } = useCustomerSession()
  const [reservations, setReservations] = useState<CustomerReservation[]>([])
  const [tables, setTables] = useState<TableOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    void fetchReservationTables().then((rows) => {
      if (active && Array.isArray(rows)) setTables(rows)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (sessionLoading || status === null) return
    if (!profile) {
      setLoading(false)
      return
    }
    let active = true
    void customerReservationsAction()
      .then((result) => {
        if (!active) return
        if (result.success && Array.isArray(result.data))
          setReservations(result.data)
        else setError(result.error ?? "Could not load your reservations.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [profile, sessionLoading, status])

  async function submitReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setSubmitting(true)
    setError("")
    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries()
    )
    const payload = {
      customerName: String(values.customerName ?? "").trim(),
      contactNumber: String(values.contactNumber ?? "").trim(),
      email: String(values.email ?? "").trim(),
      tableId: String(values.tableId ?? "") || null,
      reservationDate: String(values.reservationDate ?? ""),
      reservationTime: String(values.reservationTime ?? ""),
      numberOfGuests: Number(values.numberOfGuests ?? 1),
      notes: String(values.notes ?? "").trim(),
      status: "pending",
    }
    const result = profile
      ? await createCustomerReservationAction(payload)
      : await createReservationAction(payload)
    setSubmitting(false)
    if (!result.success) {
      setError(result.error ?? "Could not create your reservation.")
      return
    }
    if (profile) {
      const list = await customerReservationsAction()
      if (list.success && Array.isArray(list.data)) setReservations(list.data)
    }
    form.reset()
    toast.success("Reservation request sent.", {
      description: "The restaurant will confirm your booking.",
    })
  }

  return (
    <div className="space-y-5">
      <Toaster />
      <section>
        <p className="text-xs font-semibold tracking-wide text-amber-600 uppercase">
          Customer portal
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Reservations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Book a table or review reservations connected to your account.
        </p>
      </section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-amber-600" />
              Request a table
            </CardTitle>
            <CardDescription>
              {profile
                ? "Your booking will be saved to your account."
                : "You can book as a guest; sign in to keep it in your history."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitReservation} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reservation-name">Name</Label>
                  <Input
                    id="reservation-name"
                    name="customerName"
                    required
                    className="min-h-11"
                    defaultValue={profile?.name ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reservation-phone">Contact number</Label>
                  <Input
                    id="reservation-phone"
                    name="contactNumber"
                    required
                    className="min-h-11"
                    defaultValue={profile?.contactNumber ?? ""}
                  />
                </div>
              </div>
              {!profile && (
                <div className="space-y-2">
                  <Label htmlFor="reservation-email">Email</Label>
                  <Input
                    id="reservation-email"
                    name="email"
                    type="email"
                    required
                    className="min-h-11"
                  />
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reservation-date">Date</Label>
                  <Input
                    id="reservation-date"
                    name="reservationDate"
                    type="date"
                    min={today}
                    required
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reservation-time">Time</Label>
                  <Input
                    id="reservation-time"
                    name="reservationTime"
                    type="time"
                    required
                    className="min-h-11"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reservation-guests">Guests</Label>
                  <Input
                    id="reservation-guests"
                    name="numberOfGuests"
                    type="number"
                    min={1}
                    max={30}
                    defaultValue={2}
                    required
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reservation-table">Preferred table</Label>
                  <select
                    id="reservation-table"
                    name="tableId"
                    defaultValue=""
                    className="flex min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Any available table</option>
                    {tables.map((table) => (
                      <option key={table.id} value={table.id}>
                        Table {table.tableNumber} · seats {table.capacity}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reservation-notes">Notes (optional)</Label>
                <Textarea
                  id="reservation-notes"
                  name="notes"
                  placeholder="Special requests or occasion"
                  rows={3}
                />
              </div>
              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-500 text-amber-950 hover:bg-amber-400"
              >
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Send reservation request
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5 text-amber-600" />
              Your reservations
            </CardTitle>
            <CardDescription>
              Reservations made while signed in appear here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 401 && !profile ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="font-medium">Guest booking</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sign in before booking to save reservations here.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-4">
                  <Link href="/customer/login">Sign in</Link>
                </Button>
              </div>
            ) : loading ? (
              <div className="space-y-3">
                {[0, 1].map((row) => (
                  <Skeleton key={row} className="h-20 w-full" />
                ))}
              </div>
            ) : reservations.length === 0 ? (
              <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No reservations yet.
              </p>
            ) : (
              <div className="space-y-3">
                {reservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4"
                  >
                    <div>
                      <p className="font-semibold">
                        {displayDate(
                          reservation.reservationDate,
                          reservation.reservationTime
                        )}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {reservation.table ?? "Any available table"} ·{" "}
                        {reservation.numberOfGuests} guests
                      </p>
                      {reservation.notes && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {reservation.notes}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {reservation.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
