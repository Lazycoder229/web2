import { redirect } from "next/navigation"

// Guest checkout was removed: ordering now requires a customer account.
export default function GuestStartPage() {
  redirect("/customer/login")
}
