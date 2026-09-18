// lib/lavalust.ts
import axios from 'axios'
import { cookies } from 'next/headers'

const lavalustApi = axios.create({
  baseURL: process.env.LAVALUST_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

lavalustApi.interceptors.request.use(async (config) => {
  const token = (await cookies()).get('access_token')?.value
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

lavalustApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // kung 401 (expired access token) at hindi pa na-retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const cookieStore = await cookies()
      const refreshToken = cookieStore.get('refresh_token')?.value

      if (refreshToken) {
        try {
          const refreshRes = await axios.post(`${process.env.LAVALUST_API_URL}/refresh`, {
            refresh_token: refreshToken,
          })

          const { access_token, refresh_token } = refreshRes.data
          cookieStore.set('access_token', access_token, { httpOnly: true, maxAge: 900, path: '/' })
          cookieStore.set('refresh_token', refresh_token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/' })

          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return lavalustApi(originalRequest) // ulitin yung original request na may bagong token
        } catch {
          cookieStore.delete('access_token')
          cookieStore.delete('refresh_token')
        }
      }
    }

    console.error('LavaLust API error:', error.response?.data ?? error.message)
    return Promise.reject(error)
  }
)

export default lavalustApi