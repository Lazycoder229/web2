"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { usePathname, useRouter } from "@/components/react-router-compat"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getSavedAdminProfile, type AdminProfile } from "@/lib/api/admin-auth"
import { getAdminAccessToken } from "@/lib/api/client"
import { rfidTapAttendanceAction } from "@/lib/api/employees"
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

      const profile = getSavedAdminProfile()
      setAdminProfile(profile)
    }

    syncAdmin()
    const unsubscribe = subscribeToSessionChanges(() => {
      syncAdmin()
    })
    return () => {
      unsubscribe()
    }
  }, [isPublicAuthPage, pathname, router])

  useEffect(() => {
    if (
      isPublicAuthPage ||
      !getAdminAccessToken() ||
      getActiveSessionLock()?.type !== "admin"
    ) return

    let buffer = ""
    let firstKeyAt = 0
    let lastKeyAt = 0
    let scanTarget: EventTarget | null = null
    let lastUid = ""
    let lastScanAt = 0
    let processing = false

    const clearTypedUid = (target: EventTarget | null, uid: string) => {
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const value = target.value
        if (!value.endsWith(uid)) return
        const prototype = target instanceof HTMLInputElement
          ? HTMLInputElement.prototype
          : HTMLTextAreaElement.prototype
        Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(target, value.slice(0, -uid.length))
        target.dispatchEvent(new Event("input", { bubbles: true }))
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const now = Date.now()
      const eventTarget = event.target instanceof HTMLElement ? event.target : null
      if (
        document.querySelector("[data-rfid-registration-open='true']") ||
        eventTarget?.closest("[data-rfid-registration-input='true']")
      ) {
        buffer = ""
        firstKeyAt = 0
        lastKeyAt = 0
        scanTarget = null
        return
      }
      if (event.key === "Shift" || event.key === "CapsLock") return
      if (event.key === "Enter") {
        const uid = buffer
        const isScannerBurst =
          uid.length >= 8 &&
          uid.length <= 50 &&
          /^[a-z\d:-]+$/i.test(uid) &&
          firstKeyAt > 0 &&
          now - firstKeyAt <= 1500 &&
          now - lastKeyAt <= 150
        const target = scanTarget
        buffer = ""
        firstKeyAt = 0
        lastKeyAt = 0
        scanTarget = null
        if (!isScannerBurst) return

        event.preventDefault()
        event.stopPropagation()
        clearTypedUid(target, uid)
        if (processing || (uid === lastUid && now - lastScanAt < 2500)) return
        lastUid = uid
        lastScanAt = now
        processing = true
        void rfidTapAttendanceAction({ rfidCardUid: uid }).then((result) => {
          if (!result.success) {
            toast.error(result.error)
            return
          }
          const detail = {
            ...result.data,
            employeeName: result.data.employee?.name ?? "Employee",
            rfidCardUid: uid,
          }
          window.dispatchEvent(new CustomEvent("prime-pos:rfid-attendance", { detail }))
          const lateMinutes = Number(detail.lateMinutes ?? 0)
          const message = `${detail.employeeName} clocked ${detail.action === "clock_in" ? "IN" : "OUT"}${lateMinutes > 0 ? ` · late ${lateMinutes} min` : ""} · punch ${detail.punchNumber}/4`
          if (lateMinutes > 0) toast.warning(message)
          else toast.success(message)
        }).finally(() => {
          processing = false
        })
        return
      }

      if (
        event.key.length !== 1 ||
        !/^[a-z\d:-]$/i.test(event.key) ||
        event.ctrlKey || event.altKey || event.metaKey
      ) {
        buffer = ""
        firstKeyAt = 0
        lastKeyAt = 0
        scanTarget = null
        return
      }
      if (!buffer || now - lastKeyAt > 150) {
        buffer = ""
        firstKeyAt = now
        scanTarget = event.target
      }
      if (buffer.length < 51) buffer += event.key
      lastKeyAt = now
    }

    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [isPublicAuthPage, pathname])

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
