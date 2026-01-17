'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import { useAuth } from '@/context/AuthContext'
import useWallet from '@/hooks/useWallet'
import { showToast } from '@/utils/toast'
import { useMyNFTsWithListing } from '@/hooks/useMyNFTsWithListing'
import MyNFTCard from '@/components/MyNFTCard'
import marketplaceABI from '@/constants/NftMarketplace.json'
import streamingABI from '@/constants/NFTStreaming.json'
import MyNFTCreations from '@/components/MyNFTCreations'

const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_NFT_MARKETPLACE_CONTRACT_ADDRESS!
const STREAMING_ADDRESS = process.env.NEXT_PUBLIC_NFT_STREAMING_CONTRACT_ADDRESS!

export default function DashboardPage() {
  const { isAuthenticated, isHydrated, user, dbSyncFailed, retryRemoveWalletFromDB, walletMismatch } = useAuth()
  const { account, connectWallet, isLoading: isUseWalletLoading } = useWallet()
  const router = useRouter()

  const [proceeds, setProceeds] = useState('0.0')
  const [royalties, setRoyalties] = useState('0.0')
  const [isLoading, setIsLoading] = useState(false)
  const [withdrawingProceeds, setWithdrawingProceeds] = useState(false)
  const [withdrawingRoyalties, setWithdrawingRoyalties] = useState(false)

  const { nfts, loading } = useMyNFTsWithListing(user?.walletAddress)
  const showConnectWallet = isAuthenticated && !isUseWalletLoading && !account

  const getDisplayNameFromEmail = useCallback((email?: string): string => {
    const namePart = email?.split('@')[0] || ''
    return namePart
      .split(/[._]/)
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') || 'User'
  }, [])

  const fetchProceedsAndRoyalties = useCallback(async () => {
    if (!user?.walletAddress) return
    try {
      setIsLoading(true)
      // Use public RPC instead of MetaMask for read-only operations
      const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com')
      const marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, marketplaceABI, provider)
      const proceedsWei = await marketplaceContract.getPendingPayment(user.walletAddress)
      setProceeds(ethers.formatEther(proceedsWei))

      const streamingContract = new ethers.Contract(STREAMING_ADDRESS, streamingABI, provider)
      const royaltiesWei = await streamingContract.getPendingPayment(user.walletAddress)
      setRoyalties(ethers.formatEther(royaltiesWei))
      setIsLoading(false)
    } catch (err) {
      console.error('Failed to fetch balances:', err)
      showToast('❌ Failed to fetch on-chain balances', 'error')
    }
  }, [user])

  const handleWithdrawProceeds = async () => {
    setWithdrawingProceeds(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, marketplaceABI, signer)
      const tx = await marketplaceContract.withdrawPayments()
      await tx.wait()

      showToast('✅ Proceeds withdrawn!', 'success')
      setProceeds('0.0')
    } catch (err: any) {
      console.error('Withdraw proceeds failed:', err)
      if (err.code === "ACTION_REJECTED") {
        showToast("🚫 Transaction has been cancelled by user.", "error")
      } else {
        showToast("❌ Withdraw failed. Please try again.", "error")
      }
    } finally {
      setWithdrawingProceeds(false)
    }
  }

  const handleWithdrawRoyalties = async () => {
    setWithdrawingRoyalties(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const streamingContract = new ethers.Contract(STREAMING_ADDRESS, streamingABI, signer)
      const tx = await streamingContract.withdrawPayments()
      await tx.wait()

      showToast('✅ Royalties withdrawn!', 'success')
      setRoyalties('0.0')
    } catch (err: any) {
      console.error('Withdraw royalties failed:', err)
      if (err.code === "ACTION_REJECTED") {
        showToast("🚫 Transaction has been cancelled by user.", "error")
      } else {
        showToast("❌ Withdraw failed. Please try again.", "error")
      }
    } finally {
      setWithdrawingRoyalties(false)
    }
  }

  useEffect(() => {
    if (!isHydrated) return
    if (!isAuthenticated) router.replace('/login')
  }, [isHydrated, isAuthenticated, router])

  useEffect(() => {
    if (user?.walletAddress && account) {
      showToast('✅ Wallet connected successfully!', 'success')
    }
  }, [account, user?.walletAddress])

  useEffect(() => {
    if (isAuthenticated && user?.walletAddress) {
      fetchProceedsAndRoyalties()
    }
  }, [fetchProceedsAndRoyalties, isAuthenticated, user])

  if (!isHydrated) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div className="px-8 pt-3 min-h-screen">
      <h1 className="text-2xl font-bold text-center my-8">Dashboard</h1>
      <p>Welcome, {getDisplayNameFromEmail(user?.email)}</p>

      {walletMismatch && (
        <div className="alert alert-error mb-6">
          <span>⚠️ Wallet mismatch detected. Please connect your registered wallet: <strong>{user?.walletAddress}</strong></span>
        </div>
      )}

      {dbSyncFailed && (
        <div className="alert alert-error mb-6 justify-between items-center">
          <span>⚠️ Failed to sync wallet disconnect to the server.</span>
          <button onClick={retryRemoveWalletFromDB} className="btn btn-sm btn-outline">Retry Sync</button>
        </div>
      )}

      {showConnectWallet && (
        <div className="alert alert-warning mb-6">
          <span>🚨 Wallet not connected. Please connect your wallet to access NFT features.</span>
          <button className="btn btn-sm btn-primary ml-auto" onClick={connectWallet}>
            Connect Wallet
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* My Proceeds */}
        <div className="border border-base-content/20 rounded-xl w-full px-6 py-4">
          <h3 className="font-bold text-lg text-center">My Proceeds</h3>
          <div className="flex flex-col items-center justify-center py-6">
            <p className="text-2xl font-bold">{proceeds} ETH</p>
            <button
              onClick={handleWithdrawProceeds}
              disabled={withdrawingProceeds || proceeds === '0.0' || isLoading}
              className="btn btn-sm btn-success mt-2"
            >
              {withdrawingProceeds ? <span className="loading loading-spinner loading-sm" /> : 'Withdraw'}
            </button>
          </div>
        </div>

        {/* My Royalties */}
        <div className="border border-base-content/20 rounded-xl w-full px-6 py-4">
          <h3 className="font-bold text-lg text-center">My Royalties</h3>
          <div className="flex flex-col items-center justify-center py-6">
            <p className="text-2xl font-bold">{royalties} ETH</p>
            <button
              onClick={handleWithdrawRoyalties}
              disabled={withdrawingRoyalties || royalties === '0.0'}
              className="btn btn-sm btn-success mt-2"
            >
              {withdrawingRoyalties ? <span className="loading loading-spinner loading-sm" /> : 'Withdraw'}
            </button>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mt-10 mb-6">My NFT Collections</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton w-full h-56 rounded-xl" />
        ))}
        {!loading && nfts?.length === 0 && (
          <div className="min-h-[100px]">
            <p className="text-gray-500">No NFTs found in your wallet.</p>
          </div>
        )}
        {!loading && nfts && nfts.map((nft) => (
          <MyNFTCard
            key={nft.id}
            tokenId={nft.tokenId}
            listingId={nft.listingId}
            isListed={nft.isListed}
            price={nft.price}
          />
        ))}
      </div>
      <h2 className="text-2xl font-bold mt-10 mb-6">My NFT Creations</h2>
      <MyNFTCreations />
    </div>
  )
}
