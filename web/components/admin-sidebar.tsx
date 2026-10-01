// components/admin-sidebar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LayoutDashboard,
  UtensilsCrossed,
  Rss,
  CalendarCheck,
  Tag,
  Boxes,
  Printer,
  FileX,
  ShieldCheck,
  BarChart3,
  Users,
  Settings,
  ChevronUp,
  LogOutIcon,
  UserIcon,
  QrCode,
  ShelvingUnit,

} from "lucide-react";

const groups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Menu Management", url: "/admin/menu", icon: UtensilsCrossed },
      { title: "Live Orders", url: "/admin/orders", icon: Rss },
      { title: "QR / Table Setup", url: "/admin/tables", icon: QrCode },
      { title: "Reservations", url: "/admin/reservations", icon: CalendarCheck },
      { title: "Discounts & Promos", url: "/admin/discounts", icon: Tag },
      { title: "Printer Settings", url: "/admin/printer", icon: Printer },
      { title: "Void/Cancellation Logs", url: "/admin/voids", icon: FileX },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Roles & Access", url: "/admin/rbac", icon: ShieldCheck },
      { title: "Employee Management", url: "/admin/employees", icon: Users },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Sales Reports & Analytics", url: "/admin/reports", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Branch Management", url: "/admin/branches", icon: Boxes },
      { title: "Inventory Management", url: "/admin/inventory", icon: ShelvingUnit },
      { title: "Settings", url: "/admin/settings", icon: Settings },
    ],
  },
];

// Base styling + emerald accent for the active nav item (matches the

const menuButtonClass =
  "text-base py-2.5 [&_svg]:size-5 " +
  "data-[active=true]:bg-amber-500/10 data-[active=true]:text-amber-600 " +
  "data-[active=true]:font-medium dark:data-[active=true]:text-amber-500 " +
  "data-[active=true]:[&_svg]:text-amber-600 dark:data-[active=true]:[&_svg]:text-amber-500";

export function AdminSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex items-center justify-between p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <ShieldCheck className="size-6 shrink-0 text-amber-500" />
          <span className="font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            PRIME <span className="text-amber-500">POS</span>
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      className={menuButtonClass}
                      isActive={pathname === item.url}
                      onClick={handleNavClick}
                      asChild
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

     <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
           <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="data-[state=open]:bg-amber-500/10 data-[state=open]:text-amber-600 dark:data-[state=open]:text-amber-400">
                <UserIcon />
                <span>Admin User</span>
                <ChevronUp className="ml-auto size-4" />
            </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side="top"
              align="start"
              className="w-[--radix-popper-anchor-width] min-w-56"
            >
              <DropdownMenuItem>
                <UserIcon />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => { alert("Sign out action triggered") }}>
                <LogOutIcon />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    </Sidebar>
  );
}