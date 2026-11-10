import { AuthBrandCard } from "@/components/auth-brand-card"
import { PasswordRecoveryForm } from "@/components/password-recovery-form"
import type { PasswordResetAccount } from "@/lib/api/password-reset"

export function PasswordRecoveryPage({
  accountType,
  token,
}: {
  accountType: PasswordResetAccount
  token?: string
}) {
  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-2">
      <AuthBrandCard
        eyebrow={accountType === "admin" ? "ADMIN WORKSPACE" : "CUSTOMER ACCOUNT"}
        title="A secure way back to your account."
        description="Reset your PRIME POS password and continue where you left off."
        imageOnly
      />
      <div className="flex min-h-dvh items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <PasswordRecoveryForm accountType={accountType} token={token} />
        </div>
      </div>
    </main>
  )
}
