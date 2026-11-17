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
        eyebrow={`${accountType === "customer" ? "CUSTOMER" : accountType.toUpperCase()} WORKSPACE`}
        title={
          accountType === "customer"
            ? "Your favorites, all in one place."
            : accountType === "cashier"
              ? "Your shift starts here."
              : "Every shift, clearly in view."
        }
        description={
          accountType === "customer"
            ? "Manage your orders, reservations, and rewards."
            : accountType === "cashier"
              ? "Open menu, live orders, reservations, and inventory."
              : "Manage orders, staff, inventory, and reports from one focused workspace."
        }
        showImage={false}
      />
      <div className="flex min-h-dvh items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <PasswordRecoveryForm accountType={accountType} token={token} />
        </div>
      </div>
    </main>
  )
}
