"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { showToast } from "@/utils/toast"

interface NFTFromDB {
  id: number
  tokenId: string
  contractAddress: string
  metadataUrl: string
  playCount: number
}

interface NFTMetadata {
  name: string
  description: string
  image: string
  audio: string
}

export default function MusicStreamPage() {
  const [nfts, setNfts] = useState<NFTFromDB[]>([])
  const [metadataMap, setMetadataMap] = useState<Record<number, NFTMetadata>>({})
  const [loading, setLoading] = useState(true)
  const [playedSet, setPlayedSet] = useState<Set<number>>(new Set())

  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        const res = await fetch("/api/nft/list")
        const data = await res.json()
        setNfts(data)

        const metadataPromises = data.map(async (nft: NFTFromDB) => {
          try {
            const metaRes = await fetch(nft.metadataUrl)
            const metadata = await metaRes.json()
            return { id: nft.id, metadata }
          } catch (err) {
            console.error("Failed to fetch metadata for:", nft.metadataUrl)
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
        showToast("❌ Failed to load NFTs", "error")
      } finally {
        setLoading(false)
      }
    }

    fetchNFTs()
  }, [])

  const handlePlay = async (nftId: number) => {
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

  const handleEnded = (nftId: number) => {
    setPlayedSet(prev => {
      const updated = new Set(prev)
      updated.delete(nftId)
      return updated
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8">🎷 Music Stream
      </h1>
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
                  <h2 className="card-title text-lg">{metadata.name}</h2>
                  <p className="text-sm text-gray-600">{metadata.description}</p>
                  <audio
                    controls
                    controlsList="nodownload"
                    onPlay={() => handlePlay(nft.id)}
                    onEnded={() => handleEnded(nft.id)}
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
