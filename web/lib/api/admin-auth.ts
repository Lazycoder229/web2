import {
  api,
  getAdminAccessToken,
  getAdminRefreshToken,
  setAdminAccessToken,
  setAdminRefreshToken,
} from "./client"
import {
  canStartSession,
  clearActiveSessionLock,
  setActiveSessionLock,
} from "./session-lock"

const ADMIN_PROFILE_KEY = "prime-pos-admin-profile"

export type AdminProfile = {
  id: string
  name: string
  email: string
  role: string
}

type AdminLoginResponse = {
  user: AdminProfile
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export async function loginAdmin(input: { email: string; password: string }) {
  const email = input.email.trim()
  const check = canStartSession({ type: "admin", email })
  if (!check.allowed) {
    return {
      success: false as const,
      error: check.reason ?? "May ibang user na kasalukuyang naka-login sa browser na ito.",
    }
  }

  const result = await api<AdminLoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ ...input, email }),
    skipAuthRedirect: true,
  })
  if (result.success && result.data?.accessToken) {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("prime-pos-customer-profile")
        window.sessionStorage.removeItem("prime-pos-customer-profile")
      } catch {
        // storage fallback
      }
    }
    setAdminAccessToken(result.data.accessToken)
    setAdminRefreshToken(result.data.refreshToken)
    saveAdminProfile(result.data.user)
  }
  return result
}

export function saveAdminProfile(profile: AdminProfile) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(profile))
    window.sessionStorage.removeItem(ADMIN_PROFILE_KEY)
  } catch {
    // Keep the active login working when browser storage is unavailable.
  }
  setActiveSessionLock({
    type: "admin",
    userId: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    startedAt: Date.now(),
  })
}

export function getSavedAdminProfile(): AdminProfile | null {
  if (typeof window === "undefined") return null
  try {
    const value =
      window.localStorage.getItem(ADMIN_PROFILE_KEY) ??
      window.sessionStorage.getItem(ADMIN_PROFILE_KEY)
    if (!value) return null
    const profile = JSON.parse(value) as Partial<AdminProfile>
    return profile.id && profile.name && profile.email && profile.role
      ? (profile as AdminProfile)
      : null
  } catch {
    return null
  }
}

export function logoutAdmin() {
  const refreshToken = getAdminRefreshToken()
  const request = refreshToken
    ? api<{ loggedOut: boolean }>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
        skipAuthRedirect: true,
      })
    : Promise.resolve(null)
  setAdminAccessToken(null)
  setAdminRefreshToken(null)
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(ADMIN_PROFILE_KEY)
      window.sessionStorage.removeItem(ADMIN_PROFILE_KEY)
    } catch {
      // storage fallback
    }
  }
  clearActiveSessionLock()
  return request
}

export async function fetchAdminProfile() {
  if (!getAdminAccessToken()) {
    return {
      success: false as const,
      error: "Sign in to open the admin portal.",
    }
  }
  return api<{ user: AdminProfile }>("/auth/me", {
    cache: "no-store",
    skipAuthRedirect: true,
  })
}
