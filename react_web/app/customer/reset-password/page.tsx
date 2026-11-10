import { useSearchParams, useRouter } from "@/components/react-router-compat"
import { PasswordRecoveryPage } from "@/components/password-recovery-page"

export default function CustomerResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  if (!token) {
    router.replace("/customer/forgot-password")
    return null
  }
  return <PasswordRecoveryPage accountType="customer" token={token} />
}
