'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import MusicNFTAbi from '@/constants/MusicNFT.json'
import Link from 'next/link'

interface NFTMetadata {
  name: string
  artist: string
  description: string
  image: string
  audio: string
  attributes: { trait_type: string; value: string }[]
}

interface itemType {
  id: string
  price: string
  seller: string
  tokenId: string
}

export default function MarketplaceCard({
  item,
  isOwner,
  isAdmin,
  isBuying,
  isWalletMismatch,
  onBuyClick,
}: {
  item: itemType
  isOwner: boolean
  isAdmin: boolean
  isBuying: boolean
  isWalletMismatch: boolean
  onBuyClick: () => void
}) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(true)

  const musicNFTAddress = process.env.NEXT_PUBLIC_MUSIC_NFT_CONTRACT_ADDRESS!

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const musicNFT = new ethers.Contract(musicNFTAddress, MusicNFTAbi, provider)
        const tokenUri = await musicNFT.tokenURI(item.tokenId)
        const res = await fetch(tokenUri)
        const data = await res.json()
        setMetadata(data)
      } catch (err) {
        console.error(`Error fetching metadata for tokenId ${item.tokenId}`, err)
      } finally {
        setLoadingMeta(false)
      }
    }

    fetchMetadata()
  }, [item.tokenId, musicNFTAddress])

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onBuyClick()
  }

  if (loadingMeta || !metadata) {
    return (
      <div className="skeleton w-full h-64 rounded-xl" />
    )
  }
  
  return (
    <div className="card min-w-[400px] bg-base-200 shadow-xl overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-2xl duration-200 cursor-pointer border border-base-300">
      <Link
        href={`/marketplace/${item.tokenId}`}
      >
        <figure className="relative w-full h-48">
          <Image
            src={metadata.image}
            alt={metadata.name}
            layout="fill"
            objectFit="cover"
            className="transition-opacity duration-200 hover:opacity-90"
          />
        </figure>

        <div className="card-body">
          <div className="flex justify-between items-center">
            <h2 className="card-title">{metadata.name} - {metadata.artist}</h2>
            <span className="font-semibold text-lg text-info">{ethers.formatEther(item.price)} ETH</span>
          </div>
          <p className="text-sm text-gray-500 line-clamp-2">{metadata.description}</p>

          <div className="mt-4 space-y-1 text-xs text-gray-200">
            {metadata.attributes.map(attr => (
              <p key={attr.trait_type}>
                <strong>{attr.trait_type}:</strong> {attr.value}
              </p>
            ))}
          </div>
        </div>
      </Link>
      <div className="py-4 px-6">
        <button
            onClick={handleBuyClick}
            className="btn btn-primary w-full"
            disabled={isBuying || isOwner || isAdmin || isWalletMismatch}
          >
            {isBuying
              ? <span className="loading loading-spinner loading-sm" />
              : isOwner
                ? 'You Own This'
                : 'Buy NFT'}
          </button>
      </div>
    </div>
  )
}
