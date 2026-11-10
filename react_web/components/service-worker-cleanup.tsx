"use client"

import { useEffect } from "react"

const reloadKey = "prime-pos:removed-stale-sw"

export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    let active = true
    void navigator.serviceWorker
      .getRegistrations()
      .then(async (registrations) => {
        if (!active) return
        const staleRegistrations = registrations.filter((registration) =>
          [registration.active, registration.waiting, registration.installing]
            .filter(Boolean)
            .some((worker) => {
              const script = new URL(worker!.scriptURL)
              return (
                script.origin === window.location.origin &&
                script.pathname.endsWith("/sw.js")
              )
            })
        )

        if (staleRegistrations.length === 0) {
          window.sessionStorage.removeItem(reloadKey)
          return
        }

        await Promise.all(
          staleRegistrations.map((registration) => registration.unregister())
        )
        if (!active || window.sessionStorage.getItem(reloadKey)) return

        window.sessionStorage.setItem(reloadKey, "1")
        window.location.reload()
      })
      .catch(() => {
        // The page can still load normally if service worker access is blocked.
      })

    return () => {
      active = false
    }
  }, [])

  return null
}
