'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ethers } from 'ethers'
import { showToast } from '@/utils/toast'
import contractABI from '@/constants/NftMarketplace.json'

interface MyNFTCardProps {
  metadataUri: string
  tokenId: string
  timestamp?: string
  isListed?: boolean
  price?: string
}

interface NFTMetadata {
  name: string
  description: string
  image: string
  audio: string
  attributes: { trait_type: string; value: string }[]
}

export default function MyNFTCard({ metadataUri, tokenId, timestamp, isListed = false, price }: MyNFTCardProps) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [localIsListed, setLocalIsListed] = useState(isListed)
  const [localPrice, setLocalPrice] = useState(price || '0')
  const [loadingState, setLoadingState] = useState({
    listing: false,
    updating: false,
    canceling: false,
  })

  const updateListingStatusInDB = async (updates: Partial<{ price: string, isListed: boolean }>) => {
    try {
      await fetch('/api/nft/update-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId, ...updates }),
      })
    } catch (err) {
      console.error("❌ Failed to update Supabase:", err)
      showToast("⚠️ Warning: Changes not synced with database", "warning")
    }
  }

  const getContract = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    return new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
      contractABI,
      signer
    )
  }

  const handleListNFT = async () => {
    const inputPrice = prompt("Set listing price in ETH:", localPrice || "0.01")
    if (!inputPrice) return

    try {
      setLoadingState(prev => ({ ...prev, listing: true }))
      const contract = await getContract()
      const tx = await contract.listNFT(tokenId, ethers.parseEther(inputPrice))
      await tx.wait(1)
      await updateListingStatusInDB({ isListed: true, price: ethers.parseEther(inputPrice).toString() })
      setLocalIsListed(true)
      setLocalPrice(ethers.parseEther(inputPrice).toString())
      showToast("✅ NFT listed successfully!", "success")
    } catch (err) {
      console.error(err)
      showToast("❌ Failed to list NFT", "error")
    } finally {
      setLoadingState(prev => ({ ...prev, listing: false }))
    }
  }

  const handleCancelListing = async () => {
    try {
      setLoadingState(prev => ({ ...prev, canceling: true }))
      const contract = await getContract()
      const tx = await contract.cancelListing(tokenId)
      await tx.wait(1)
      await updateListingStatusInDB({ isListed: false, price: "0" })
      setLocalIsListed(false)
      setLocalPrice("0")
      showToast("✅ Listing canceled", "info")
    } catch (err) {
      console.error(err)
      showToast("❌ Failed to cancel listing", "error")
    } finally {
      setLoadingState(prev => ({ ...prev, canceling: false }))
    }
  }

  const handleUpdateListing = async () => {
    const newPrice = prompt("Enter new listing price in ETH:", ethers.formatEther(localPrice || '0') || "0.01")
    if (!newPrice) return

    try {
      setLoadingState(prev => ({ ...prev, updating: true }))
      const contract = await getContract()
      const tx = await contract.updateListingPrice(tokenId, ethers.parseEther(newPrice))
      await tx.wait(1)
      await updateListingStatusInDB({ price: ethers.parseEther(newPrice).toString() })
      setLocalPrice(ethers.parseEther(newPrice).toString())
      showToast("✅ Price updated!", "success")
    } catch (err) {
      console.error(err)
      showToast("❌ Failed to update price", "error")
    } finally {
      setLoadingState(prev => ({ ...prev, updating: false }))
    }
  }

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const res = await fetch(metadataUri)
        const json = await res.json()
        setMetadata(json)
      } catch (err) {
        console.error(`Failed to load metadata for token ${tokenId}`, err)
      } finally {
        setLoading(false)
      }
    }

    if (metadataUri) loadMetadata()
  }, [metadataUri, tokenId])

  if (loading || !metadata) {
    return <div className="skeleton w-full h-64 rounded-xl" />
  }

  return (
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
        <h2 className="card-title text-lg">{metadata.name}</h2>
        <p className="text-sm">{metadata.description}</p>
        {localIsListed && (
          <p className="text-sm text-green-600 font-semibold">
            Listed: {ethers.formatEther(localPrice)} ETH
          </p>
        )}
        <audio controls controlsList='nodownload' src={metadata.audio} className="w-full mt-2" />

        <div className="mt-4 space-y-1 text-xs">
          {metadata.attributes.map(attr => (
            <p key={attr.trait_type}>
              <strong>{attr.trait_type}:</strong> {attr.value}
            </p>
          ))}
          {timestamp && (
            <p className="text-gray-500">Minted at: {new Date(Number(timestamp) * 1000).toLocaleString()}</p>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {!localIsListed ? (
            <button
              onClick={handleListNFT}
              className="btn btn-primary w-full"
              disabled={loadingState.listing}
            >
              {loadingState.listing
                ? <span className="loading loading-spinner loading-sm"></span>
                : 'List NFT'}
            </button>
          ) : (
            <>
              <button
                onClick={handleUpdateListing}
                className="btn btn-outline w-1/2"
                disabled={loadingState.updating || loadingState.canceling}
              >
                {loadingState.updating
                  ? <span className="loading loading-spinner loading-sm"></span>
                  : 'Update Price'}
              </button>
              <button
                onClick={handleCancelListing}
                className="btn btn-error w-1/2"
                disabled={loadingState.canceling || loadingState.updating}
              >
                {loadingState.canceling
                  ? <span className="loading loading-spinner loading-sm"></span>
                  : 'Cancel Listing'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
