'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ethers } from 'ethers'

interface NFTMetadata {
  name: string
  description: string
  image: string
  audio: string
  attributes: { trait_type: string; value: string }[]
}

export default function MarketplaceCard({
  item,
  metadata,
  isOwner,
  isBuying,
  onBuyClick,
}: {
  item: any
  metadata: NFTMetadata
  isOwner: boolean
  isBuying: boolean
  onBuyClick: () => void
}) {
  const router = useRouter()

  const handleCardClick = () => {
    sessionStorage.setItem('nft_detail_data', JSON.stringify({ item, metadata }))
    router.push(`/marketplace/${item.tokenId}`)
  }

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onBuyClick()
  }

  return (
    <div
      onClick={handleCardClick}
      className="card bg-base-200 shadow-xl overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-2xl duration-200 cursor-pointer border border-base-300"
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
          <h2 className="card-title">{metadata.name}</h2>
          <span className="font-semibold text-lg text-info">{ethers.formatEther(item.price)} ETH</span>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2">{metadata.description}</p>

        {/* <audio
          controls
          controlsList="nodownload"
          src={metadata.audio}
          className="w-full mt-2"
        /> */}

        <div className="mt-4 space-y-1 text-xs text-gray-200">
          {metadata.attributes.map(attr => (
            <p key={attr.trait_type}>
              <strong>{attr.trait_type}:</strong> {attr.value}
            </p>
          ))}
        </div>

        <button
          onClick={handleBuyClick}
          className="btn btn-primary mt-4 w-full"
          disabled={isBuying || isOwner}
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
