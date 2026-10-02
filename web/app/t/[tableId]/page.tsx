import { redirect } from "next/navigation"

export default async function LegacyTableQr({ params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await params
  redirect(`/customer?tableId=${encodeURIComponent(tableId)}`)
}
