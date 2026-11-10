import {
  isRouteErrorResponse,
  Navigate,
  Outlet,
  RouteObject,
  useRouteError,
} from "react-router-dom"
import { AdminLayoutShell } from "@/components/admin-layout-shell"
import { CustomerLayoutShell } from "@/components/customer/customer-layout-shell"
import PrimeLanding from "@/app/page"
import AdminDashboardPage from "@/app/admin/page"
import AdminLoginPage from "@/app/admin/login/page"
import AdminForgotPasswordPage from "@/app/admin/forgot-password/page"
import AdminResetPasswordPage from "@/app/admin/reset-password/page"
import DiscountsPage from "@/app/admin/discounts/page"
import EmployeesPage from "@/app/admin/employees/page"
import InventoryPage from "@/app/admin/inventory/page"
import LoyaltyRedemptionsPage from "@/app/admin/loyalty/page"
import MenuPage from "@/app/admin/menu/page"
import OrdersPage from "@/app/admin/orders/page"
import PrinterSettingsPage from "@/app/admin/printer/page"
import PrintersPage from "@/app/admin/printers/page"
import RbacPage from "@/app/admin/rbac/page"
import ReportsPage from "@/app/admin/reports/page"
import AdminReservationsPage from "@/app/admin/reservations/page"
import SystemSettingsPage from "@/app/admin/settings/page"
import TablesPage from "@/app/admin/tables/page"
import VoidsPage from "@/app/admin/voids/page"
import CustomerHome from "@/app/customer/page"
import CustomerAccountPage from "@/app/customer/account/page"
import CustomerDashboardPage from "@/app/customer/dashboard/page"
import CustomerForgotPasswordPage from "@/app/customer/forgot-password/page"
import CustomerLoginPage from "@/app/customer/login/page"
import CustomerLoyaltyPage from "@/app/customer/loyalty/page"
import CustomerMenuPage from "@/app/customer/menu/page"
import CustomerOrdersPage from "@/app/customer/orders/page"
import CustomerRegisterPage from "@/app/customer/register/page"
import CustomerReservationsPage from "@/app/customer/reservations/page"
import CustomerResetPasswordPage from "@/app/customer/reset-password/page"
import ReceiptPage from "@/app/customer/receipt/[orderId]/page"
import GuestStartPage from "@/app/customer/guest/page"
import LegacyTableQr from "@/app/t/[tableId]/page"

function AdminRouteLayout() {
  return (
    <AdminLayoutShell>
      <Outlet />
    </AdminLayoutShell>
  )
}

function CustomerRouteLayout() {
  return (
    <CustomerLayoutShell>
      <Outlet />
    </CustomerLayoutShell>
  )
}

function RouteErrorBoundary() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? error.statusText || `Request failed with status ${error.status}`
    : error instanceof Error
      ? error.message
      : "An unexpected error occurred."

  return (
    <main className="grid min-h-svh place-items-center bg-background p-6">
      <section className="w-full max-w-lg space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold text-destructive">
          Unexpected application error
        </p>
        <h1 className="text-2xl font-bold">This page could not be loaded.</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          onClick={() => window.location.reload()}
        >
          Reload page
        </button>
      </section>
    </main>
  )
}

export const routes: RouteObject[] = [
  { path: "/", element: <PrimeLanding />, errorElement: <RouteErrorBoundary /> },
  {
    path: "/admin",
    element: <AdminRouteLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: "login", element: <AdminLoginPage /> },
      { path: "forgot-password", element: <AdminForgotPasswordPage /> },
      { path: "reset-password", element: <AdminResetPasswordPage /> },
      { path: "discounts", element: <DiscountsPage /> },
      { path: "employees", element: <EmployeesPage /> },
      { path: "inventory", element: <InventoryPage /> },
      { path: "loyalty", element: <LoyaltyRedemptionsPage /> },
      { path: "menu", element: <MenuPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "printer", element: <PrinterSettingsPage /> },
      { path: "printers", element: <PrintersPage /> },
      { path: "rbac", element: <RbacPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "reservations", element: <AdminReservationsPage /> },
      { path: "settings", element: <SystemSettingsPage /> },
      { path: "tables", element: <TablesPage /> },
      { path: "voids", element: <VoidsPage /> },
    ],
  },
  {
    path: "/customer",
    element: <CustomerRouteLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <CustomerHome /> },
      { path: "account", element: <CustomerAccountPage /> },
      { path: "dashboard", element: <CustomerDashboardPage /> },
      { path: "forgot-password", element: <CustomerForgotPasswordPage /> },
      { path: "guest", element: <GuestStartPage /> },
      { path: "login", element: <CustomerLoginPage /> },
      { path: "loyalty", element: <CustomerLoyaltyPage /> },
      { path: "menu", element: <CustomerMenuPage /> },
      { path: "orders", element: <CustomerOrdersPage /> },
      { path: "receipt/:orderId", element: <ReceiptPage /> },
      { path: "register", element: <CustomerRegisterPage /> },
      { path: "reservations", element: <CustomerReservationsPage /> },
      { path: "reset-password", element: <CustomerResetPasswordPage /> },
    ],
  },
  {
    path: "/t/:tableId",
    element: <LegacyTableQr />,
    errorElement: <RouteErrorBoundary />,
  },
  { path: "*", element: <Navigate to="/" replace />, errorElement: <RouteErrorBoundary /> },
]
