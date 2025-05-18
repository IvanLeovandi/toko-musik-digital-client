"use client"

import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import useWallet from '@/hooks/useWallet'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { account, connectWallet } = useWallet()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/')
  }  

  return (
    <div className="navbar bg-base-100 shadow-sm text-2xl">
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> 
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" /> 
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
            <li><Link href="/stream">Stream</Link></li>
            <li><Link href="/marketplace">NFT Marketplace</Link></li>
            {isAuthenticated && user?.role && (
              <li><Link href={`/${user.role === 'USER' ? 'dashboard' : 'admin'}`}>Dashboard</Link></li>
             )}
          </ul>
        </div>
        <Link href="/" className="btn btn-ghost text-xl">Toko Musik Digital</Link>
      </div>

      <div className="navbar-center hidden lg:flex">
        <ul className="menu text-lg menu-horizontal flex gap-2">
          <li><Link href="/stream">Stream</Link></li>
          <li><Link href="/marketplace">NFT Marketplace</Link></li>
          {isAuthenticated && user?.role && (
            <li><Link href={`/${user.role === 'USER' ? 'dashboard' : 'admin'}`}>Dashboard</Link></li>
          )}
        </ul>
      </div>

      <div className="navbar-end flex items-center gap-3">
        {isAuthenticated && user && user.role !== "ADMIN" && (
          <Link href="/mint" className="btn btn-secondary">Create NFT</Link>
        )}

        {!isAuthenticated ? (
          <button
            onClick={() => router.push("/login")}
            className="btn bg-white text-black border-[#e5e5e5]"
          >
            Login
          </button>
        ) : (
          <>
            {!user?.walletAddress ? (
              <button
                onClick={connectWallet}
                className="btn bg-white text-black border-[#e5e5e5]"
              >
                {account ? (
                  `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`
                ) : (
                  'Connect Wallet'
                )}
              </button>
            ) : (
              <span className="text-sm text-gray-500 hidden md:inline">
                Wallet: {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="btn btn-error text-white"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  )
}
