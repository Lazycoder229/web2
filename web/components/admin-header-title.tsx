/* // components/admin-header-title.tsx
"use client"

import { usePathname } from "next/navigation"

// Add an entry here whenever a new admin route is created. Keys must match
// the route path exactly.
const PAGE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/menu": "Menu Management",
  "/admin/orders": "Orders",
  "/admin/inventory": "Inventory",
  "/admin/employees": "Employee Management",
  "/admin/rbac": "Roles & Access Control",
  "/admin/promotions": "Promotions",
  "/admin/settings": "System & POS Settings",
  "/admin/voids": "Void & Cancellation Logs",
  "/admin/printer": "Printer Settings",
  "/admin/printers": "Printer Settings",
  "/admin/reports": "Reports & Analytics",
}

// Fallback for routes not yet in the map above — turns "/admin/some-page"
// into "Some Page" instead of showing nothing.
function fallbackTitle(pathname: string) {
  const segment = pathname.split("/").filter(Boolean).pop() ?? "admin"
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function AdminHeaderTitle() {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ?? fallbackTitle(pathname)

  return <h2 className="text-sm font-medium">{title}</h2>
} */