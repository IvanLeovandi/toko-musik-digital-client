'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ethers } from 'ethers'
import { useAuth } from '@/context/AuthContext'
import contractABI from '@/constants/NftMarketplace.json'
import { showToast } from '@/utils/toast'

interface NFTMetadata {
  name: string
  description: string
  image: string
  audio: string
  attributes: { trait_type: string; value: string }[]
}

export default function NFTDetailPage() {
  const { id: tokenId } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [item, setItem] = useState<any>(null)
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null)
  const [isBuying, setIsBuying] = useState(false)
  const [playCount, setPlayCount] = useState<number>(0)
  const hasCountedRef = useRef(false)

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
          const metaRes = await fetch(data.metadataUrl)
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
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
        contractABI,
        signer
      )

      const tx = await contract.buyNFT(tokenId, {
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

  const isOwner = item?.seller?.toLowerCase() === user?.walletAddress?.toLowerCase()

  if (!item || !metadata) return null

  return (
    <div className="bg-base-100 min-h-screen px-4 py-10">
      <div className="max-w-5xl mx-auto card bg-base-200 shadow-xl">
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
                <h1 className="text-3xl font-bold">{metadata.name}</h1>
                <span className="font-semibold text-lg text-info">{ethers.formatEther(item.price)} ETH</span>
              </div>
              <p className="text-gray-600 mt-2">{metadata.description}</p>
              <p><strong>Seller:</strong> {item.seller}</p>

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
                disabled={isOwner || isBuying}
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
