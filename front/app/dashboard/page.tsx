'use client'

import { logout } from '../auth/action'
import { useTransition } from 'react'

export default function LoginForm() {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logout()
      window.location.href = '/'
    })
  }

  return (
    <div>
      <h1>Hello</h1>

      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
      >
        {isPending ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  )
}