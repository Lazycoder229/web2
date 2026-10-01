import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AdminSidebar } from "@/components/admin-sidebar"
//import { AdminHeaderTitle } from "@/components/admin-header-title"

export const metadata = {
  title: "PRIME POS",
  description: "Restaurant ordering and operations",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "PRIME Order" },
  formatDetection: { telephone: false },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="flex-1 min-w-0 max-w-full overflow-x-clip">
        <header className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b bg-background/95 px-3.5 py-2.5 backdrop-blur-sm sm:px-4 sm:py-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          {/* <AdminHeaderTitle /> */}
        </header>
        <div className="w-full min-w-0 max-w-full flex-1 p-2 sm:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}