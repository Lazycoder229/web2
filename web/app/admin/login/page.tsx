import { AdminLoginForm } from "@/components/admin-login-form"

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return <AdminLoginForm nextPath={next} />
}
