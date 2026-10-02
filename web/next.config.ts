import type { NextConfig } from "next"

const apiUrl = process.env.LAVALUST_URL ?? "http://localhost:3001/api"
const apiOrigin = new URL(apiUrl).origin

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${apiOrigin}/uploads/:path*`,
      },
      {
        source: "/backend/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig
