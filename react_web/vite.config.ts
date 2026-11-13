import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import { Agent } from "node:https"


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const configuredApiUrl = env.LAVALUST_URL ?? "http://127.0.0.1:3001/api"
  const parsedApiUrl = new URL(configuredApiUrl)
  // LAVALUST_URL is often configured as the backend host only. The local
  // proxy still needs the framework's /api base path in that case.
  const apiPath = parsedApiUrl.pathname === "/"
    ? "/api"
    : parsedApiUrl.pathname.replace(/\/+$/, "")
  const apiOrigin = parsedApiUrl.origin
  const proxyAgent = parsedApiUrl.protocol === "https:"
    ? new Agent({ ca: getCACertificates("system") })
    : undefined
  const realtimeProxyUrl = env.REALTIME_PROXY_URL ?? "ws://127.0.0.1:3002"
  const realtimeProxyTarget = realtimeProxyUrl.replace(/^ws:/, "http:").replace(/^wss:/, "https:")

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiOrigin,
          agent: proxyAgent,
          changeOrigin: true,
        },
        "/backend": {
          target: apiOrigin,
          agent: proxyAgent,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/backend/, apiPath),
        },
        "/uploads": {
          target: apiOrigin,
          agent: proxyAgent,
          changeOrigin: true,
        },
        "/ws": {
          target: realtimeProxyTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  }
})
