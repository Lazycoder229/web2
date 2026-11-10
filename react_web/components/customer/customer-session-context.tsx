"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  fetchCustomerProfile,
  getSavedCustomerProfile,
  logoutCustomer,
  type CustomerProfile,
} from "@/lib/api/customer"
import { getCustomerAccessToken } from "@/lib/api/client"
import {
  getActiveSessionLock,
  subscribeToSessionChanges,
} from "@/lib/api/session-lock"

type CustomerSessionValue = {
  profile: CustomerProfile | null
  status: number | null
  loading: boolean
  /** True after the customer chose to sign out in this tab. */
  signedOut: boolean
  refresh: () => Promise<void>
  setProfile: (profile: CustomerProfile) => void
  signOut: () => void
}

const CustomerSessionContext = createContext<CustomerSessionValue | null>(null)

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [signedOut, setSignedOut] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const result = await fetchCustomerProfile()
    if (result.success && result.data) {
      setProfile(result.data)
      setStatus(200)
      setSignedOut(false)
    } else {
      setProfile(null)
      setStatus(401)
    }
    setLoading(false)
  }, [])

  const setSignedInProfile = useCallback((customer: CustomerProfile) => {
    setProfile(customer)
    setStatus(200)
    setLoading(false)
    setSignedOut(false)
  }, [])

  const signOut = useCallback(() => {
    logoutCustomer()
    setProfile(null)
    setStatus(401)
    setLoading(false)
    setSignedOut(true)
  }, [])

  useEffect(() => {
    function syncSession() {
      const active = getActiveSessionLock()
      const token = getCustomerAccessToken()

      // No token at all → definitely not logged in
      if (!token) {
        setProfile(null)
        setStatus(401)
        setLoading(false)
        return
      }

      // Token exists but session lock is for a different role (admin)
      // → clear the customer state since admin has precedence
      if (active && active.type !== "customer") {
        setProfile(null)
        setStatus(401)
        setLoading(false)
        return
      }

      // Token exists and session lock is customer (or no lock but token exists)
      const saved = getSavedCustomerProfile()
      if (saved) {
        setProfile(saved)
        setStatus(200)
        setLoading(false)
        setSignedOut(false)
        return
      }

      void refresh()
    }

    syncSession()
    const unsubscribe = subscribeToSessionChanges(() => {
      syncSession()
    })
    return () => {
      unsubscribe()
    }
  }, [refresh])


  const value = useMemo(
    () => ({
      profile,
      status,
      loading,
      signedOut,
      refresh,
      setProfile: setSignedInProfile,
      signOut,
    }),
    [profile, status, loading, signedOut, refresh, setSignedInProfile, signOut]
  )

  return (
    <CustomerSessionContext.Provider value={value}>
      {children}
    </CustomerSessionContext.Provider>
  )
}

export function useCustomerSession() {
  const context = useContext(CustomerSessionContext)
  if (!context) {
    throw new Error(
      "useCustomerSession must be used inside CustomerSessionProvider"
    )
  }
  return context
}
