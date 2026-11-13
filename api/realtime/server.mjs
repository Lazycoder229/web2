import { createServer } from "node:http"
import { timingSafeEqual } from "node:crypto"
import { WebSocketServer, WebSocket } from "ws"

const port = Number(process.env.PORT ?? 3002)
const publishSecret = process.env.REALTIME_PUBLISH_SECRET ?? ""
const allowedOrigins = new Set(
  (process.env.WS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
)
const allowUnlistedOrigins = process.env.NODE_ENV !== "production" && allowedOrigins.size === 0
const eventTypes = new Set(["orders.changed", "stock.changed"])

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" })
    response.end(JSON.stringify({ ok: true }))
    return
  }

  if (request.method !== "POST" || request.url !== "/publish") {
    response.writeHead(404).end()
    return
  }

  if (!publishSecret || !isAuthorized(request.headers.authorization)) {
    response.writeHead(401).end()
    return
  }

  let body = ""
  request.on("data", (chunk) => {
    body += chunk
    if (body.length > 2048) request.destroy()
  })
  request.on("end", () => {
    let event
    try {
      event = JSON.parse(body)
    } catch {
      response.writeHead(400).end()
      return
    }

    if (!eventTypes.has(event.type)) {
      response.writeHead(422).end()
      return
    }

    const message = JSON.stringify({ type: event.type, emittedAt: Date.now() })
    for (const client of sockets.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(message)
    }
    response.writeHead(202, { "content-type": "application/json" })
    response.end(JSON.stringify({ published: true }))
  })
})

const sockets = new WebSocketServer({
  server,
  path: "/ws",
  maxPayload: 1024,
  perMessageDeflate: false,
  verifyClient: ({ origin }, done) => {
    done(allowedOrigins.has(origin) || allowUnlistedOrigins)
  },
})

sockets.on("connection", (socket) => {
  socket.isAlive = true
  socket.on("pong", () => { socket.isAlive = true })
  // Clients only receive invalidation events; never accept client-published events.
  socket.on("message", () => socket.close(1008, "Read-only event connection"))
})

const heartbeat = setInterval(() => {
  for (const socket of sockets.clients) {
    if (!socket.isAlive) {
      socket.terminate()
      continue
    }
    socket.isAlive = false
    socket.ping()
  }
}, 30_000)

function isAuthorized(header) {
  const supplied = String(header ?? "").replace(/^Bearer\s+/i, "")
  if (!supplied || supplied.length !== publishSecret.length) return false
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(publishSecret))
}

server.listen(port, "0.0.0.0", () => {
  console.log(`Realtime service listening on ${port}`)
})

function shutdown() {
  clearInterval(heartbeat)
  for (const socket of sockets.clients) socket.close(1001, "Service restarting")
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 25_000).unref()
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
