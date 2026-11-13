import { useEffect, useRef, useState } from "react"
import { invalidateApiCache } from "./client"

export type RealtimeEventType = "orders.changed" | "stock.changed"
type RealtimeEvent = { type: RealtimeEventType; emittedAt?: number }

export function useRealtimeEvents(
  eventTypes: RealtimeEventType[],
  onEvent: (event: RealtimeEvent) => void,
) {
  const [connected, setConnected] = useState(false)
  const callbackRef = useRef(onEvent)
  callbackRef.current = onEvent
  const eventKey = eventTypes.join(",")

  useEffect(() => {
    const configuredUrl = import.meta.env.VITE_REALTIME_URL as string | undefined
    const url = configuredUrl || (import.meta.env.DEV
      ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`
      : "")
    if (!url) return

    let socket: WebSocket | null = null
    let reconnectTimer: number | undefined
    let attempts = 0
    let disposed = false

    const connect = () => {
      if (disposed) return
      socket = new WebSocket(url)
      socket.onopen = () => {
        attempts = 0
        setConnected(true)
      }
      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(String(message.data)) as RealtimeEvent
          if (!eventTypes.includes(event.type)) return
          invalidateApiCache()
          callbackRef.current(event)
        } catch {
          // Ignore malformed broadcasts and keep the connection alive.
        }
      }
      socket.onclose = () => {
        setConnected(false)
        if (disposed) return
        attempts += 1
        const delay = Math.min(1_000 * 2 ** Math.min(attempts - 1, 5), 30_000)
        reconnectTimer = window.setTimeout(connect, delay)
      }
      socket.onerror = () => socket?.close()
    }

    connect()
    return () => {
      disposed = true
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer)
      socket?.close()
      setConnected(false)
    }
  }, [eventKey])

  return connected
}
