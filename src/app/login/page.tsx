'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { showToast } from '@/utils/toast'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { isAuthenticated, isHydrated } = useAuth()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const result = await res.json()
      setLoading(false)

      if (!res.ok) {
        setError(result.error || 'Login failed')
        showToast(result.error || 'Login failed', 'error')
        return
      }

      Cookies.set('token', result.token)
      Cookies.set('user', JSON.stringify(result.user))

      showToast('✅ Login successful!')
      setTimeout(() => {
        location.href = "/dashboard"
      }, 500)
    } catch (err) {
      setLoading(false)
      showToast('Something went wrong', 'error')
    }
  }

  useEffect(() => {
    if (!isHydrated) return
    if (isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, isHydrated, router])

  if (!isHydrated || isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <form className="card-body" onSubmit={handleLogin}>
          <h2 className="text-center text-2xl font-bold">Login</h2>

          <div className="form-control">
            <label className="label">Email</label>
            <input
              type="email"
              className="input input-bordered"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">Password</label>
            <input
              type="password"
              className="input input-bordered"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-error mt-2">{error}</p>}

          <div className="form-control mt-4">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="loading loading-spinner" /> : "Login"}
            </button>
          </div>

          <p className="text-center text-sm mt-2">
            Don&apos;t have an account? <a href="/register" className="link link-primary">Register</a>
          </p>
        </form>
      </div>
    </div>
  )
}
