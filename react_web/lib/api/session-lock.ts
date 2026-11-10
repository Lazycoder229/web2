// lib/api/session-lock.ts

export type ActiveSessionLock = {
  type: "admin" | "customer"
  userId: string
  name: string
  email: string
  role?: string
  startedAt: number
}

export const ACTIVE_SESSION_LOCK_KEY = "prime-pos:active-session-lock"
export const AUTH_SYNC_EVENT = "prime-pos:auth-sync"
export const AUTH_SYNC_KEY = "prime-pos:auth-sync-timestamp"

let sessionChannel: BroadcastChannel | null = null

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return null
  if (!sessionChannel) {
    try {
      sessionChannel = new BroadcastChannel("prime-pos:session-channel")
    } catch {
      sessionChannel = null
    }
  }
  return sessionChannel
}

export function getActiveSessionLock(): ActiveSessionLock | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(ACTIVE_SESSION_LOCK_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ActiveSessionLock>
    if (
      (parsed.type === "admin" || parsed.type === "customer") &&
      parsed.userId &&
      parsed.email
    ) {
      // A lock only counts while that account still has a token in this browser.
      // Otherwise it is stale (expired/cleared session) and must not block login.
      if (!hasStoredTokens(parsed.type)) {
        try {
          window.localStorage.removeItem(ACTIVE_SESSION_LOCK_KEY)
        } catch {
          // Local storage unavailable
        }
        return null
      }
      return parsed as ActiveSessionLock
    }
    return null
  } catch {
    return null
  }
}

function hasStoredTokens(type: "admin" | "customer"): boolean {
  const keys =
    type === "admin"
      ? ["prime-pos:admin-access-token", "prime-pos:admin-refresh-token"]
      : ["prime-pos:customer-access-token", "prime-pos:customer-refresh-token"]
  try {
    return keys.some(
      (key) =>
        Boolean(window.localStorage.getItem(key)) ||
        Boolean(window.sessionStorage.getItem(key))
    )
  } catch {
    return true
  }
}

export function setActiveSessionLock(session: ActiveSessionLock): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      ACTIVE_SESSION_LOCK_KEY,
      JSON.stringify(session)
    )
  } catch {
    // Local storage unavailable
  }
  broadcastSessionChange(session)
}

export function clearActiveSessionLock(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(ACTIVE_SESSION_LOCK_KEY)
  } catch {
    // Local storage unavailable
  }
  broadcastSessionChange(null)
}

export function canStartSession(attempt: {
  type: "admin" | "customer"
  email?: string
  userId?: string
}): {
  allowed: boolean
  activeSession: ActiveSessionLock | null
  reason?: string
} {
  const current = getActiveSessionLock()
  if (!current) {
    return { allowed: true, activeSession: null }
  }

  const attemptEmail = attempt.email?.trim().toLowerCase()
  const currentEmail = current.email.trim().toLowerCase()

  // Allow re-authenticating the exact same user
  const isSameUser =
    current.type === attempt.type &&
    ((attemptEmail && currentEmail && attemptEmail === currentEmail) ||
      (Boolean(attempt.userId) && current.userId === attempt.userId))

  if (isSameUser) {
    return { allowed: true, activeSession: current }
  }

  if (current.type === "admin") {
    return {
      allowed: false,
      activeSession: current,
      reason: `May aktibong admin session na (${current.name} - ${current.email}) sa browser na ito. Mag-sign out muna bago mag-log in sa ibang account.`,
    }
  }

  return {
    allowed: false,
    activeSession: current,
    reason: `May aktibong customer session na (${current.name} - ${current.email}) sa browser na ito. Mag-sign out muna bago mag-log in sa ibang account.`,
  }
}

export function broadcastSessionChange(
  session?: ActiveSessionLock | null
): void {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(AUTH_SYNC_KEY, String(Date.now()))
    // Other tabs are notified by the storage event; don't leave the key behind.
    window.localStorage.removeItem(AUTH_SYNC_KEY)
  } catch {
    // Local storage unavailable
  }

  const payload = session !== undefined ? session : getActiveSessionLock()

  try {
    window.dispatchEvent(
      new CustomEvent(AUTH_SYNC_EVENT, { detail: payload })
    )
  } catch {
    // Event dispatch unavailable
  }

  const bc = getBroadcastChannel()
  if (bc) {
    try {
      bc.postMessage({
        type: "session-change",
        session: payload,
        timestamp: Date.now(),
      })
    } catch {
      // BroadcastChannel postMessage failed
    }
  }
}

export function subscribeToSessionChanges(
  callback: (session: ActiveSessionLock | null) => void
): () => void {
  if (typeof window === "undefined") return () => {}

  const handleStorage = (e: StorageEvent) => {
    if (
      e.key === ACTIVE_SESSION_LOCK_KEY ||
      e.key === AUTH_SYNC_KEY ||
      e.key === "prime-pos:admin-access-token" ||
      e.key === "prime-pos:customer-access-token" ||
      e.key === null
    ) {
      callback(getActiveSessionLock())
    }
  }

  const handleCustom = (e: Event) => {
    const detail = (e as CustomEvent<ActiveSessionLock | null>).detail
    callback(detail !== undefined ? detail : getActiveSessionLock())
  }

  const bc = getBroadcastChannel()
  const handleBc = (e: MessageEvent) => {
    if (e.data?.type === "session-change") {
      callback(getActiveSessionLock())
    }
  }

  window.addEventListener("storage", handleStorage)
  window.addEventListener(AUTH_SYNC_EVENT, handleCustom as EventListener)
  if (bc) {
    bc.addEventListener("message", handleBc)
  }

  return () => {
    window.removeEventListener("storage", handleStorage)
    window.removeEventListener(AUTH_SYNC_EVENT, handleCustom as EventListener)
    if (bc) {
      bc.removeEventListener("message", handleBc)
    }
  }
}
