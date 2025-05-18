'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ethers } from 'ethers'
import { useAuth } from '@/context/AuthContext'
import NFTMarketplaceContractABI from '@/constants/NftMarketplace.json'
import MusicNFTContractABI from '@/constants/MusicNFT.json'
import { showToast } from '@/utils/toast'
import WalletChangeWarning from '@/components/WalletChangeWarning'
import useWallet from '@/hooks/useWallet'
import useNFTListing from '@/hooks/useNFTListing'

interface NFTMetadata {
  name: string
  artist: string
  description: string
  image: string
  audio: string
  attributes: { trait_type: string; value: string }[]
}

export default function NFTDetailPage() {
  const { id: tokenId } = useParams<{ id: string }>()
  const router = useRouter()
  const { isAuthenticated, user, dbSyncFailed, retryRemoveWalletFromDB, walletMismatch } = useAuth()
  const { connectWallet } = useWallet()
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null)
  const [playCount, setPlayCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isBuying, setIsBuying] = useState(false)
  const hasCountedRef = useRef(false)

  const { listingId, seller, price, isListed, loading: listingLoading } = useNFTListing(
    process.env.NEXT_PUBLIC_MUSIC_NFT_CONTRACT_ADDRESS!,
    tokenId
  )

  const showConnectWallet = isAuthenticated && !user?.walletAddress

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setIsLoading(true)
        const provider = new ethers.BrowserProvider(window.ethereum)
        const contract = new ethers.Contract(
          process.env.NEXT_PUBLIC_MUSIC_NFT_CONTRACT_ADDRESS!,
          MusicNFTContractABI,
          provider
        )
        const tokenUri = await contract.tokenURI(tokenId)
        const metaRes = await fetch(tokenUri)
        if (!metaRes.ok) throw new Error('Failed to fetch metadata')
        const meta = await metaRes.json()
        setMetadata(meta)

        const dbRes = await fetch(`/api/nft/${tokenId}`)
        const dbData = await dbRes.json()
        setPlayCount(dbData.playCount || 0)
      } catch (err) {
        showToast('⚠️ Failed to load NFT data', 'error')
        router.replace('/marketplace')
      } finally {
        setIsLoading(false)
      }
    }
    fetchMetadata()
  }, [tokenId, router])

  const handlePlay = async () => {
    if (hasCountedRef.current) return
    hasCountedRef.current = true

    try {
      await fetch('/api/nft/increment-play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tokenId })
      })
      setPlayCount(prev => prev + 1)
    } catch (err) {
      console.error('Play count error:', err)
    }
  }

  const handleBuy = async () => {
    if (!user) return router.push('/login')

    try {
      setIsBuying(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_NFT_MARKETPLACE_CONTRACT_ADDRESS!,
        NFTMarketplaceContractABI,
        signer
      )
      const tx = await contract.buyNFT(listingId, { value: price })
      await tx.wait()
      showToast('✅ Purchase successful', 'success')
      router.push('/my-tokens')
    } catch (err) {
      console.error(err)
      showToast('❌ Purchase failed', 'error')
    } finally {
      setIsBuying(false)
    }
  }

  const isOwner = seller?.toLowerCase() === user?.walletAddress?.toLowerCase()
  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="bg-base-100 min-h-screen px-4 py-10">
      {isLoading || listingLoading || !metadata ? (
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="skeleton h-64 w-full rounded-xl" />
            <div className="space-y-4">
              <div className="skeleton h-6 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-4/5" />
              <div className="skeleton h-10 w-full mt-4" />
            </div>
          </div>
        </div>
      ) : (
        metadata && (
          <div className="max-w-5xl mx-auto card bg-base-200 shadow-xl">
            <WalletChangeWarning
              walletMismatch={walletMismatch}
              dbSyncFailed={dbSyncFailed}
              retryRemoveWalletFromDB={retryRemoveWalletFromDB}
              connectWallet={connectWallet}
              showConnectWallet={showConnectWallet}
              user={user}
            />
            <div className="flex flex-col lg:flex-row gap-8 p-6">
              <div className="w-full lg:w-1/2">
                <Image
                  src={metadata.image}
                  alt={metadata.name}
                  width={600}
                  height={600}
                  className="rounded-xl object-cover"
                />
              </div>
              <div className="w-full lg:w-1/2 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">{metadata.name} - {metadata.artist}</h1>
                    <span className="font-semibold text-lg text-info">
                      {ethers.formatEther(price || '0')} ETH
                    </span>
                  </div>
                  <p className="text-gray-600 mt-2">{metadata.description}</p>
                  <p className='mt-2'><strong>Seller:</strong> {seller}</p>

                  <audio
                    controls
                    controlsList="nodownload"
                    src={metadata.audio}
                    onPlay={handlePlay}
                    className="w-full mt-4"
                  />

                  <div className="mt-6 space-y-2 text-sm">
                    <p className="text-gray-400">Play Count: {playCount}</p>
                    {metadata.attributes.map(attr => (
                      <p key={attr.trait_type}>
                        <strong>{attr.trait_type}:</strong> {attr.value}%
                      </p>
                    ))}
                  </div>
                </div>
                <div className="mt-8">
                  <button
                    onClick={handleBuy}
                    className="btn btn-primary w-full"
                    disabled={isOwner || isAdmin || isBuying || walletMismatch || !isListed}
                  >
                    {isBuying ? <span className="loading loading-spinner loading-sm" /> : isOwner ? 'You Own This' : 'Buy NFT'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}
