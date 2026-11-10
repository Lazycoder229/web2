import { QrOrderExperience } from "@/components/customer/qr-order-experience"

export default function CustomerMenuPage() {
  return <QrOrderExperience embedded showCartWhenEmpty restoreLastOrder allowSavedTableContext />
}
