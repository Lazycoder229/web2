import { CustomerEntry } from "@/components/customer/customer-entry"
import { QrOrderExperience } from "@/components/customer/qr-order-experience"

import { useSearchParams } from "@/components/react-router-compat"

export default function CustomerHome() {
  const searchParams = useSearchParams()
  const tableId = searchParams.get("tableId")
  return tableId ? <QrOrderExperience tableId={tableId} /> : <CustomerEntry />
}
