import { CustomerAccount } from "@/components/customer/customer-account"
import { AuthBrandCard } from "@/components/auth-brand-card"

export default function CustomerRegisterPage() {
  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-2">
      <AuthBrandCard
        eyebrow="PARDS LITSONG MANOK AT TSIBUGAN"
        title="Made for good moments."
        description="A warm welcome from our table to yours."
        imageOnly
      />
      <div className="flex min-h-dvh items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
        <section className="mb-5">
          <p className="text-xs font-semibold tracking-[.14em] text-amber-600 uppercase">
            PARDS LITSONG MANOK AT TSIBUGAN
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-950">
            Good food, better moments.
          </h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Create an account to keep your orders, reservations, and rewards
            close at hand.
          </p>
        </section>
        <CustomerAccount initialMode="register" showAuth />
        </div>
      </div>
    </main>
  )
}
