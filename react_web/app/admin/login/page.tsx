import { AdminLoginForm } from "@/components/admin-login-form"

import { useSearchParams } from "@/components/react-router-compat"

export default function AdminLoginPage() {
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? undefined
  return <AdminLoginForm nextPath={next} />
}
