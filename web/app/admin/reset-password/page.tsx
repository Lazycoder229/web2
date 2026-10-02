import { redirect } from "next/navigation"
import { PasswordRecoveryPage } from "@/components/password-recovery-page"

export default async function AdminResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  if (!token) redirect("/admin/forgot-password")
  return <PasswordRecoveryPage accountType="admin" token={token} />
}
