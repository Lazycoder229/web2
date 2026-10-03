"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, ShieldAlert, UserRound } from "lucide-react"
import { toast } from "sonner"
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
import { Toaster } from "@/components/ui/sonner"
import { PasswordRecoveryForm } from "@/components/password-recovery-form"
import { logoutAdmin } from "@/lib/api/admin-auth"
import {
  loginCustomer,
  registerCustomer,
  updateCustomerProfile,
} from "@/lib/api/customer"
import {
  canStartSession,
  getActiveSessionLock,
  subscribeToSessionChanges,
  type ActiveSessionLock,
} from "@/lib/api/session-lock"
import { useCustomerSession } from "./customer-session-context"
import { safeCustomerNextPath } from "@/lib/customer-next"

export function CustomerAccount({
  initialMode = "login",
  showAuth = false,
}: {
  initialMode?: "login" | "register"
  showAuth?: boolean
}) {
  const router = useRouter()
  const {
    profile,
    loading: sessionLoading,
    status,
    setProfile,
  } = useCustomerSession()
  const [mode, setMode] = useState<"login" | "register">(initialMode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [remember, setRemember] = useState(true)
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

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError("")
    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries()
    )
    const email = String(values.email ?? "").trim()
    const sessionCheck = canStartSession({ type: "customer", email })
    if (!sessionCheck.allowed) {
      setBusy(false)
      setError(
        sessionCheck.reason ??
          "May ibang user na kasalukuyang naka-login sa browser na ito. Mag-sign out muna."
      )
      return
    }

    const result =
      mode === "login"
        ? await loginCustomer({
            email,
            password: String(values.password ?? ""),
            remember,
          })
        : await registerCustomer({
            name: String(values.name ?? ""),
            email: String(values.email ?? ""),
            password: String(values.password ?? ""),
            contactNumber: String(values.contactNumber ?? ""),
            dateOfBirth: String(values.dateOfBirth ?? ""),
            pwdIdNumber: String(values.pwdIdNumber ?? ""),
            remember,
          })
    setBusy(false)
    if (!result.success || !result.data) {
      setError(result.error ?? "Could not sign in. Please try again.")
      return
    }
    setProfile(result.data.customer)
    if (mode === "register") toast.success("Account created.")
    // Go back to the page (e.g. a scanned table) the customer came from.
    const next = safeCustomerNextPath(
      new URLSearchParams(window.location.search).get("next")
    )
    router.replace(next ?? "/customer/dashboard")
    router.refresh()
  }

  async function handleProfileUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries()
    )
    const result = await updateCustomerProfile({
      name: String(values.name ?? ""),
      email: String(values.email ?? ""),
      contactNumber: String(values.contactNumber ?? ""),
      dateOfBirth: String(values.dateOfBirth ?? ""),
      pwdIdNumber: String(values.pwdIdNumber ?? ""),
    })
    setBusy(false)
    if (!result.success || !result.data) {
      toast.error(result.error ?? "Could not update your account.")
      return
    }
    setProfile(result.data.customer)
    toast.success("Account details updated.")
  }

  return (
    <div
      className={`w-full ${showAuth ? "mx-auto" : "flex min-h-[calc(100dvh-4.5rem)] flex-col gap-6 sm:min-h-[calc(100dvh-6.5rem)]"}`}
    >
      <Toaster />
      {!showAuth && (
        <section>
          <p className="text-xs font-semibold tracking-wide text-amber-600 uppercase">
            Customer account
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and update the profile connected to your orders, reservations,
            and loyalty points.
          </p>
        </section>
      )}
      {!showAuth && (sessionLoading || status === null) && !profile ? (
        <Card className="flex w-full flex-1 flex-col shadow-xs">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-2 h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </CardContent>
        </Card>
      ) : profile ? (
        <Card className="flex w-full flex-1 flex-col shadow-xs">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b px-5 py-5 sm:px-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <UserRound className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <CardTitle>Profile details</CardTitle>
              <CardDescription className="mt-1">
                Keep your customer account information up to date.
              </CardDescription>
            </div>
            <span className="hidden rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:inline-flex dark:text-emerald-400">
              Account active
            </span>
          </CardHeader>
          <CardContent className="flex-1 p-5 sm:p-6">
            <form onSubmit={handleProfileUpdate} className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:row-start-1">
                <Label htmlFor="profile-name">Full name</Label>
                <Input
                  id="profile-name"
                  name="name"
                  required
                  className="h-10"
                  defaultValue={profile.name}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 sm:row-start-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  name="email"
                  type="email"
                  required
                  className="h-10"
                  defaultValue={profile.email}
                />
              </div>
              <div className="space-y-1.5 sm:col-start-2 sm:row-start-1">
                <Label htmlFor="profile-phone">Contact number</Label>
                <Input
                  id="profile-phone"
                  name="contactNumber"
                  className="h-10"
                  defaultValue={profile.contactNumber ?? ""}
                />
              </div>
              <div className="space-y-1.5 sm:row-start-3">
                <Label htmlFor="profile-birthday">Birthday</Label>
                <Input
                  id="profile-birthday"
                  name="dateOfBirth"
                  type="date"
                  required
                  className="h-10"
                  defaultValue={profile.dateOfBirth ?? ""}
                />
              </div>
              <div className="space-y-1.5 sm:col-start-2 sm:row-start-3">
                <Label htmlFor="profile-pwd-id">PWD ID number (leave blank to keep saved ID)</Label>
                <Input
                  id="profile-pwd-id"
                  name="pwdIdNumber"
                  maxLength={50}
                  className="h-10"
                  placeholder={profile.hasPwdId ? "PWD ID is saved" : "If applicable"}
                />
              </div>
              <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  These details are used for your orders and reservations.
                </p>
                <Button
                  disabled={busy}
                  className="bg-amber-500 text-amber-950 hover:bg-amber-400"
                >
                  {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : showAuth && showForgotPassword ? (
        <PasswordRecoveryForm
          accountType="customer"
          onBack={() => setShowForgotPassword(false)}
        />
      ) : showAuth ? (
        <Card className="flex min-h-0 flex-col justify-center rounded-2xl border-stone-200 shadow-sm">
          <div className="mx-auto w-full max-w-lg">
          <CardHeader className={showAuth ? "space-y-2.5 p-4 sm:p-5" : undefined}>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "login" ? "default" : "outline"}
                className={
                  mode === "login"
                    ? "h-8 bg-amber-500 text-amber-950 hover:bg-amber-400"
                    : "h-8"
                }
                onClick={() => {
                  setMode("login")
                  setError("")
                }}
              >
                Sign in
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "register" ? "default" : "outline"}
                className={
                  mode === "register"
                    ? "h-8 bg-amber-500 text-amber-950 hover:bg-amber-400"
                    : "h-8"
                }
                onClick={() => {
                  setMode("register")
                  setError("")
                }}
              >
                Create account
              </Button>
            </div>
            <CardTitle className="pt-1 text-xl">
              {mode === "login" ? "Welcome back" : "Join PRIME POS"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in to see your customer features."
                : "Create an account to save your order history and earn loyalty points."}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
            {activeSession?.type === "admin" ? (
              <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-stone-900 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-amber-500/20 p-2 text-amber-800">
                    <ShieldAlert className="size-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-stone-900">
                      Admin Session ay Kasalukuyang Aktibo
                    </p>
                    <p className="mt-1 text-xs text-stone-600">
                      Naka-sign in ang admin account na{" "}
                      <strong className="text-stone-900">{activeSession.name}</strong>{" "}
                      ({activeSession.email}).
                    </p>
                    <p className="mt-1 text-[11px] text-stone-500">
                      Isang user lang ang maaaring mag-login sa browser na ito kahit magkaibang tab. I-sign out muna ang admin account bago mag-log in bilang customer.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                  <Button
                    type="button"
                    onClick={() => router.push("/admin")}
                    className="h-9 flex-1 bg-amber-500 font-semibold text-amber-950 hover:bg-amber-400"
                  >
                    Pumunta sa Admin Workspace
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
                    I-sign out ang Admin
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <form onSubmit={handleAuth} className="space-y-2.5">
              {mode === "register" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-name">Full name</Label>
                    <Input
                      id="customer-name"
                      name="name"
                      autoComplete="name"
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-phone">Contact number</Label>
                    <Input
                      id="customer-phone"
                      name="contactNumber"
                      autoComplete="tel"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-birthday">Birthday</Label>
                    <Input
                      id="customer-birthday"
                      name="dateOfBirth"
                      type="date"
                      autoComplete="bday"
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-pwd-id">PWD ID number (if applicable)</Label>
                    <Input
                      id="customer-pwd-id"
                      name="pwdIdNumber"
                      maxLength={50}
                      className="h-9"
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customer-password">Password</Label>
                <div className="relative">
                  <Input
                    id="customer-password"
                    name="password"
                    type={passwordVisible ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={mode === "register" ? 8 : undefined}
                    required
                    className="h-9 pr-10"
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
              <label
                htmlFor="customer-remember"
                className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"
              >
                <input
                  id="customer-remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="size-4 rounded border-stone-300 accent-amber-500"
                />
                Remember me on this device
              </label>
              {error && (
                <p
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <Button
                disabled={busy || sessionLoading}
                className="h-9 w-full bg-amber-500 text-amber-950 hover:bg-amber-400"
              >
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                {mode === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>
                {mode === "login" && !activeSession && (
                  <p className="mt-2 text-center text-sm">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Forgot password?
                    </button>
                  </p>
                )}
              </>
            )}
            </CardContent>
          </div>
        </Card>
      ) : status === 401 ? (
        <Card className="shadow-xs">
          <CardContent className="flex flex-col items-center px-5 py-10 text-center">
            <span className="grid size-12 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
              <UserRound className="size-5" />
            </span>
            <h2 className="mt-4 font-semibold">
              Sign in to manage your profile
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Your account details appear here after you sign in.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                asChild
                className="bg-amber-500 text-amber-950 hover:bg-amber-400"
              >
                <Link href="/customer/login">Sign in</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/customer/register">Create account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
