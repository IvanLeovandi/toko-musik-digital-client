'use client'

import { createContext, useContext, useEffect, useState } from "react"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import useWallet from "@/hooks/useWallet"
import { showToast } from "@/utils/toast"

type Role = 'USER' | 'ADMIN'

interface AuthUser {
  id: string
  email: string
  walletAddress?: string
  role: Role
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isHydrated: boolean
  logout: () => void
  dbSyncFailed: boolean
  retryRemoveWalletFromDB: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [dbSyncFailed, setDbSyncFailed] = useState(false)
  const [readyToSyncDisconnect, setReadyToSyncDisconnect] = useState(false)
  const router = useRouter()
  const { account, signMessage } = useWallet()

  useEffect(() => {
    const storedToken = Cookies.get("token")
    const storedUser = Cookies.get("user")
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    const verifyWallet = async () => {
      if (token && user && !user.walletAddress && account && signMessage) {
        const message = `Sign this message to verify wallet: ${account}`
        const signature = await signMessage(message)

        const res = await fetch("/api/auth/verify-signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, address: account, message, signature }),
        })

        const result = await res.json()
        if (res.ok) {
          setUser(result.user)
          Cookies.set("user", JSON.stringify(result.user))
        }
      }
    }

    verifyWallet()
  }, [token, user, account, signMessage])

  useEffect(() => {
    if (isHydrated && user && account) {
      setReadyToSyncDisconnect(true)
    }
  }, [isHydrated, user, account])

  useEffect(() => {
    const shouldRemoveWallet = readyToSyncDisconnect && user?.walletAddress && !account
    if (!shouldRemoveWallet) return

    const updatedUser = { ...user, walletAddress: undefined }
    setUser(updatedUser)
    Cookies.set("user", JSON.stringify(updatedUser))

    const syncDB = async () => {
      try {
        const res = await fetch('/api/auth/remove-wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email }),
        })

        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Failed to update DB')

        showToast('💡 Wallet disconnected', 'info')
        setDbSyncFailed(false)
      } catch (err) {
        console.error('❌ Error syncing wallet disconnect:', err)
        showToast('❌ Failed to update database on disconnect', 'error')
        setDbSyncFailed(true)
      }
    }

    syncDB()
  }, [readyToSyncDisconnect, account, user])

  const retryRemoveWalletFromDB = async () => {
    if (!user?.email) return

    try {
      const res = await fetch('/api/auth/remove-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Retry failed')

      setDbSyncFailed(false)
      showToast('✅ Wallet sync to DB successful!', 'success')
    } catch (err) {
      console.error('Retry failed:', err)
      setDbSyncFailed(true)
      showToast('❌ Retry failed. Please try again later.', 'error')
    }
  }

  const logout = () => {
    Cookies.remove("token")
    Cookies.remove("user")
    setToken(null)
    setUser(null)
    router.push("/login")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isHydrated,
        logout,
        dbSyncFailed,
        retryRemoveWalletFromDB,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
