import { CustomerLayoutShell } from "@/components/customer/customer-layout-shell"

export const metadata = {
  title: "PRIME POS Customer",
  description: "Order, manage reservations, and collect rewards with PRIME POS",
  manifest: "/customer/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PRIME Customer",
  },
}

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <CustomerLayoutShell>{children}</CustomerLayoutShell>
}
