"use client"

import Link from "next/link"
import { useState, useSyncExternalStore } from "react"
import {
  ChefHat,
  LayoutDashboard,
  LogIn,
  QrCode,
  ReceiptText,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCustomerSession } from "./customer-session-context"
import { QrScannerDialog } from "./qr-scanner-dialog"

export function CustomerEntry() {
  const { profile: sessionProfile, status } = useCustomerSession()
  const [scannerOpen, setScannerOpen] = useState(false)

  // False during server render and the first hydration pass, true afterwards.
  // The session provider can finish its effect before this component hydrates,
  // so ignore its state until we are mounted to keep server and client HTML equal.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const profile = mounted ? sessionProfile : null

  // Wait for the saved session before choosing a view, so a remembered
  // customer never sees the sign-in buttons flash by.
  const checking = !mounted || (status === null && !profile)

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col justify-center">
      <section className="rounded-2xl border bg-card p-5 shadow-xs sm:p-8">
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
            <ChefHat className="size-7" />
          </span>
          <p className="mt-4 text-xs font-semibold tracking-[.16em] text-amber-600 uppercase">
            PRIME POS · CUSTOMER
          </p>
          {profile ? (
            <>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Welcome back, {profile.name.split(" ")[0]}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Scan the QR code on your table to start your order.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Welcome
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to scan your table QR and order, or create an account
                to get started.
              </p>
            </>
          )}
        </div>

        {checking ? (
          <div className="mt-7 grid gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : profile ? (
          <div className="mt-7 grid gap-3">
            <Button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="h-12 bg-amber-500 text-base font-semibold text-amber-950 hover:bg-amber-400"
            >
              <QrCode className="mr-2 size-5" />
              Scan table QR
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button asChild variant="outline" className="h-12">
                <Link href="/customer/dashboard">
                  <LayoutDashboard className="mr-2 size-4" />
                  Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12">
                <Link href="/customer/orders">
                  <ReceiptText className="mr-2 size-4" />
                  My orders
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-7 grid gap-3">
            <Button
              asChild
              className="h-12 bg-amber-500 text-base font-semibold text-amber-950 hover:bg-amber-400"
            >
              <Link href="/customer/login">
                <LogIn className="mr-2 size-5" />
                Login
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 text-base">
              <Link href="/customer/register">
                <UserPlus className="mr-2 size-5" />
                Create account
              </Link>
            </Button>
          </div>
        )}

        {!profile && !checking && (
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            An account keeps your orders, reservations, and loyalty points
            together.
          </p>
        )}
      </section>

      <QrScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} />
    </div>
  )
}
