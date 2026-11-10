import { CustomerReceipt } from "@/components/customer/customer-receipt"
import { useParams } from "react-router-dom"

export default function ReceiptPage() {
  const { orderId = "" } = useParams()
  return <CustomerReceipt orderId={orderId} />
}
