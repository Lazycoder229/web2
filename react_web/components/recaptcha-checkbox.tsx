"use client"

import { useEffect, useRef, useState } from "react"

type RecaptchaWidget = {
  ready: (callback: () => void) => void
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      "expired-callback": () => void
      "error-callback": () => void
    }
  ) => number
}

declare global {
  interface Window {
    grecaptcha?: RecaptchaWidget
  }
}

const SCRIPT_ID = "google-recaptcha-v2-script"

export function RecaptchaCheckbox({
  onTokenChange,
}: {
  onTokenChange: (token: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onTokenChange)
  const widgetIdRef = useRef<number | null>(null)
  const [loadError, setLoadError] = useState(false)
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined
  const enabled = import.meta.env.VITE_RECAPTCHA_ENABLED !== "false"

  useEffect(() => {
    callbackRef.current = onTokenChange
  }, [onTokenChange])

  useEffect(() => {
    if (!enabled || !siteKey || !containerRef.current) return

    const renderWidget = () => {
      if (
        !containerRef.current ||
        !window.grecaptcha ||
        widgetIdRef.current !== null
      ) {
        return
      }
      window.grecaptcha.ready(() => {
        if (
          !containerRef.current ||
          !window.grecaptcha ||
          widgetIdRef.current !== null
        ) {
          return
        }
        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => callbackRef.current(token),
          "expired-callback": () => callbackRef.current(""),
          "error-callback": () => callbackRef.current(""),
        })
      })
    }

    const existingScript = document.getElementById(SCRIPT_ID)
    if (existingScript) {
      if (window.grecaptcha) renderWidget()
      else existingScript.addEventListener("load", renderWidget, { once: true })
      return () => existingScript.removeEventListener("load", renderWidget)
    }

    const script = document.createElement("script")
    script.id = SCRIPT_ID
    script.src = "https://www.recaptcha.net/recaptcha/api.js?render=explicit"
    script.async = true
    script.defer = true
    script.addEventListener("load", renderWidget, { once: true })
    script.addEventListener("error", () => setLoadError(true), { once: true })
    document.head.appendChild(script)

    return () => script.removeEventListener("load", renderWidget)
  }, [enabled, siteKey])

  if (!enabled || !siteKey) return null
  return (
    <div className="min-h-20">
      <div ref={containerRef} />
      {loadError && (
        <p className="text-xs text-destructive">
          CAPTCHA could not load. Check the site key and allowed domain.
        </p>
      )}
    </div>
  )
}