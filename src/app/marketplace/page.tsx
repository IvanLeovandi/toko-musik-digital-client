'use client'

import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { useMarketplaceNFTs } from '@/hooks/useMarketplaceNFTs'
import contractABI from '@/constants/NftMarketplace.json'
import { showToast } from '@/utils/toast'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import MarketplaceCard from '@/components/MarketplaceCard'


interface NFTMetadata {
  name: string
  description: string
  image: string
  audio: string
  attributes: { trait_type: string; value: string }[]
}

export default function MarketplacePage() {
  const { nfts, loading } = useMarketplaceNFTs()
  const [metadataMap, setMetadataMap] = useState<Record<string, NFTMetadata>>({})
  const [buyingTokenId, setBuyingTokenId] = useState<string | null>(null)

  const { user } = useAuth();
  const router = useRouter()

  useEffect(() => {
    if (!nfts.length || Object.keys(metadataMap).length > 0) return;
  
    const fetchMetadata = async () => {
      const promises = nfts.map(async (item) => {
        if (!item.uri) return null
        try {
          const res = await fetch(item.uri)
          const metadata = await res.json()
          return { tokenId: item.tokenId.toString(), metadata }
        } catch (err) {
          console.error(`Failed to fetch metadata for tokenId ${item.tokenId}`, err)
          return null
        }
      })
  
      const results = await Promise.all(promises)
      const map: Record<string, NFTMetadata> = {}
      results.forEach((r) => {
        if (r) map[r.tokenId] = r.metadata
      })
      setMetadataMap(map)
    }
  
    fetchMetadata()
  }, [nfts, metadataMap])
  

  const handleBuy = async (tokenId: string, price: string) => {
    if (!user) {
      showToast("🚨 You must be logged in to buy NFT", "error")
      return router.push("/login")
    }
  
    try {
      setBuyingTokenId(tokenId)
  
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
        contractABI,
        signer
      )
  
      const tx = await contract.buyNFT(tokenId, {
        value: price,
      })
  
      await tx.wait(1)
      showToast("✅ NFT purchased successfully!", "success")
      window.location.reload()
    } catch (err) {
      console.error(err)
      showToast("❌ Purchase failed", "error")
    } finally {
      setBuyingTokenId(null)
    }
  }

  return (
    <div className="bg-base-100 min-h-screen px-8 py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">🎵 NFT Marketplace</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton w-full h-64 rounded-xl" />
            ))
          : nfts.map((item) => {
            const meta = metadataMap[item.tokenId.toString()]
            if (!meta) return null

            console.log(meta);
            
          
            const isBuying = buyingTokenId === item.tokenId.toString()
            const isOwner = item.seller.toLowerCase() === user?.walletAddress?.toLowerCase()
          
            return (
              <MarketplaceCard
                key={item.tokenId}
                item={item}
                metadata={meta}
                isOwner={isOwner}
                isBuying={isBuying}
                onBuyClick={() => handleBuy(item.tokenId.toString(), item.price)}
              />
            )
          })}
      </div>
    </div>
  )
}
