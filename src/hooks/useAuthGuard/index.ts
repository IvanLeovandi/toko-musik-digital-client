import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"

export default function useAuthGuard(redirectTo: string = "/login") {
  const { isAuthenticated, isHydrated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isHydrated) return
    if (!isAuthenticated) {
      router.replace(redirectTo)
    }
  }, [isAuthenticated, isHydrated, redirectTo, router])

  return {
    ready: isHydrated,
    authenticated: isAuthenticated,
  }
}
