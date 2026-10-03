import {
  api,
  invalidateApiCache,
  getCustomerAccessToken,
  getCustomerRefreshToken,
  isCustomerSessionOnly,
  setCustomerAccessToken,
  setCustomerRefreshToken,
  setCustomerRemember,
} from "./client"
import {
  canStartSession,
  clearActiveSessionLock,
  setActiveSessionLock,
} from "./session-lock"
import type { ActionResult } from "@/types/admin/menu"

const CUSTOMER_PROFILE_KEY = "prime-pos-customer-profile"

export type CustomerProfile = {
  id: string
  name: string
  email: string
  contactNumber?: string | null
  dateOfBirth?: string | null
  hasPwdId?: boolean
  loyaltyPointsBalance: number
}

type CustomerAuthResponse = {
  customer: CustomerProfile
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export async function registerCustomer(input: {
  name: string
  email: string
  password: string
  contactNumber?: string
  dateOfBirth: string
  pwdIdNumber?: string
  remember?: boolean
}) {
  const { remember = true, ...fields } = input
  const email = input.email.trim()
  const check = canStartSession({ type: "customer", email })
  if (!check.allowed) {
    return {
      success: false as const,
      error: check.reason ?? "May ibang user na kasalukuyang naka-login sa browser na ito.",
    }
  }

  const result = await api<CustomerAuthResponse>("/customers/register", {
    method: "POST",
    body: JSON.stringify({ ...fields, email }),
    skipAuthRedirect: true,
    customerAuth: true,
  })
  if (result.success && result.data) {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("prime-pos-admin-profile")
        window.sessionStorage.removeItem("prime-pos-admin-profile")
      } catch {
        // storage fallback
      }
    }
    setCustomerRemember(remember)
    setCustomerAccessToken(result.data.accessToken)
    setCustomerRefreshToken(result.data.refreshToken)
    saveCustomerProfile(result.data.customer)
  }
  return result
}

export async function loginCustomer(input: {
  email: string
  password: string
  remember?: boolean
}) {
  const { remember = true, ...fields } = input
  const email = input.email.trim()
  const check = canStartSession({ type: "customer", email })
  if (!check.allowed) {
    return {
      success: false as const,
      error: check.reason ?? "May ibang user na kasalukuyang naka-login sa browser na ito.",
    }
  }

  const result = await api<CustomerAuthResponse>("/customers/login", {
    method: "POST",
    body: JSON.stringify({ ...fields, email }),
    skipAuthRedirect: true,
    customerAuth: true,
  })
  if (result.success && result.data) {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("prime-pos-admin-profile")
        window.sessionStorage.removeItem("prime-pos-admin-profile")
      } catch {
        // storage fallback
      }
    }
    setCustomerRemember(remember)
    setCustomerAccessToken(result.data.accessToken)
    setCustomerRefreshToken(result.data.refreshToken)
    saveCustomerProfile(result.data.customer)
  }
  return result
}

export function saveCustomerProfile(profile: CustomerProfile) {
  if (typeof window === "undefined") return
  try {
    // Session-only logins (no "Remember me") keep the profile in this tab only.
    const [keep, drop] = isCustomerSessionOnly()
      ? [window.sessionStorage, window.localStorage]
      : [window.localStorage, window.sessionStorage]
    keep.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(profile))
    drop.removeItem(CUSTOMER_PROFILE_KEY)
  } catch {
    // Keep the active login working when browser storage is unavailable.
  }
  setActiveSessionLock({
    type: "customer",
    userId: profile.id,
    name: profile.name,
    email: profile.email,
    startedAt: Date.now(),
  })
}

export function getSavedCustomerProfile(): CustomerProfile | null {
  if (typeof window === "undefined") return null
  try {
    const value =
      window.localStorage.getItem(CUSTOMER_PROFILE_KEY) ??
      window.sessionStorage.getItem(CUSTOMER_PROFILE_KEY)
    if (!value) return null
    const profile = JSON.parse(value) as Partial<CustomerProfile>
    return profile.id && profile.name && profile.email
      ? (profile as CustomerProfile)
      : null
  } catch {
    return null
  }
}

export function logoutCustomer() {
  const refreshToken = getCustomerRefreshToken()
  const request = refreshToken
    ? api<{ loggedOut: boolean }>("/customers/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
        customerAuth: true,
        skipAuthRedirect: true,
      })
    : Promise.resolve(null)
  setCustomerAccessToken(null)
  setCustomerRefreshToken(null)
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(CUSTOMER_PROFILE_KEY)
      window.sessionStorage.removeItem(CUSTOMER_PROFILE_KEY)
    } catch {
      // storage fallback
    }
  }
  clearActiveSessionLock()
  invalidateApiCache()
  return request
}

export function createCustomerQrOrder(input: {
  requestId: string
  tableId: string
  orderType: "qr"
  paymentMethod?: "gcash" | "maya"
  paymentReference?: string
  items: Array<{ menuItemId: string; quantity: number; notes?: string | null }>
}) {
  return api<{
    orderNumber: string
    order: { id: string; paymentStatus?: string | null }
  }>("/orders", {
    method: "POST",
    body: JSON.stringify(input),
    customerAuth: Boolean(getCustomerAccessToken()),
  })
}

export async function fetchCustomerProfile() {
  const result = await api<{ customer: CustomerProfile }>("/customers/me", {
    customerAuth: true,
    skipAuthRedirect: true,
  })
  if (result.success && result.data?.customer) {
    saveCustomerProfile(result.data.customer)
  }
  return result.success && result.data
    ? { success: true as const, data: result.data.customer }
    : {
        success: false,
        error: result.error ?? "Sign in to open your customer account.",
      }
}

export async function updateCustomerProfile(
  input: Partial<CustomerProfile> & { pwdIdNumber?: string }
) {
  const result = await api<{ customer: CustomerProfile }>("/customers/me", {
    method: "PUT",
    body: JSON.stringify(input),
    customerAuth: true,
  })
  if (result.success && result.data?.customer) {
    saveCustomerProfile(result.data.customer)
  }
  return result
}

export async function fetchCustomerDashboard() {
  return api<{ orders: number; reservations: number; points: number }>(
    "/customers/me/dashboard",
    { customerAuth: true }
  )
}

export async function customerOrdersAction(): Promise<
  ActionResult<CustomerOrder[]>
> {
  const result = await api<{ orders: CustomerOrder[] }>(
    "/customers/me/orders",
    {
      customerAuth: true,
    }
  )
  return result.success && result.data
    ? { success: true as const, data: result.data.orders }
    : { success: false, error: result.error ?? "Could not load your orders." }
}

export type CustomerReservation = {
  id: string
  customerName: string
  contactNumber: string
  email?: string | null
  tableId?: string | null
  table?: string | null
  reservationDate: string
  reservationTime: string
  numberOfGuests: number
  status: string
  notes?: string | null
}

export async function customerReservationsAction(): Promise<
  ActionResult<CustomerReservation[]>
> {
  const result = await api<{ reservations: CustomerReservation[] }>(
    "/customers/me/reservations",
    { customerAuth: true }
  )
  return result.success && result.data
    ? { success: true as const, data: result.data.reservations }
    : {
        success: false,
        error: result.error ?? "Could not load your reservations.",
      }
}

export function createCustomerReservationAction(input: {
  customerName: string
  contactNumber?: string
  tableId?: string | null
  reservationDate: string
  reservationTime: string
  numberOfGuests: number
  notes?: string
}) {
  return api<{ reservation: CustomerReservation }>(
    "/customers/me/reservations",
    {
      method: "POST",
      body: JSON.stringify(input),
      customerAuth: true,
    }
  )
}

export async function fetchCustomerOrder(orderId: string) {
  return api<{ order: CustomerOrder }>(`/customers/me/orders/${orderId}`, {
    customerAuth: true,
  })
}

export async function customerLoyaltyAction() {
  return api<{
    balance: number
    rewards: Array<{
      id: string
      name: string
      description: string | null
      pointsRequired: number
    }>
    transactions: Array<{
      type: string
      points: number | string
      balance_after: number | string
      created_at: string
    }>
  }>("/customers/me/loyalty", { customerAuth: true })
}

export function redeemCustomerLoyaltyReward(rewardId: string) {
  return api<{
    balance: number
    transaction: { type: string; points: number; balance_after: number; created_at: string }
  }>("/customers/me/loyalty/redeem", {
    method: "POST",
    body: JSON.stringify({ rewardId }),
    customerAuth: true,
  })
}

export type CustomerOrder = {
  id: string
  orderNumber: string
  tableId: string | null
  table?: string
  orderType: string
  status: string
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentStatus?: string | null
  paymentMethod?: string | null
  createdAt?: string | null
  items: Array<{ name: string; quantity: number; price: number }>
}
