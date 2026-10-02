"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, ChefHat, Loader2, LogIn, QrCode, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type DetectedCode = { rawValue: string }
type QrDetector = {
  detect: (source: HTMLVideoElement) => Promise<DetectedCode[]>
}
type QrDetectorConstructor = new (options: { formats: string[] }) => QrDetector

export function CustomerEntry() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState("")
  const [startingCamera, setStartingCamera] = useState(false)

  useEffect(() => {
    if (!scannerOpen) return
    let stream: MediaStream | null = null
    let intervalId = 0
    let detecting = false
    let active = true

    async function startScanner() {
      setStartingCamera(true)
      setScannerError("")
      const Detector = (
        window as Window & { BarcodeDetector?: QrDetectorConstructor }
      ).BarcodeDetector
      if (!Detector) {
        setScannerError(
          "QR scanning is not supported in this browser. Use your phone camera to scan the table QR code."
        )
        setStartingCamera(false)
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerError(
          "Camera access is unavailable. Use your phone camera to scan the table QR code."
        )
        setStartingCamera(false)
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        })
        if (!active || !videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        const detector = new Detector({ formats: ["qr_code"] })
        intervalId = window.setInterval(async () => {
          if (!active || detecting || !videoRef.current) return
          detecting = true
          try {
            const codes = await detector.detect(videoRef.current)
            const value = codes[0]?.rawValue
            if (value) openScannedTable(value)
          } catch {
            // The camera may not have a decoded frame yet; keep scanning.
          } finally {
            detecting = false
          }
        }, 300)
      } catch {
        setScannerError(
          "Could not open the camera. Allow camera access and try again."
        )
      } finally {
        if (active) setStartingCamera(false)
      }
    }

    function openScannedTable(value: string) {
      try {
        const url = new URL(value, window.location.origin)
        const tableId =
          url.searchParams.get("tableId") ??
          url.pathname.match(/^\/t\/([^/]+)/)?.[1]
        if (!tableId) {
          setScannerError(
            "That QR code is not a PRIME POS table code. Scan the QR code on your table."
          )
          return
        }
        active = false
        router.push(`/customer?tableId=${encodeURIComponent(tableId)}`)
        setScannerOpen(false)
      } catch {
        setScannerError("Could not read that QR code. Try scanning it again.")
      }
    }

    void startScanner()
    return () => {
      active = false
      if (intervalId) window.clearInterval(intervalId)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [router, scannerOpen])

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col justify-center">
      <section className="rounded-2xl border bg-card p-5 shadow-xs sm:p-8">
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
            <ChefHat className="size-7" />
          </span>
          <p className="mt-4 text-xs font-semibold tracking-[.16em] text-amber-600 uppercase">
            PRIME POS · CUSTOMER
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Scan your table QR to order, or sign in to access your customer
            account.
          </p>
        </div>

        <div className="mt-7 grid gap-3">
          <Button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="h-12 bg-amber-500 text-base font-semibold text-amber-950 hover:bg-amber-400"
          >
            <QrCode className="mr-2 size-5" />
            Scan table QR
          </Button>
          <Button asChild variant="outline" className="h-12 text-base">
            <Link href="/customer/login">
              <LogIn className="mr-2 size-5" />
              Login
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12 text-base">
            <Link href="/customer/register">
              <UserPlus className="mr-2 size-5" />
              Create account
            </Link>
          </Button>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          You can place a QR order as a guest. Create an account to keep your
          orders, reservations, and loyalty points together.
        </p>
      </section>

      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="size-5 text-amber-600" />
              Scan table QR
            </DialogTitle>
            <DialogDescription>
              Allow camera access and hold the table QR code inside the frame.
            </DialogDescription>
          </DialogHeader>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              className="size-full object-cover"
            />
            <div className="pointer-events-none absolute inset-[14%] rounded-2xl border-2 border-amber-400 shadow-[0_0_0_999px_rgba(0,0,0,.22)]" />
            {startingCamera && (
              <div className="absolute inset-0 grid place-items-center bg-black/60 text-sm text-white">
                <Loader2 className="mr-2 inline size-4 animate-spin" />
                Starting camera…
              </div>
            )}
          </div>
          {scannerError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {scannerError}
            </p>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setScannerOpen(false)}>
              Close scanner
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
