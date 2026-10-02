import { CustomerReceipt } from "@/components/customer/customer-receipt"
export default async function ReceiptPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  return <CustomerReceipt orderId={orderId} />
}
