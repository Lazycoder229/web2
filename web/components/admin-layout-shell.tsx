"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getSavedAdminProfile, type AdminProfile } from "@/lib/api/admin-auth"
import { getAdminAccessToken } from "@/lib/api/client"
import {
  getActiveSessionLock,
  subscribeToSessionChanges,
} from "@/lib/api/session-lock"

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isPublicAuthPage = [
    "/admin/login",
    "/admin/forgot-password",
    "/admin/reset-password",
  ].includes(pathname)
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null)

  useEffect(() => {
    function syncAdmin() {
      if (isPublicAuthPage) {
        setAdminProfile(null)
        return
      }

      const active = getActiveSessionLock()
      const token = getAdminAccessToken()

      if (!token || active?.type !== "admin") {
        const next = pathname.startsWith("/admin/")
          ? "?next=" + encodeURIComponent(pathname)
          : ""
        router.replace(`/admin/login${next}`)
        return
      }

      setAdminProfile(getSavedAdminProfile())
    }

    syncAdmin()
    const unsubscribe = subscribeToSessionChanges(() => {
      syncAdmin()
    })
    return () => {
      unsubscribe()
    }
  }, [isPublicAuthPage, pathname, router])

  if (isPublicAuthPage) return children

  return (
    <SidebarProvider>
      <AdminSidebar profile={adminProfile} />
      <SidebarInset className="max-w-full min-w-0 flex-1 overflow-x-clip">
        <header className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b bg-background/95 px-3.5 py-2.5 backdrop-blur-sm sm:px-4 sm:py-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
        </header>
        <div className="w-full max-w-full min-w-0 flex-1 p-2 sm:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
