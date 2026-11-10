"use client"

import { useEffect, useState } from "react"
import { Download, Share, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSED_KEY = "prime-pos:install-prompt-dismissed-at"
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function recentlyDismissed() {
  try {
    const at = Number(window.localStorage.getItem(DISMISSED_KEY) ?? 0)
    return at > 0 && Date.now() - at < SNOOZE_MS
  } catch {
    return false
  }
}

/**
 * Registers the (cache-free) service worker and offers to install the customer
 * app. Chrome/Edge/Android show a real install button; iPhone Safari has no
 * install API, so it gets "Add to Home Screen" instructions instead.
 */
export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if (window.isSecureContext && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/pwa-worker.js", { scope: "/" })
        .catch(() => {
          // Installing is optional; the site works without the worker.
        })
    }

    if (isStandalone() || recentlyDismissed()) return

    const ua = window.navigator.userAgent
    const isIos =
      /iphone|ipad|ipod/i.test(ua) ||
      (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)
    if (isIos && isSafari) {
      setShowIosHint(true)
      setHidden(false)
    }

    function onBeforeInstall(event: Event) {
      event.preventDefault()
      setInstallEvent(event as InstallEvent)
      setHidden(false)
    }
    function onInstalled() {
      setInstallEvent(null)
      setShowIosHint(false)
      setHidden(true)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  function dismiss() {
    setHidden(true)
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    } catch {
      // The banner just comes back next visit.
    }
  }

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    setInstallEvent(null)
    if (choice.outcome === "accepted") setHidden(true)
    else dismiss()
  }

  if (hidden || (!installEvent && !showIosHint)) return null

  return (
    <div className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 mx-auto max-w-md rounded-2xl border bg-card p-4 shadow-lg">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="absolute top-2 right-2 rounded-full p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="size-4" />
      </button>
      <p className="pr-6 text-sm font-semibold">Install PRIME POS</p>
      {installEvent ? (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            Add the app to your home screen to scan, order, and track rewards
            faster.
          </p>
          <Button
            type="button"
            onClick={() => void install()}
            className="mt-3 h-10 w-full bg-amber-500 font-semibold text-amber-950 hover:bg-amber-400"
          >
            <Download className="mr-2 size-4" />
            Install app
          </Button>
        </>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          Tap <Share className="mx-0.5 inline size-3.5 align-text-bottom" />{" "}
          Share, then <strong>Add to Home Screen</strong> to install the app.
        </p>
      )}
    </div>
  )
}
