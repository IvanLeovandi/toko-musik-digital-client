'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ethers } from 'ethers'
import { useAuth } from '@/context/AuthContext'
import NFTMarketplaceContractABI from '@/constants/NftMarketplace.json'
import { showToast } from '@/utils/toast'
import WalletChangeWarning from '@/components/WalletChangeWarning'
import useWallet from '@/hooks/useWallet'

interface NFTMetadata {
  name: string
  artist: string
  description: string
  image: string
  audio: string
  attributes: { trait_type: string; value: string }[]
}

interface itemType {
  id: string,
  listingId: string,
  nftContract: string,
  price: string,
  seller: string,
  tokenId: string,
  createdAt: Date
  __typename: string
}

export default function NFTDetailPage() {
  const { id: tokenId } = useParams<{ id: string }>()
  const router = useRouter()
  const { isAuthenticated, user, dbSyncFailed, retryRemoveWalletFromDB, walletMismatch } = useAuth()
  const { connectWallet } = useWallet()
  const [item, setItem] = useState<itemType>()
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null)
  const [isBuying, setIsBuying] = useState(false)
  const [playCount, setPlayCount] = useState<number>(0)
  const hasCountedRef = useRef(false)

  const showConnectWallet = isAuthenticated && !user?.walletAddress
  
  useEffect(() => {
    const loadNFTData = async () => {
      const cached = sessionStorage.getItem('nft_detail_data')
      if (cached) {
        const { item, metadata } = JSON.parse(cached)
        setItem(item)
        setMetadata(metadata)
        setPlayCount(item.playCount || 0)
      } else {
        try {
          const res = await fetch(`/api/nft/${tokenId}`)
          if (!res.ok) throw new Error('Failed to fetch NFT')
          const data = await res.json()
          const metaRes = await fetch(data.metadataUri)
          const meta = await metaRes.json()

          setItem(data)
          setMetadata(meta)
          setPlayCount(data.playCount || 0)
        } catch (err) {
          showToast("⚠️ NFT not found", "error")
          router.replace('/marketplace')
        }
      }
    }

    loadNFTData()
  }, [router, tokenId])

  const handleBuy = async () => {
    if (!user) {
      showToast("🚨 You must be logged in to buy NFT", "error")
      return router.push("/login")
    }

    try {
      setIsBuying(true)

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const marketplaceContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_NFT_MARKETPLACE_CONTRACT_ADDRESS!,
        NFTMarketplaceContractABI,
        signer
      )

      if (!item?.listingId) {
        showToast("❌ Missing listing ID", "error")
        return
      }

      const tx = await marketplaceContract.buyNFT(item.listingId, {
        value: item.price,
      })

      await tx.wait(1)
      showToast("✅ NFT purchased successfully!", "success")
      router.push('/my-tokens')
    } catch (err) {
      console.error(err)
      showToast("❌ Purchase failed", "error")
    } finally {
      setIsBuying(false)
    }
  }

  const handlePlay = async () => {
    if (hasCountedRef.current || !item?.id) return
    hasCountedRef.current = true

    try {
      await fetch('/api/nft/increment-play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id })
      })
      setPlayCount(prev => prev + 1)
    } catch (err) {
      console.error('❌ Failed to record play count:', err)
    }
  }

  const isOwner = item?.seller.toLowerCase() === user?.walletAddress?.toLowerCase()
  const isAdmin = user?.role === 'ADMIN'

  if (!item || !metadata) return null

  return (
    <div className="bg-base-100 min-h-screen px-4 py-10">
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
                  {ethers.formatEther(item.price)} ETH
                </span>
              </div>
              <p className="text-gray-600 mt-2">{metadata.description}</p>
              <p className='mt-2'><strong>Seller:</strong> {item.seller}</p>

              <audio
                controls
                controlsList="nodownload"
                src={metadata.audio}
                onPlay={item.isCrowdFunding && handlePlay}
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
                disabled={isOwner || isBuying || isAdmin || walletMismatch}
              >
                {isBuying ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : isOwner ? 'You Own This' : 'Buy NFT'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
