'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { ethers } from 'ethers'
import { showToast } from '@/utils/toast'
import NFTMarketplaceContractABI from '@/constants/NftMarketplace.json'
import MusicNFTContractABI from '@/constants/MusicNFT.json'
import { useAuth } from '@/context/AuthContext'

interface MyNFTCardProps {
  tokenId: string
  listingId: string | null
  isListed?: boolean
  price?: string
}

interface NFTMetadata {
  name: string
  artist: string
  description: string
  image: string
  audio: string
  attributes: { trait_type: string; value: string }[]
}

export default function MyNFTCard({ tokenId, listingId, isListed = false, price }: MyNFTCardProps) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [localIsListed, setLocalIsListed] = useState(isListed)
  const [localPrice, setLocalPrice] = useState(price || '0')
  const [loadingState, setLoadingState] = useState({ listing: false, canceling: false })

  const { user } = useAuth()

  const getContracts = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()

    const nftContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_MUSIC_NFT_CONTRACT_ADDRESS!,
      MusicNFTContractABI,
      signer
    )

    const marketplaceContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_NFT_MARKETPLACE_CONTRACT_ADDRESS!,
      NFTMarketplaceContractABI,
      signer
    )

    return { nftContract, marketplaceContract }
  }

  const updateListingStatusInDB = async (updates: Partial<{ price: string; isListed: boolean }>) => {
    try {
      await fetch('/api/nft/update-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId, ...updates }),
      })
    } catch (err) {
      console.error('❌ Failed to update DB:', err)
      showToast('⚠️ DB not synced', 'warning')
    }
  }

  const fetchMetadataFromContract = useCallback(async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MUSIC_NFT_CONTRACT_ADDRESS!,
        MusicNFTContractABI,
        provider
      )

      const uri = await contract.tokenURI(tokenId)
      const res = await fetch(uri)
      const json = await res.json()
      setMetadata(json)
    } catch (err) {
      console.error('❌ Failed to fetch metadata:', err)
      showToast('Failed to load metadata', 'error')
    } finally {
      setLoading(false)
    }
  }, [tokenId])

  useEffect(() => {
    fetchMetadataFromContract()
  }, [fetchMetadataFromContract])

  const handleListNFT = async () => {
    const inputPrice = prompt('Set listing price in ETH:', ethers.formatEther(localPrice || '0') || '0.01')
    if (!inputPrice) return

    try {
      setLoadingState(prev => ({ ...prev, listing: true }))

      const { nftContract, marketplaceContract } = await getContracts()

      const isApproved = await nftContract.isApprovedForAll(
        user?.walletAddress,
        process.env.NEXT_PUBLIC_NFT_MARKETPLACE_CONTRACT_ADDRESS!
      )
      if (!isApproved) {
        const approveTx = await nftContract.approve(
          process.env.NEXT_PUBLIC_NFT_MARKETPLACE_CONTRACT_ADDRESS!,
          tokenId
        )
        await approveTx.wait()
      }

      const tx = await marketplaceContract.createListing(
        process.env.NEXT_PUBLIC_MUSIC_NFT_CONTRACT_ADDRESS,
        tokenId,
        ethers.parseEther(inputPrice)
      )
      await tx.wait(1)

      await updateListingStatusInDB({
        isListed: true,
        price: ethers.parseEther(inputPrice).toString(),
      })

      setLocalIsListed(true)
      setLocalPrice(ethers.parseEther(inputPrice).toString())
      showToast('✅ NFT listed successfully!', 'success')
    } catch (err: any) {
      console.error(err)
      if (err.code === "ACTION_REJECTED") {
        showToast("🚫 Transaction has been cancelled by user.", "error")
      } else {
        showToast("❌ Listing failed. Please try again.", "error")
      }
    } finally {
      setLoadingState(prev => ({ ...prev, listing: false }))
    }
  }

  const handleCancelListing = async () => {
    try {
      setLoadingState(prev => ({ ...prev, canceling: true }))
      const { marketplaceContract } = await getContracts()
      const tx = await marketplaceContract.cancelListing(listingId)
      await tx.wait(1)

      await updateListingStatusInDB({ isListed: false, price: '0' })

      setLocalIsListed(false)
      setLocalPrice('0')
      showToast('✅ Listing canceled', 'info')
    } catch (err: any) {
      console.error(err)
      if (err.code === "ACTION_REJECTED") {
        showToast("🚫 Transaction has been cancelled by user.", "error")
      } else {
        showToast("❌ Cancel listing failed. Please try again.", "error")
      }
    } finally {
      setLoadingState(prev => ({ ...prev, canceling: false }))
    }
  }

  return (
    <>
      {(loading || !metadata) ? (
        <div className="skeleton w-full h-56 rounded-xl" />
      ) : (
        <div className="card bg-base-200 shadow-xl overflow-hidden">
          <figure className="relative w-full h-48">
            <Image
              src={metadata.image}
              alt={metadata.name}
              layout="fill"
              objectFit="cover"
            />
          </figure>
          <div className="card-body">
            <h2 className="card-title text-lg">{metadata.name} - {metadata.artist}</h2>
            <p className="text-sm">{metadata.description}</p>

            {localIsListed && (
              <p className="text-sm text-green-600 font-semibold">
                Listed: {ethers.formatEther(localPrice)} ETH
              </p>
            )}

            <audio controls controlsList="nodownload" src={metadata.audio} className="w-full mt-2" />

            <div className="mt-4 space-y-1 text-xs text-gray-400">
              {metadata.attributes.map(attr => (
                <p key={attr.trait_type}>
                  <strong>{attr.trait_type}:</strong> {attr.value}
                </p>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              {!localIsListed ? (
                <button
                  onClick={handleListNFT}
                  className="btn btn-primary w-full"
                  disabled={loadingState.listing}
                >
                  {loadingState.listing
                    ? <span className="loading loading-spinner loading-sm" />
                    : 'List NFT'}
                </button>
              ) : (
                <button
                  onClick={handleCancelListing}
                  className="btn btn-error w-full"
                  disabled={loadingState.canceling}
                >
                  {loadingState.canceling
                    ? <span className="loading loading-spinner loading-sm" />
                    : 'Cancel Listing'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
