"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2 } from "lucide-react"
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
import {
  requestPasswordReset,
  resetPassword,
  type PasswordResetAccount,
} from "@/lib/api/password-reset"

export function PasswordRecoveryForm({
  accountType,
  token,
  onBack,
}: {
  accountType: PasswordResetAccount
  token?: string
  onBack?: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [complete, setComplete] = useState(false)
  const [message, setMessage] = useState("")
  const loginHref = accountType === "admin" ? "/admin/login" : "/customer/login"
  const isReset = Boolean(token)
  const backToLogin = () => {
    if (onBack) onBack()
    else router.replace(loginHref)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError("")
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    if (isReset) {
      const password = String(values.password ?? "")
      if (password !== String(values.confirmPassword ?? "")) {
        setBusy(false)
        setError("The passwords do not match.")
        return
      }
      const result = await resetPassword(accountType, token!, password)
      setBusy(false)
      if (!result.success) {
        setError(result.error ?? "Could not reset your password. Request a new link.")
        return
      }
      setComplete(true)
      setMessage(result.data?.message ?? "Your password has been reset.")
      return
    }

    const result = await requestPasswordReset(
      accountType,
      String(values.email ?? "").trim()
    )
    setBusy(false)
    if (!result.success) {
      setError(result.error ?? "Could not send a reset link. Please try again.")
      return
    }
    setComplete(true)
    setMessage(
      result.data?.message ??
        "If an account exists for that email, a password reset link will be sent shortly."
    )
  }

  return (
    <Card className="rounded-2xl border-stone-200 shadow-sm">
      <CardHeader className="space-y-1 p-4 sm:p-5">
        <p className="text-xs font-semibold tracking-[.14em] text-amber-600 uppercase">
          {accountType === "admin" ? "Admin account" : "Customer account"}
        </p>
        <CardTitle className="text-xl">
          {complete
            ? isReset
              ? "Password updated"
              : "Check your email"
            : isReset
              ? "Choose a new password"
              : "Forgot your password?"}
        </CardTitle>
        <CardDescription>
          {complete
            ? message
            : isReset
              ? "Choose a new password with at least 8 characters."
              : "Enter your account email and we’ll send you a secure reset link."}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
        {complete ? (
          <div className="space-y-4">
            {!isReset && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                <CheckCircle2 className="size-4 shrink-0" />
                Check your inbox and spam folder for the reset link.
              </div>
            )}
            <Button
              type="button"
              onClick={backToLogin}
              className="h-9 w-full bg-amber-500 text-amber-950 hover:bg-amber-400"
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {isReset ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-password">New password</Label>
                  <Input
                    id="reset-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-confirm-password">Confirm new password</Label>
                  <Input
                    id="reset-confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    className="h-9"
                    required
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="recovery-email">Email</Label>
                <Input
                  id="recovery-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="h-9"
                  required
                />
              </div>
            )}
            {error && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button disabled={busy} className="h-9 w-full bg-amber-500 text-amber-950 hover:bg-amber-400">
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isReset ? "Reset password" : "Send reset link"}
            </Button>
            <p className="text-center text-sm">
              <button
                type="button"
                onClick={backToLogin}
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Back to sign in
              </button>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
