'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { showToast } from '@/utils/toast'
import { useAuth } from '@/context/AuthContext'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { isAuthenticated, isHydrated } = useAuth()
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const result = await res.json()
      setLoading(false)

      if (!res.ok) {
        setError(result.error || 'Register failed')
        showToast(result.error || 'Register failed', 'error')
        return
      }

      showToast('🎉 Register successful! Please login.')
      router.push('/login')
    } catch {
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
        <form className="card-body" onSubmit={handleRegister}>
          <h2 className="text-center text-2xl font-bold">Register</h2>

          <div className="form-control flex justify-between">
            <label className="label">Email</label>
            <input
              type="email"
              className="input input-bordered"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-control flex justify-between">
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
              {loading ? <span className="loading loading-spinner" /> : "Register"}
            </button>
          </div>

          <p className="text-center text-sm mt-2">
            Already have an account? <a href="/login" className="link link-primary">Login</a>
          </p>
        </form>
      </div>
    </div>
  )
}
