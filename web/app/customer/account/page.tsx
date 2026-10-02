import { CustomerAccount } from "@/components/customer/customer-account"

export default async function CustomerAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  return (
    <CustomerAccount
      initialMode={mode === "register" ? "register" : "login"}
      showAuth={mode === "login" || mode === "register"}
    />
  )
}
