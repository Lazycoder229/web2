'use server'

import lavalustApi from '@/lib/lavalust'
import { cookies } from 'next/headers'
import axios from 'axios'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
  try {
    const res = await lavalustApi.post('/login', {
      username: formData.get('username'),
     
      password: formData.get('password'),


    })

    const { access_token, refresh_token, expires_in } = res.data
    const cookieStore = await cookies()

    cookieStore.set('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expires_in,
      path: '/',
    })

    cookieStore.set('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    redirect('/dashboard') 

  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      return { success: false, error: error.response?.data?.message ?? 'Login failed' }
    }
    return { success: false, error: 'Unexpected error' }
  }
}
export async function logout() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('refresh_token')?.value

  try {
    if (refreshToken) {
      await lavalustApi.post('/logout', {
        refresh_token: refreshToken,
      })
    }
  } catch (error) {
    console.error('Logout API error:', error)
  } finally {
    cookieStore.delete('access_token')
    cookieStore.delete('refresh_token')
  }
}