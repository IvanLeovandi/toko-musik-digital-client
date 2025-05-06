'use client'

import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import useWallet from '@/hooks/useWallet'
import { showToast } from '@/utils/toast'
import contractABI from '@/constants/NftMarketplace.json'

interface NFTEntry {
  id: number
  tokenId: string
  metadataUrl: string
  playCount: number
  lastRoyaltyPlayCount: number
  owner: {
    email: string
    walletAddress: string | null
  }
}

const ROYALTY_PER_PLAY_ETH = 0.00001
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!

export default function AdminDashboardPage() {
  const { user, isHydrated, isAuthenticated } = useAuth()
    const { account, connectWallet } = useWallet()
  
  const router = useRouter()

  const [nfts, setNFTs] = useState<NFTEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingRoyaltyId, setSendingRoyaltyId] = useState<number | null>(null)
  const [platformFees, setPlatformFees] = useState<string>('0')
  const [withdrawing, setWithdrawing] = useState(false)
  const showConnectWallet = isAuthenticated && !user?.walletAddress


  useEffect(() => {
    if (isHydrated && (!isAuthenticated || user?.role !== 'ADMIN')) {
      showToast('⚠️ You must be an admin to access this page.', 'error')
      router.replace('/')
    }
  }, [isHydrated, isAuthenticated, user, router])

  const fetchNFTs = async () => {
    try {
      const res = await fetch('/api/admin/nfts')
      const data = await res.json()
      setNFTs(data)
    } catch (err) {
      console.error('Failed to load NFTs:', err)
      showToast('❌ Failed to load NFTs', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchPlatformFees = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider)
      const fees = await contract.getAccumulatedPlatformFees()
      setPlatformFees(ethers.formatEther(fees))
    } catch (err) {
      console.error('Failed to fetch platform fees:', err)
      showToast('❌ Failed to load platform fees', 'error')
    }
  }

  const handleSendRoyalty = async (nft: NFTEntry) => {
    const pendingCount = nft.playCount - (nft.lastRoyaltyPlayCount || 0)
    if (pendingCount <= 0) return

    setSendingRoyaltyId(nft.id)

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer)

      const totalEth = (pendingCount * ROYALTY_PER_PLAY_ETH).toFixed(18)

      const tx = await contract.recordListen(nft.tokenId, {
        value: ethers.parseEther(totalEth),
      })
      await tx.wait()

      const res = await fetch('/api/admin/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nftId: nft.id,
          amountEth: totalEth,
          txHash: tx.hash,
        }),
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error || 'Failed to record distribution')
      }

      showToast('✅ Royalty recorded and DB updated', 'success')
      fetchNFTs()
    } catch (err) {
      console.error('Send royalty failed:', err)
      showToast('❌ Failed to send royalty', 'error')
    } finally {
      setSendingRoyaltyId(null)
    }
  }

  const handleWithdrawFees = async () => {
    setWithdrawing(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer)

      const tx = await contract.withdrawFees()
      await tx.wait()

      showToast('✅ Platform fees withdrawn!', 'success')
      fetchPlatformFees()
    } catch (err) {
      console.error('Withdraw failed:', err)
      showToast('❌ Withdraw failed', 'error')
    } finally {
      setWithdrawing(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      fetchNFTs()
      fetchPlatformFees()
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (user?.walletAddress && account) {
      showToast('✅ Wallet connected successfully!', 'success')
    }
  }, [account, user?.walletAddress])

  return (
    <div className="px-8 py-10 bg-base-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Royalty Dashboard</h1>

      {showConnectWallet && (
        <div className="alert alert-warning mb-6">
          <span>🚨 Wallet not connected. Please connect your wallet to access NFT features.</span>
          <button className="btn btn-sm btn-primary ml-auto" onClick={connectWallet}>
            Connect Wallet
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Platform Revenue</h2>
          <p className="text-green-600 text-lg">{platformFees} ETH</p>
        </div>
        <button
          className="btn btn-success"
          onClick={handleWithdrawFees}
          disabled={withdrawing || parseFloat(platformFees) === 0}
        >
          {withdrawing ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            'Withdraw Revenue'
          )}
        </button>
      </div>

      {loading ? (
        <p>Loading NFTs...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Token ID</th>
                <th>Play Count</th>
                <th>Last Royalty Sent</th>
                <th>Pending</th>
                <th>Owner Wallet</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {nfts.map((nft, i) => {
                const pendingCount = nft.playCount - (nft.lastRoyaltyPlayCount || 0)
                const totalAmountEth = (pendingCount * ROYALTY_PER_PLAY_ETH).toFixed(5)

                return (
                  <tr key={nft.id}>
                    <td>{i + 1}</td>
                    <td>{nft.tokenId}</td>
                    <td>{nft.playCount}</td>
                    <td>{nft.lastRoyaltyPlayCount}</td>
                    <td>{pendingCount}</td>
                    <td>{nft.owner.walletAddress || '-'}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={pendingCount <= 0 || sendingRoyaltyId === nft.id}
                        onClick={() => handleSendRoyalty(nft)}
                      >
                        {sendingRoyaltyId === nft.id ? (
                          <span className="loading loading-spinner loading-sm" />
                        ) : (
                          `Send ${totalAmountEth} ETH`
                        )}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
