import { CustomerAccount } from "@/components/customer/customer-account"
import { AuthBrandCard } from "@/components/auth-brand-card"

export default function CustomerLoginPage() {
  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-2">
      <AuthBrandCard
        eyebrow="CUSTOMER WORKSPACE"
        title="Your favorites, all in one place."
        description="Sign in to keep track of your orders, reservations, and rewards."
        showImage={false}
      />
      <div className="flex min-h-dvh items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <CustomerAccount initialMode="login" showAuth fullPageAuth />
        </div>
      </div>
    </main>
  )
}
