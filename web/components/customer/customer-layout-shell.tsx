"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import {
  CalendarDays,
  ChefHat,
  Gift,
  LayoutDashboard,
  LogIn,
  LogOut,
  QrCode,
  ReceiptText,
  UtensilsCrossed,
  UserRound,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  CustomerSessionProvider,
  useCustomerSession,
} from "./customer-session-context"

const links = [
  {
    href: "/customer/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    authRequired: true,
  },
  { href: "/customer/menu", label: "Order via QR", icon: QrCode },
  { href: "/customer/orders", label: "Orders", icon: ReceiptText, authRequired: true },
  {
    href: "/customer/reservations",
    label: "Reservations",
    icon: CalendarDays,
    authRequired: true,
  },
  { href: "/customer/loyalty", label: "Rewards", icon: Gift, authRequired: true },
  { href: "/customer/account", label: "Account", icon: UserRound, authRequired: true },
]

/**
 * Pages that require a signed-in customer. A logged-out visitor is sent to
 * the login page. Everything else under /customer (menu, guest, reservations,
 * auth pages) stays open to guests.
 *
 * Note: the old check treated "/customer" as a prefix, which made every
 * /customer/* page public, so signing out on a protected page left the UI
 * stuck on a signed-out state.
 */
const PROTECTED_PAGES = [
  "/customer/dashboard",
  "/customer/account",
  "/customer/orders",
  "/customer/loyalty",
  "/customer/receipt",
]

function isPublicPage(pathname: string): boolean {
  return !PROTECTED_PAGES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )
}

function CustomerSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, status, signOut } = useCustomerSession()
  const { isMobile, setOpenMobile } = useSidebar()
  const [mounted, setMounted] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function handleConfirmSignOut() {
    setConfirmSignOut(false)
    closeMobileSidebar()
    signOut()
    // A signed-in customer who logs out goes back to the login page from any
    // page. Only visitors who never signed in stay on the guest pages.
    router.replace("/customer/login")
  }

  function closeMobileSidebar() {
    if (isMobile) setOpenMobile(false)
  }

  // Filter out auth-required links if not logged in (guarded by mounted for hydration safety)
  const isAuthed = mounted && Boolean(profile)
  const visibleLinks = links.filter(
    (link) => !("authRequired" in link && link.authRequired) || isAuthed
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-4 group-data-[collapsible=icon]:p-2">
        <Link
          href={isAuthed ? "/customer/dashboard" : "/customer/menu"}
          onClick={closeMobileSidebar}
          title="PRIME POS"
          className="flex items-center gap-3 font-bold tracking-tight group-data-[collapsible=icon]:justify-center"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
            <ChefHat className="size-5" />
          </span>
          <span className="group-data-[collapsible=icon]:hidden">
            PRIME <span className="text-amber-600">POS</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="pt-3">
        <SidebarGroup>
          <SidebarGroupLabel>Customer menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {visibleLinks.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={pathname === href}
                    onClick={closeMobileSidebar}
                    tooltip={label}
                    className="min-h-11 px-3 text-sm group-data-[collapsible=icon]:min-h-8 data-[active=true]:bg-amber-500/10 data-[active=true]:text-amber-700 dark:data-[active=true]:text-amber-400"
                    asChild
                  >
                    <Link href={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4 group-data-[collapsible=icon]:p-2">
        {mounted && profile ? (
          <div className="flex items-center justify-between gap-3 group-data-[collapsible=icon]:justify-center">
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium">{profile.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {profile.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted group-data-[collapsible=icon]:size-8"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        ) : mounted && status === 401 ? (
          <Link
            href="/customer/login"
            onClick={closeMobileSidebar}
            title="Sign in"
            aria-label="Sign in"
            className="flex min-h-11 items-center justify-center rounded-lg bg-amber-500 px-3 text-sm font-semibold text-amber-950 hover:bg-amber-400 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:min-h-8 group-data-[collapsible=icon]:px-0"
          >
            <LogIn className="hidden size-4 group-data-[collapsible=icon]:block" />
            <span className="group-data-[collapsible=icon]:hidden">Sign in</span>
          </Link>
        ) : null}
        <AlertDialog open={confirmSignOut} onOpenChange={setConfirmSignOut}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out?</AlertDialogTitle>
              <AlertDialogDescription>
                You will need to sign in again to see your orders, reservations,
                and rewards. You can still order as a guest.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmSignOut}>
                Sign out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarFooter>
    </Sidebar>
  )
}

function CustomerLayoutContent({
  children,
  pathname,
}: {
  children: React.ReactNode
  pathname: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile, status, loading } = useCustomerSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isCustomerHome = pathname === "/customer"
  const hasTableId = searchParams.has("tableId")
  const isStandaloneAuthPage =
    pathname === "/customer/login" ||
    pathname === "/customer/register" ||
    pathname === "/customer/forgot-password" ||
    pathname === "/customer/reset-password"

  // ── Route protection: redirect unauthenticated users from protected pages ──
  const isProtectedPage = !isPublicPage(pathname)
  const shouldRedirectToLogin =
    mounted && isProtectedPage && !loading && status === 401 && !profile

  // ── Redirect logged-in customer from /customer (no tableId) to dashboard ──
  const shouldRedirectToDashboard =
    mounted && isCustomerHome && !hasTableId && !loading && status !== null && !!profile

  // ── Redirect logged-in customer away from login/register pages ──
  const shouldRedirectFromAuth =
    mounted && isStandaloneAuthPage && !loading && status !== null && !!profile

  useEffect(() => {
    if (shouldRedirectToLogin) {
      router.replace("/customer/login")
    }
  }, [router, shouldRedirectToLogin])

  useEffect(() => {
    if (shouldRedirectToDashboard) {
      router.replace("/customer/dashboard")
    }
  }, [router, shouldRedirectToDashboard])

  useEffect(() => {
    if (shouldRedirectFromAuth) {
      router.replace("/customer/dashboard")
    }
  }, [router, shouldRedirectFromAuth])

  // Show nothing while redirect is pending (only after mounted on client)
  if (mounted && (shouldRedirectToLogin || shouldRedirectToDashboard || shouldRedirectFromAuth)) {
    return null
  }

  // ── Standalone auth pages (login, register, forgot-password) ──
  if (isStandaloneAuthPage) {
    return children
  }

  // ── Customer home (/customer) → bare layout (no sidebar) ──
  if (isCustomerHome) {
    return (
      <div className="min-h-dvh bg-muted/20 text-foreground">
        <main className="mx-auto flex min-h-dvh w-full max-w-7xl items-center px-3 py-5 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    )
  }

  // ── All other pages → sidebar layout ──
  return (
    <SidebarProvider className="min-h-dvh bg-muted/20 text-foreground">
      <CustomerSidebar />
      <SidebarInset className="max-w-full min-w-0 overflow-x-clip">
        <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b bg-background/95 px-3.5 backdrop-blur-sm sm:h-14 sm:px-4">
          <SidebarTrigger aria-label="Toggle customer navigation" />
          <Separator orientation="vertical" className="h-5" />
        </header>
        <div className="w-full max-w-full min-w-0 flex-1 p-3 sm:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function CustomerLayoutShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <CustomerSessionProvider>
      <Suspense>
        <CustomerLayoutContent pathname={pathname}>
          {children}
        </CustomerLayoutContent>
      </Suspense>
    </CustomerSessionProvider>
  )
}
