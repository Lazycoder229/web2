// lib/api/client.ts
import type { ActionResult } from "@/types/admin/menu"
import { clearActiveSessionLock } from "./session-lock"

const BASE = "/backend"
const LOGIN_PATH = "/admin/login"
const CACHE_SYNC_KEY = "prime-pos:api-cache-invalidated"
const CACHE_STORAGE_PREFIX = "prime-pos:api-response:"
const CUSTOMER_TOKEN_KEY = "prime-pos:customer-access-token"
const CUSTOMER_REFRESH_TOKEN_KEY = "prime-pos:customer-refresh-token"
const ADMIN_TOKEN_KEY = "prime-pos:admin-access-token"
const ADMIN_REFRESH_TOKEN_KEY = "prime-pos:admin-refresh-token"
// Set (per tab) when a customer signs in without "Remember me": their tokens
// then live in sessionStorage and disappear when the browser is closed.
const CUSTOMER_SESSION_ONLY_KEY = "prime-pos:customer-session-only"

type CachedResult = {
  result: ActionResult<unknown>
  expiresAt: number
}

const responseCache = new Map<string, CachedResult>()
const pendingGets = new Map<string, Promise<ActionResult<unknown>>>()
let cacheRevision = 0
let storageListenerAttached = false

function storedCacheKey(path: string) {
  return `${CACHE_STORAGE_PREFIX}${encodeURIComponent(path)}`
}

function getCustomerCacheScope() {
  if (typeof window === "undefined") return null
  try {
    const serialized =
      window.localStorage.getItem("prime-pos-customer-profile") ??
      window.sessionStorage.getItem("prime-pos-customer-profile")
    if (!serialized) return null
    const profile = JSON.parse(serialized) as { id?: unknown }
    return typeof profile.id === "string" && profile.id ? profile.id : null
  } catch {
    return null
  }
}

function readCachedResult(path: string): CachedResult | undefined {
  const inMemory = responseCache.get(path)
  if (inMemory && inMemory.expiresAt > Date.now()) return inMemory
  if (inMemory) responseCache.delete(path)

  if (typeof window === "undefined") return undefined
  try {
    const serialized = window.sessionStorage.getItem(storedCacheKey(path))
    if (!serialized) return undefined

    const cached = JSON.parse(serialized) as CachedResult
    if (
      cached.expiresAt <= Date.now() ||
      !cached.result?.success ||
      cached.result.data === undefined
    ) {
      window.sessionStorage.removeItem(storedCacheKey(path))
      return undefined
    }

    responseCache.set(path, cached)
    return cached
  } catch {
    return undefined
  }
}

function clearStoredCache() {
  if (typeof window === "undefined") return
  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index)
      if (key?.startsWith(CACHE_STORAGE_PREFIX)) {
        window.sessionStorage.removeItem(key)
      }
    }
  } catch {
    // The in-memory cache is still cleared when browser storage is unavailable.
  }
}

function cacheLifetime(path: string): number {
  // Keep each signed-in customer's account data warm across page visits.
  if (/^\/customers\/me\//.test(path)) return 2 * 60_000
  // Table status changes as customers scan and staff seat guests.
  if (/^\/tables(\/|\?|$)/.test(path)) return 3_000
  // Frequently changing operational data stays fresh for a shorter period.
  if (/\/(orders|reservations|inventory)(\/|\?|$)/.test(path)) return 10_000
  if (/^\/reports(\/|\?|$)/.test(path)) return 30_000
  return 2 * 60_000
}

function cloneResult<T>(result: ActionResult<T>): ActionResult<T> {
  if (!result.success || result.data === undefined) return { ...result }
  return {
    success: true,
    data: JSON.parse(JSON.stringify(result.data)) as T,
  }
}

export function invalidateApiCache() {
  responseCache.clear()
  cacheRevision += 1
  clearStoredCache()

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CACHE_SYNC_KEY, String(Date.now()))
      // Other tabs are notified by the storage event; don't leave the key behind.
      window.localStorage.removeItem(CACHE_SYNC_KEY)
    } catch {
      // Cache invalidation still works in this tab if storage is unavailable.
    }
  }
}

function attachStorageListener() {
  if (typeof window === "undefined" || storageListenerAttached) return
  window.addEventListener("storage", (event) => {
    if (event.key === CACHE_SYNC_KEY) {
      responseCache.clear()
      clearStoredCache()
      cacheRevision += 1
    } else if (
      event.key === ADMIN_TOKEN_KEY ||
      event.key === CUSTOMER_TOKEN_KEY ||
      event.key === "prime-pos:active-session-lock" ||
      event.key === null
    ) {
      adminAccessToken = window.localStorage.getItem(ADMIN_TOKEN_KEY)
      customerAccessToken = window.localStorage.getItem(CUSTOMER_TOKEN_KEY)
      responseCache.clear()
      clearStoredCache()
      cacheRevision += 1
    }
  })
  storageListenerAttached = true
}

type Envelope<T> = {
  success?: boolean
  data?: T
  error?: unknown
  message?: unknown
}

/** The backend may send `error` as a string or as `{ code, message }`. */
function errorText(value: unknown): string | undefined {
  if (typeof value === "string" && value) return value
  if (value && typeof value === "object") {
    const message = (value as { message?: unknown }).message
    if (typeof message === "string" && message) return message
  }
  return undefined
}

type RefreshedTokens = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

async function refreshSessionToken(
  customerAuth: boolean
): Promise<string | null> {
  const existing = customerAuth ? customerRefreshPromise : adminRefreshPromise
  if (existing) return existing

  const refreshToken = getRefreshToken(customerAuth)
  if (!refreshToken) return null

  const refreshPromise = (async () => {
    try {
      const res = await fetch(
        `${BASE}${customerAuth ? "/customers/refresh" : "/auth/refresh"}`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        }
      )
      const json = (await res
        .json()
        .catch(() => null)) as Envelope<RefreshedTokens> | null
      const tokens = json?.data
      if (
        !res.ok ||
        json?.success === false ||
        !tokens?.accessToken ||
        !tokens.refreshToken
      ) {
        return null
      }

      if (customerAuth) {
        setCustomerAccessToken(tokens.accessToken)
        setCustomerRefreshToken(tokens.refreshToken)
      } else {
        setAdminAccessToken(tokens.accessToken)
        setAdminRefreshToken(tokens.refreshToken)
      }
      return tokens.accessToken
    } catch {
      return null
    }
  })()

  if (customerAuth) customerRefreshPromise = refreshPromise
  else adminRefreshPromise = refreshPromise

  try {
    return await refreshPromise
  } finally {
    if (customerAuth && customerRefreshPromise === refreshPromise) {
      customerRefreshPromise = null
    } else if (!customerAuth && adminRefreshPromise === refreshPromise) {
      adminRefreshPromise = null
    }
  }
}

type ApiInit = RequestInit & {
  /** Don't redirect to login on a 401. Use for the login request itself. */
  skipAuthRedirect?: boolean
  /** Attach the customer bearer token for private customer portal routes. */
  customerAuth?: boolean
}

let customerAccessToken: string | null = null
let adminAccessToken: string | null = null
let customerRefreshPromise: Promise<string | null> | null = null
let adminRefreshPromise: Promise<string | null> | null = null

function getStoredToken(key: string) {
  if (typeof window === "undefined") return null
  try {
    return (
      window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key)
    )
  } catch {
    return null
  }
}

function setStoredToken(
  key: string,
  token: string | null,
  sessionOnly = false
) {
  if (typeof window === "undefined") return
  try {
    if (token) {
      if (sessionOnly) {
        window.sessionStorage.setItem(key, token)
        window.localStorage.removeItem(key)
      } else {
        window.localStorage.setItem(key, token)
        window.sessionStorage.removeItem(key)
      }
    } else {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    }
  } catch {
    // Keep the active session working when browser storage is unavailable.
  }
}

/** True when the customer chose not to be remembered on this device. */
export function isCustomerSessionOnly() {
  if (typeof window === "undefined") return false
  try {
    return window.sessionStorage.getItem(CUSTOMER_SESSION_ONLY_KEY) === "1"
  } catch {
    return false
  }
}

/** Call before storing a new customer login. `remember` keeps them signed in. */
export function setCustomerRemember(remember: boolean) {
  if (typeof window === "undefined") return
  try {
    if (remember) window.sessionStorage.removeItem(CUSTOMER_SESSION_ONLY_KEY)
    else window.sessionStorage.setItem(CUSTOMER_SESSION_ONLY_KEY, "1")
  } catch {
    // Falls back to remembering the login.
  }
}

function getRefreshToken(customerAuth: boolean) {
  return getStoredToken(
    customerAuth ? CUSTOMER_REFRESH_TOKEN_KEY : ADMIN_REFRESH_TOKEN_KEY
  )
}

export function setAdminRefreshToken(token: string | null) {
  setStoredToken(ADMIN_REFRESH_TOKEN_KEY, token)
}

export function getAdminRefreshToken() {
  return getRefreshToken(false)
}

export function setCustomerRefreshToken(token: string | null) {
  setStoredToken(CUSTOMER_REFRESH_TOKEN_KEY, token, isCustomerSessionOnly())
}

export function getCustomerRefreshToken() {
  return getRefreshToken(true)
}

export function setAdminAccessToken(token: string | null) {
  adminAccessToken = token
  if (typeof window === "undefined") return
  try {
    if (token) {
      window.localStorage.setItem(ADMIN_TOKEN_KEY, token)
      window.sessionStorage.removeItem(ADMIN_TOKEN_KEY)
      // When setting admin token, ensure customer session in this browser is wiped
      window.localStorage.removeItem(CUSTOMER_TOKEN_KEY)
      window.localStorage.removeItem(CUSTOMER_REFRESH_TOKEN_KEY)
      window.localStorage.removeItem("prime-pos-customer-profile")
      window.sessionStorage.removeItem(CUSTOMER_TOKEN_KEY)
      window.sessionStorage.removeItem(CUSTOMER_REFRESH_TOKEN_KEY)
      window.sessionStorage.removeItem("prime-pos-customer-profile")
    } else {
      window.localStorage.removeItem(ADMIN_TOKEN_KEY)
      window.localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY)
      window.sessionStorage.removeItem(ADMIN_TOKEN_KEY)
      window.sessionStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY)
    }
  } catch {
    // Keep the token in memory for this page if browser storage is unavailable.
  }
  invalidateApiCache()
}

export function getAdminAccessToken() {
  if (typeof window === "undefined") return adminAccessToken
  try {
    const stored =
      window.localStorage.getItem(ADMIN_TOKEN_KEY) ??
      window.sessionStorage.getItem(ADMIN_TOKEN_KEY)
    adminAccessToken = stored
    return stored
  } catch {
    return adminAccessToken
  }
}

export function setCustomerAccessToken(token: string | null) {
  customerAccessToken = token
  if (typeof window === "undefined") return
  try {
    if (token) {
      if (isCustomerSessionOnly()) {
        window.sessionStorage.setItem(CUSTOMER_TOKEN_KEY, token)
        window.localStorage.removeItem(CUSTOMER_TOKEN_KEY)
      } else {
        window.localStorage.setItem(CUSTOMER_TOKEN_KEY, token)
        window.sessionStorage.removeItem(CUSTOMER_TOKEN_KEY)
      }
      // When setting customer token, ensure admin session in this browser is wiped
      window.localStorage.removeItem(ADMIN_TOKEN_KEY)
      window.localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY)
      window.localStorage.removeItem("prime-pos-admin-profile")
      window.sessionStorage.removeItem(ADMIN_TOKEN_KEY)
      window.sessionStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY)
      window.sessionStorage.removeItem("prime-pos-admin-profile")
    } else {
      window.localStorage.removeItem(CUSTOMER_TOKEN_KEY)
      window.localStorage.removeItem(CUSTOMER_REFRESH_TOKEN_KEY)
      window.localStorage.removeItem("prime-pos-customer-profile")
      window.sessionStorage.removeItem(CUSTOMER_TOKEN_KEY)
      window.sessionStorage.removeItem(CUSTOMER_REFRESH_TOKEN_KEY)
      window.sessionStorage.removeItem("prime-pos-customer-profile")
      window.sessionStorage.removeItem(CUSTOMER_SESSION_ONLY_KEY)
    }
  } catch {
    // Keep the token in memory for this page if storage is unavailable.
  }
  invalidateApiCache()
}

export function getCustomerAccessToken() {
  if (typeof window === "undefined") return customerAccessToken
  try {
    const stored =
      window.localStorage.getItem(CUSTOMER_TOKEN_KEY) ??
      window.sessionStorage.getItem(CUSTOMER_TOKEN_KEY)
    customerAccessToken = stored
    return stored
  } catch {
    return customerAccessToken
  }
}

export async function api<T>(
  path: string,
  init: ApiInit = {}
): Promise<ActionResult<T>> {
  const { skipAuthRedirect, customerAuth, ...fetchInit } = init
  const method = (fetchInit.method ?? "GET").toUpperCase()
  const customerScope = customerAuth ? getCustomerCacheScope() : null
  const shouldCache =
    method === "GET" &&
    fetchInit.cache !== "no-store" &&
    (!customerAuth || customerScope !== null)
  const cacheKey =
    customerAuth && customerScope
      ? `customer:${customerScope}:${path}`
      : path

  attachStorageListener()

  if (shouldCache) {
    const cached = readCachedResult(cacheKey)
    if (cached) {
      return cloneResult(cached.result as ActionResult<T>)
    }

    const pending = pendingGets.get(cacheKey)
    if (pending) return cloneResult((await pending) as ActionResult<T>)
  }

  const isForm = fetchInit.body instanceof FormData

  const request = async (): Promise<ActionResult<T>> => {
    try {
      const initialToken = customerAuth
        ? getCustomerAccessToken()
        : getAdminAccessToken()
      const send = (token: string | null) =>
        fetch(`${BASE}${path}`, {
          credentials: "same-origin", // sends the JWT cookie (same origin via the proxy)
          ...fetchInit,
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            // For FormData the browser sets Content-Type (with the boundary) itself
            ...(fetchInit.body && !isForm
              ? { "Content-Type": "application/json" }
              : {}),
            ...fetchInit.headers,
          },
        })

      let res = await send(initialToken)
      let json = (await res.json().catch(() => null)) as Envelope<T> | null

      if (res.status === 401 && !skipAuthRedirect && initialToken) {
        const newAccessToken = await refreshSessionToken(Boolean(customerAuth))
        if (newAccessToken) {
          res = await send(newAccessToken)
          json = (await res.json().catch(() => null)) as Envelope<T> | null
        }
      }

      if (res.status === 401 && !skipAuthRedirect) {
        // The customer is already signed out (no token was sent), so there is
        // no session to expire. Don't wipe state or navigate; the layout guard
        // already moves signed-out customers to the login page.
        if (customerAuth && !initialToken) {
          return {
            success: false,
            error: "Please sign in to continue.",
          }
        }
        invalidateApiCache()
        if (customerAuth) setCustomerAccessToken(null)
        else if (initialToken) setAdminAccessToken(null)
        clearActiveSessionLock()
        // Customers are sent to the login page by the customer layout (it
        // listens for this session change), so there is no full page reload.
        if (
          !customerAuth &&
          typeof window !== "undefined" &&
          window.location.pathname !== LOGIN_PATH
        ) {
          window.location.href = LOGIN_PATH
        }
        return {
          success: false,
          error: "Session expired. Please sign in again.",
        }
      }

      if (!res.ok || json?.success === false) {
        return {
          success: false,
          error:
            errorText(json?.error) ??
            errorText(json?.message) ??
            `Request failed (${res.status}).`,
        }
      }

      return { success: true, data: json?.data as T }
    } catch {
      return {
        success: false,
        error: "Can't reach the server. Check your connection and try again.",
      }
    }
  }

  if (!shouldCache) {
    const result = await request()
    if (result.success && method !== "GET") invalidateApiCache()
    return result
  }

  const requestRevision = cacheRevision
  const pendingRequest = request().then((result) => {
    if (result.success && requestRevision === cacheRevision) {
      const cached: CachedResult = {
        result: result as ActionResult<unknown>,
        expiresAt: Date.now() + cacheLifetime(path),
      }
      responseCache.set(cacheKey, cached)
      if (typeof window !== "undefined" && result.data !== undefined) {
        try {
          window.sessionStorage.setItem(
            storedCacheKey(cacheKey),
            JSON.stringify(cached)
          )
        } catch {
          // Continue using the in-memory cache if session storage is full or disabled.
        }
      }
    }
    return result as ActionResult<unknown>
  })
  pendingGets.set(cacheKey, pendingRequest)
  try {
    return cloneResult((await pendingRequest) as ActionResult<T>)
  } finally {
    if (pendingGets.get(cacheKey) === pendingRequest)
      pendingGets.delete(cacheKey)
  }
}
