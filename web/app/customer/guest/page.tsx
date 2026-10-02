import Link from "next/link"
import { ArrowRight, ChefHat } from "lucide-react"

export default function GuestStartPage() {
  return <main className="mx-auto flex min-h-[75dvh] max-w-xl flex-col justify-center px-5 py-12 text-center sm:px-8">
    <span className="mx-auto grid size-16 place-items-center rounded-[22px] bg-[#201a10] text-[#f1c14c]"><ChefHat className="size-8" /></span>
    <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-[#a97815]">Guest checkout</p>
    <h1 className="mt-2 text-3xl font-bold tracking-tight">Order without an account.</h1>
    <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#746a58]">Browse the menu, build your basket, and send your order. You can create an account any time to keep your order history and loyalty points together.</p>
    <Link href="/customer/menu" className="mx-auto mt-7 flex min-h-12 items-center justify-center rounded-2xl bg-[#e7a90c] px-6 font-bold text-[#201a10]">Browse menu <ArrowRight className="ml-2 size-4" /></Link>
    <Link href="/customer/reservations" className="mt-3 text-sm font-semibold text-[#8a6414]">Book a table as a guest</Link>
  </main>
}
