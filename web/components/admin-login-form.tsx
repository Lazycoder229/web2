"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, ShieldAlert, UserCheck } from "lucide-react"
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
import { AuthBrandCard } from "@/components/auth-brand-card"
import { loginAdmin, logoutAdmin } from "@/lib/api/admin-auth"
import { logoutCustomer } from "@/lib/api/customer"
import {
  canStartSession,
  getActiveSessionLock,
  subscribeToSessionChanges,
  type ActiveSessionLock,
} from "@/lib/api/session-lock"

export function AdminLoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState("")
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [activeSession, setActiveSession] = useState<ActiveSessionLock | null>(null)

  useEffect(() => {
    setActiveSession(getActiveSessionLock())
    const unsubscribe = subscribeToSessionChanges((session) => {
      setActiveSession(session)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const destination =
    nextPath &&
    (nextPath === "/admin" || nextPath.startsWith("/admin/")) &&
    nextPath !== "/admin/login"
      ? nextPath
      : "/admin"

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setSigningIn(true)
    setError("")
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "").trim()
    const password = String(formData.get("password") ?? "")

    const sessionCheck = canStartSession({ type: "admin", email })
    if (!sessionCheck.allowed) {
      setBusy(false)
      setSigningIn(false)
      setError(
        sessionCheck.reason ??
          "May ibang user na kasalukuyang naka-login sa browser na ito. Mag-sign out muna."
      )
      return
    }

    const result = await loginAdmin({
      email,
      password,
    })

    if (!result.success || !result.data?.user) {
      setBusy(false)
      setSigningIn(false)
      setError(
        result.error ??
          "Could not sign in. Check your credentials and try again."
      )
      return
    }

    // Success: keep the form (with spinner) until the redirect finishes so the
    // "active session" panel doesn't flash while navigating.
    router.replace(destination)
    router.refresh()
  }

  return (
    <main className="grid min-h-dvh bg-white">
      <div className="grid min-h-dvh w-full bg-white lg:grid-cols-2">
        <AuthBrandCard
          eyebrow="ADMIN WORKSPACE"
          title="Run your restaurant with confidence."
          description="Manage orders, staff, inventory, and reports from one secure workspace."
          imageOnly
        />
        <Card className="flex min-h-dvh flex-col justify-center rounded-none border-0 bg-white shadow-none">
          <div className="mx-auto w-full max-w-md">
            <CardHeader className="space-y-1 p-4 sm:p-5">
              <p className="text-xs font-semibold tracking-[.14em] text-amber-600 uppercase">
                Admin sign in
              </p>
              <CardTitle className="text-xl sm:text-2xl">
                Sign in to your admin account
              </CardTitle>
              <CardDescription className="text-sm">
                Manage restaurant operations from your PRIME POS workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
              {activeSession && !signingIn ? (
                <div className="space-y-4">
                  {activeSession.type === "admin" ? (
                    <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-stone-900 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-amber-500/20 p-2 text-amber-800">
                          <UserCheck className="size-5" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-stone-900">
                            Aktibong Session sa Browser
                          </p>
                          <p className="mt-1 text-xs text-stone-600">
                            Naka-sign in ka na bilang{" "}
                            <strong className="text-stone-900">{activeSession.name}</strong>{" "}
                            ({activeSession.email}) bilang{" "}
                            <span className="font-semibold text-amber-800 capitalize">
                              {activeSession.role ?? "admin"}
                            </span>.
                          </p>
                          <p className="mt-1 text-[11px] text-stone-500">
                            Isang user account lang ang pinapayagang mag-login sa browser na ito kahit magkaibang tab.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                        <Button
                          type="button"
                          onClick={() => router.replace(destination)}
                          className="h-9 flex-1 bg-amber-500 font-semibold text-amber-950 hover:bg-amber-400"
                        >
                          Pumunta sa Admin Dashboard
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true)
                            await logoutAdmin()
                            setBusy(false)
                            router.refresh()
                          }}
                          className="h-9 border-stone-300"
                        >
                          {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                          Sign out para sa ibang account
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-xl border border-rose-300 bg-rose-50/80 p-4 text-stone-900 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-rose-500/20 p-2 text-rose-700">
                          <ShieldAlert className="size-5" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-stone-900">
                            Customer Session ay Kasalukuyang Aktibo
                          </p>
                          <p className="mt-1 text-xs text-stone-600">
                            Naka-sign in ang customer na{" "}
                            <strong className="text-stone-900">{activeSession.name}</strong>{" "}
                            ({activeSession.email}).
                          </p>
                          <p className="mt-1 text-[11px] text-stone-500">
                            Hindi maaaring sabay na naka-login ang customer at admin sa iisang browser. Mag-sign out muna sa customer account bago mag-log in bilang admin.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                        <Button
                          type="button"
                          onClick={() => router.push("/customer/dashboard")}
                          className="h-9 flex-1 bg-stone-900 text-white hover:bg-stone-800"
                        >
                          Buksan ang Customer Portal
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true)
                            await logoutCustomer()
                            setBusy(false)
                            router.refresh()
                          }}
                          className="h-9 border-rose-300 text-rose-700 hover:bg-rose-100"
                        >
                          {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                          I-sign out ang Customer
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-2.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-email">Email</Label>
                    <Input
                      id="admin-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      placeholder="admin@example.com"
                      className="h-9"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="admin-password"
                        name="password"
                        type={passwordVisible ? "text" : "password"}
                        autoComplete="current-password"
                        className="h-9 pr-10"
                        required
                      />
                      <button
                        type="button"
                        aria-label={passwordVisible ? "Hide password" : "Show password"}
                        title={passwordVisible ? "Hide password" : "Show password"}
                        onClick={() => setPasswordVisible((visible) => !visible)}
                        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                      >
                        {passwordVisible ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
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
                    disabled={busy}
                    className="h-9 w-full bg-amber-500 font-semibold text-amber-950 hover:bg-amber-400"
                  >
                    {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Sign in
                  </Button>
                  <p className="text-center text-sm">
                    <Link
                      href="/admin/forgot-password"
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </p>
                </form>
              )}
            </CardContent>
          </div>
        </Card>
      </div>
    </main>
  )
}
