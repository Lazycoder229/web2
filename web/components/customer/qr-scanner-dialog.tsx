"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Loader2 } from "lucide-react"
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

/** Camera dialog that reads a table QR code and opens that table's order page. */
export function QrScannerDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scannerError, setScannerError] = useState("")
  const [startingCamera, setStartingCamera] = useState(false)

  useEffect(() => {
    if (!open) return
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
        onOpenChange(false)
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
  }, [router, open, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close scanner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
