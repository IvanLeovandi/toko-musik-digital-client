'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ethers } from 'ethers'
import { useAuth } from '@/context/AuthContext'
import NFTMarketplaceContractABI from '@/constants/NftMarketplace.json'
import { showToast } from '@/utils/toast'
import WalletChangeWarning from '@/components/WalletChangeWarning'
import useWallet from '@/hooks/useWallet'
import MusicNFTContractABI from '@/constants/MusicNFT.json'
import useNFTListing from '@/hooks/useNFTListing'

interface NFTMetadata {
  name: string
  artist: string
  description: string
  image: string
  audio: string
  attributes: { trait_type: string; value: string }[]
}

interface NFTOwner {
  email: string;
  walletAddress: string;
}

interface NFT {
  id: number;
  contractAddress: string;
  createdAt: Date;
  updatedAt: Date;
  tokenId: string;
  ownerId: number;
  owner: NFTOwner;
  isListed: boolean;
  isCrowdFunding: boolean;
  price: string;
  playCount: number;
  lastRoyaltyPlayCount: number;
}

export default function NFTDetailPage() {
  const { id: tokenId } = useParams<{ id: string }>()
  const router = useRouter()
  const { isAuthenticated, user, dbSyncFailed, retryRemoveWalletFromDB, walletMismatch } = useAuth()
  const { account, connectWallet, isLoading: isUseWalletLoading } = useWallet()
  const [item, setItem] = useState<NFT>()
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null)
  const [isBuying, setIsBuying] = useState(false)
  const [playCount, setPlayCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [playedSet, setPlayedSet] = useState<Set<string>>(new Set())

  const { listingId, seller, price, loading: listingLoading } = useNFTListing(
    process.env.NEXT_PUBLIC_MUSIC_NFT_CONTRACT_ADDRESS!,
    tokenId
  )

  const showConnectWallet = isAuthenticated && !isUseWalletLoading && !account
  
  useEffect(() => {
    const loadNFTData = async () => {
      try {
        setIsLoading(true)
  
        const res = await fetch(`/api/nft/${tokenId}`)
        if (!res.ok) throw new Error('Failed to fetch NFT')
        const data = await res.json()
        setItem(data)
        setPlayCount(data.playCount || 0)

        // Use public RPC instead of MetaMask for read-only operations
        const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com')
        const contract = new ethers.Contract(
          process.env.NEXT_PUBLIC_MUSIC_NFT_CONTRACT_ADDRESS!,
          MusicNFTContractABI,
          provider
        )
        const tokenUri = await contract.tokenURI(tokenId)
        const metaRes = await fetch(tokenUri)
        if (!metaRes.ok) throw new Error("Failed to fetch metadata from IPFS")
        const meta = await metaRes.json()
        setMetadata(meta)
      } catch (err) {
        console.error("❌ Error loading NFT detail:", err)
        showToast("⚠️ NFT not found or corrupted", "error")
        router.replace('/marketplace')
      } finally {
        setIsLoading(false)
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

      if (listingId) {
        showToast("❌ Missing listing ID", "error")
        return
      }

      const tx = await marketplaceContract.buyNFT(listingId, {
        value: price,
      })

      await tx.wait(1)
      showToast("✅ NFT purchased successfully!", "success")
      router.push('/my-tokens')
    } catch (err: any) {
      console.error(err)
      if (err.code === "ACTION_REJECTED") {
        showToast("🚫 Transaction has been cancelled by user.", "error")
      } else if (err.code === "INSUFFICIENT_FUNDS") {
        showToast("❌ Insufficient balance.", "error")
      } else {
        showToast("❌ Purchase failed. Please try again.", "error")
      }
    } finally {
      setIsBuying(false)
    }
  }

  const handlePlay = async (nftId: string) => {
    if (playedSet.has(nftId)) return
    try {
      await fetch("/api/nft/increment-play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: nftId })
      })
      setPlayedSet(prev => new Set(prev).add(nftId))
    } catch (err) {
      console.error("Play count update failed", err)
    }
  }

  const handleEnded = (nftId: string) => {
    setPlayedSet(prev => {
      const updated = new Set(prev)
      updated.delete(nftId)
      return updated
    })
  }

  const isOwner = item?.owner.walletAddress.toLowerCase() === user?.walletAddress?.toLowerCase()
  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="bg-base-100 min-h-screen px-4 py-10">
      {(isLoading || listingLoading || !item || !metadata) &&  (
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="skeleton h-64 w-full rounded-xl" />
            <div className="space-y-4">
              <div className="skeleton h-6 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-10 w-full mt-4" />
              <div className="skeleton h-4 w-4/5" />
              <div className="skeleton h-4 w-4/5" />
              <div className="skeleton h-4 w-4/5" />
            </div>
          </div>
        </div>
      )}
      {!isLoading && item && metadata && (
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
                <p className='mt-2'><strong>Seller:</strong> {seller}</p>

                <audio
                  controls
                  controlsList="nodownload"
                  src={metadata.audio}
                  onPlay={() => {
                    if (!item.isCrowdFunding && !isOwner) {
                      handlePlay(item.tokenId)
                    }
                  }}
                  onEnded={() => {
                    if (!item.isCrowdFunding && !isOwner) {
                      handleEnded(item.tokenId)
                    }
                  }}
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
      )}
    </div>
  )
}
