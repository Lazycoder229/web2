import { redirect } from "next/navigation"
import { PasswordRecoveryPage } from "@/components/password-recovery-page"

export default async function CustomerResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  if (!token) redirect("/customer/forgot-password")
  return <PasswordRecoveryPage accountType="customer" token={token} />
}
