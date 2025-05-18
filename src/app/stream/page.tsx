"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ethers } from "ethers"
import { showToast } from "@/utils/toast"
import MusicNFTContractABI from "@/constants/MusicNFT.json"
import { useAuth } from "@/context/AuthContext"

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

interface NFTMetadata {
  name: string
  artist: string
  description: string
  image: string
  audio: string
}

export default function MusicStreamPage() {
  const [nfts, setNfts] = useState<NFT[]>([])
  const [metadataMap, setMetadataMap] = useState<Record<number, NFTMetadata>>({})
  const [loading, setLoading] = useState(true)
  const [playedSet, setPlayedSet] = useState<Set<string>>(new Set())

  const { user } = useAuth()

  console.log("NFTs:", nfts);
  

  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        const res = await fetch("/api/nft/list")
        const data: NFT[] = await res.json()
        setNfts(data)

        const provider = new ethers.BrowserProvider(window.ethereum)
        const musicNFTContract = new ethers.Contract(
          process.env.NEXT_PUBLIC_MUSIC_NFT_CONTRACT_ADDRESS!,
          MusicNFTContractABI,
          provider
        )

        const metadataPromises = data.map(async (nft) => {
          try {
            const tokenURI = await musicNFTContract.tokenURI(nft.tokenId)
            const metaRes = await fetch(tokenURI)
            const metadata = await metaRes.json()
            return { id: nft.id, metadata }
          } catch (err) {
            console.error(`Failed to fetch metadata for token ${nft.tokenId}`, err)
            return null
          }
        })

        const results = await Promise.all(metadataPromises)
        const map: Record<number, NFTMetadata> = {}
        results.forEach(item => {
          if (item) map[item.id] = item.metadata
        })
        setMetadataMap(map)
      } catch (err) {
        console.error(err)
        showToast("❌ Failed to load NFTs", "error")
      } finally {
        setLoading(false)
      }
    }

    fetchNFTs()
  }, [])

  const handlePlay = async (nftId: string) => {
    if (playedSet.has(nftId)) return
    try {
      await fetch("/api/nft/increment-play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: nftId })
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

  return (
    <div className="bg-base-100 min-h-screen px-32 py-10">
      <h1 className="text-3xl font-bold text-center mb-8">🎷 Music Stream</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton w-full h-64 rounded-xl" />
          ))
        ) : (
          nfts.map(nft => {
            const metadata = metadataMap[nft.id]
            if (!metadata) return null

            return (
              <div
                key={nft.id}
                className="card bg-base-200 shadow-xl overflow-hidden"
              >
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
                  <p className="text-sm text-gray-600">{metadata.description}</p>
                  <audio
                    controls
                    controlsList="nodownload"
                    onPlay={() => {
                      if (nft.owner.walletAddress !== user?.walletAddress) {
                        handlePlay(nft.tokenId)
                      }
                    }}
                    onEnded={() => {
                      if (nft.owner.walletAddress !== user?.walletAddress) {
                        handleEnded(nft.tokenId)
                      }
                    }}
                    src={metadata.audio}
                    className="w-full mt-2"
                  />
                  <p className="text-xs mt-2 text-gray-500">
                    Play count: {nft.playCount}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
