import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiUrl = env.LAVALUST_URL ?? "http://127.0.0.1:3001/api"
  const apiOrigin = new URL(apiUrl).origin

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
        },
        "/backend": {
          target: apiOrigin,
          rewrite: (path) => path.replace(/^\/backend/, new URL(apiUrl).pathname),
        },
        "/uploads": {
          target: apiOrigin,
        },
      },
    },
  }
})
