'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import { useAuth } from '@/context/AuthContext'
import useWallet from '@/hooks/useWallet'
import { showToast } from '@/utils/toast'
import { useMyNFTsWithListing } from '@/hooks/useMyNFTsWithListing'
import MyNFTCard from '@/components/MyNFTCard'
import contractABI from '@/constants/NftMarketplace.json'

export default function DashboardPage() {
  const { isAuthenticated, isHydrated, user, dbSyncFailed, retryRemoveWalletFromDB } = useAuth()
  const { account, connectWallet } = useWallet()
  const router = useRouter()

  const [pendingProceeds, setPendingProceeds] = useState<string>('0')
  const [withdrawing, setWithdrawing] = useState(false)

  const { nfts, loading } = useMyNFTsWithListing(user?.walletAddress)
  const showConnectWallet = isAuthenticated && !user?.walletAddress

  const fetchProceedsOnChain = useCallback(async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
        contractABI,
        provider
      )
      const pending = await contract.getPendingRoyaltiesForAddress(user!.walletAddress)
      setPendingProceeds(ethers.formatEther(pending))
    } catch (err) {
      console.error('Failed to fetch proceeds:', err)
    }
  }, [user])

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
      fetchProceedsOnChain()
    }
  }, [fetchProceedsOnChain, isAuthenticated, user])


  const handleWithdraw = async () => {
    setWithdrawing(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
        contractABI,
        signer
      )
  
      const tx = await contract.withdrawRoyalties()
      await tx.wait()
  
      const res = await fetch('/api/proceeds/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      })
  
      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error || 'Failed to update DB')
      }
  
      showToast('✅ Withdrawal successful!', 'success')
      setPendingProceeds('0')
    } catch (err) {
      console.error('Withdraw failed:', err)
      showToast('❌ Withdrawal failed', 'error')
    } finally {
      setWithdrawing(false)
    }
  }
  

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
      <p>Welcome, {user?.email}</p>

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
        <div className="border border-base-content/20 rounded-xl w-full px-6 py-4">
          <h3 className="font-bold text-lg text-center">My Proceeds</h3>
          <div className="flex flex-col items-center justify-center py-6">
            <p className="text-2xl font-bold">{pendingProceeds} ETH</p>
            <button
              onClick={handleWithdraw}
              disabled={withdrawing || pendingProceeds === '0'}
              className="btn btn-sm btn-success mt-2"
            >
              {withdrawing ? <span className="loading loading-spinner loading-sm" /> : 'Withdraw'}
            </button>
          </div>
        </div>

        <div className="border border-base-content/20 rounded-xl w-full px-6 py-4">
          <h3 className="font-bold text-lg text-center">My NFTs</h3>
          <div className="flex items-center justify-center py-6">
            {loading ? (
              <div className="skeleton h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold">{nfts?.length}</p>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mt-10 mb-6">My NFT Collections</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton w-full h-56 rounded-xl" />
            ))
          : nfts.map((nft: any) => (
              <MyNFTCard
                key={nft.id}
                metadataUri={nft.uri}
                tokenId={nft.tokenId}
                timestamp={nft.timestamp}
                isListed={nft.isListed}
                price={nft.price}
              />
            ))}
      </div>
    </div>
  )
}
