import { CustomerAccount } from "@/components/customer/customer-account"

import { useSearchParams } from "@/components/react-router-compat"

export default function CustomerAccountPage() {
  const mode = useSearchParams().get("mode")
  return (
    <CustomerAccount
      initialMode={mode === "register" ? "register" : "login"}
      showAuth={mode === "login" || mode === "register"}
    />
  )
}
