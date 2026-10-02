import { CustomerEntry } from "@/components/customer/customer-entry"
import { QrOrderExperience } from "@/components/customer/qr-order-experience"

export default async function CustomerHome({ searchParams }: { searchParams: Promise<{ tableId?: string }> }) {
  const { tableId } = await searchParams
  return tableId ? <QrOrderExperience tableId={tableId} /> : <CustomerEntry />
}
