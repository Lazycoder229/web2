// lib/api/client.ts
import type { ActionResult } from "@/types/admin/menu"

const BASE = "/backend"
const LOGIN_PATH = "/login" // where to send the user when the session expires

type Envelope<T> = {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

type ApiInit = RequestInit & {
  /** Don't redirect to login on a 401. Use for the login request itself. */
  skipAuthRedirect?: boolean
}

export async function api<T>(
  path: string,
  init: ApiInit = {}
): Promise<ActionResult<T>> {
  const { skipAuthRedirect, ...fetchInit } = init
  const isForm = fetchInit.body instanceof FormData

  try {
    const res = await fetch(`${BASE}${path}`, {
      credentials: "same-origin", // sends the JWT cookie (same origin via the proxy)
      ...fetchInit,
      headers: {
        Accept: "application/json",
        // For FormData the browser sets Content-Type (with the boundary) itself
        ...(fetchInit.body && !isForm
          ? { "Content-Type": "application/json" }
          : {}),
        ...fetchInit.headers,
      },
    })

    const json = (await res.json().catch(() => null)) as Envelope<T> | null

    if (res.status === 401 && !skipAuthRedirect) {
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== LOGIN_PATH
      ) {
        window.location.href = LOGIN_PATH
      }
      return { success: false, error: "Session expired. Please sign in again." }
    }

    if (!res.ok || json?.success === false) {
      return {
        success: false,
        error:
          json?.error ?? json?.message ?? `Request failed (${res.status}).`,
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
