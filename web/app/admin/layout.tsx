import { AdminLayoutShell } from "@/components/admin-layout-shell"

export const metadata = {
  title: "PRIME POS Admin",
  description: "Restaurant operations management",
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PRIME Admin",
  },
  formatDetection: { telephone: false },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>
}
