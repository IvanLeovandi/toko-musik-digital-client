'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import MusicNFTContractABI from '@/constants/MusicNFT.json'
import { pinata } from '@/utils/config'
import { showToast } from '@/utils/toast'
import { useAuth } from '@/context/AuthContext'
import Image from 'next/image'

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
  attributes: { trait_type: string; value: string }[]
}

interface NFTDetails extends NFT {
  tokenURI: string
  metadata: NFTMetadata
}

export default function MyNFTCreations() {
  const { user } = useAuth()
  const [createdTokenIds, setCreatedTokenIds] = useState<string[]>([])
  const [nftDetails, setNftDetails] = useState<NFTDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [newMetadata, setNewMetadata] = useState<{ [key: string]: any }>({})
  const [coverPreview, setCoverPreview] = useState<{ [key: string]: string }>({})
  const [audioPreview, setAudioPreview] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (!user?.walletAddress) return

    async function fetchCreatedTokens() {
      setLoading(true)
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const musicNFTContract = new ethers.Contract(
          process.env.NEXT_PUBLIC_MUSIC_NFT_CONTRACT_ADDRESS!,
          MusicNFTContractABI,
          provider
        )
        const tokens: bigint[] = await musicNFTContract.getTokensCreatedBy(user?.walletAddress)
        const tokenIds = tokens.map(t => t.toString())
        setCreatedTokenIds(tokenIds)        

        const res = await fetch('/api/nft/artist-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenIds }),
        })
        const dbData = await res.json()

        const updatedData = await Promise.all(
          dbData.nfts.map(async (nft: NFT) => {
            const tokenURI = await musicNFTContract.tokenURI(nft.tokenId)
            const metadata = await fetchMetadata(tokenURI)
            return { ...nft, tokenURI, metadata }
          })
        )

        setNftDetails(updatedData)
      } catch (err) {
        console.error(err)
        showToast('Failed to load created NFTs', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchCreatedTokens()
  }, [user])

  async function fetchMetadata(metadataUri: string) {
    try {
      const res = await fetch(metadataUri)
      if (!res.ok) throw new Error('Failed to fetch metadata')
      return res.json()
    } catch (err) {
      console.error('Error fetching metadata:', err)
      return null
    }
  }

  async function uploadFileToIPFS(file: File): Promise<string> {
    try {
      const urlRes = await fetch('/api/url')
      const { url } = await urlRes.json()
      const upload = await pinata.upload.public.file(file).url(url)
      return `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${upload.cid}`
    } catch (err) {
      console.error('IPFS Upload failed:', err)
      showToast('Failed to upload file to IPFS', 'error')
      throw err
    }
  }

  async function uploadMetadata(tokenId: string) {
    if (!newMetadata[tokenId]) return showToast('Please fill metadata fields', 'error')
    setUpdatingId(tokenId)
    try {
      const originalNFT = nftDetails.find(n => n.tokenId === tokenId)
      if (!originalNFT) throw new Error('Original NFT data not found')

      const attributes = originalNFT.metadata?.attributes || []

      const metadata = {
        ...newMetadata[tokenId],
        attributes
      }

      const metadataFile = new File([JSON.stringify(metadata)], 'metadata.json', { type: 'application/json' })

      const urlRes = await fetch('/api/url')
      const { url } = await urlRes.json()
      const upload = await pinata.upload.public.file(metadataFile).url(url)
      const metadataUri = `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${upload.cid}`

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const musicNFTContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MUSIC_NFT_CONTRACT_ADDRESS!,
        MusicNFTContractABI,
        signer
      )

      const tx = await musicNFTContract.updateTokenURI(tokenId, metadataUri)
      await tx.wait(1)

      const res = await fetch('/api/nft/update-crowdfunding-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId, isCrowdFunding: false }),
      })
      if (!res.ok) throw new Error('Failed to update DB crowdfunding status')

      showToast('✅ Metadata updated successfully!', 'success')

      setNftDetails(old =>
        old.map(nft =>
          nft.tokenId === tokenId ? { ...nft, isCrowdFunding: false, metadataUri: metadataUri } : nft
        )
      )
    } catch (err: any) {
      console.error(err)
      if (err.code === "ACTION_REJECTED") {
        showToast("🚫 Transaction has been cancelled by user.", "error")
      } else {
        showToast("❌ Update metadata failed. Please try again.", "error")
      }
    } finally {
      setUpdatingId(null)
    }
  }  

  if (loading) return <div className='pb-8'>Loading created NFTs...</div>

  return (
    <div className='pb-8'>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {createdTokenIds.length === 0 && (
          <div className='min-h-[300px]'>
            <p className="text-gray-500">No NFTs created yet!</p>
          </div>
        )}
        {nftDetails.map(nft => (
          <div key={nft.tokenId} className="card bg-base-100 shadow-xl p-4">
            <Image
              src={nft.metadata.image}
              alt="NFT cover"
              className="w-full h-48 object-cover rounded-md mb-2"
              width={400}
              height={400}
            />
            <p className="mb-2 font-bold">{nft.metadata.name}</p>
            <p className="mb-2">Artist: {nft.metadata.artist}</p>
            <audio controls className="w-full mb-2">
              <source src={nft.metadata.audio} />
            </audio>
            <p className="mb-2">{nft.metadata.description || 'No description'}</p>
            <p className="mb-2"><strong>Is Crowdfunding:</strong> {nft.isCrowdFunding ? 'Yes' : 'No'}</p>

            {nft.isCrowdFunding && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="New Title"
                  className="input input-bordered w-full"
                  onChange={e => setNewMetadata(prev => ({ ...prev, [nft.tokenId]: { ...prev[nft.tokenId], name: e.target.value } }))}
                />
                <input
                  type="text"
                  placeholder="New Artist Name"
                  className="input input-bordered w-full"
                  onChange={e => setNewMetadata(prev => ({ ...prev, [nft.tokenId]: { ...prev[nft.tokenId], artist: e.target.value } }))}
                />
                <textarea
                  placeholder="New Description"
                  className="textarea textarea-bordered w-full"
                  onChange={e => setNewMetadata(prev => ({ ...prev, [nft.tokenId]: { ...prev[nft.tokenId], description: e.target.value } }))}
                />
                <p>Music Cover Image</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const ipfsUrl = await uploadFileToIPFS(file)
                      setNewMetadata(prev => ({ ...prev, [nft.tokenId]: { ...prev[nft.tokenId], image: ipfsUrl } }))
                      setCoverPreview(prev => ({ ...prev, [nft.tokenId]: ipfsUrl }))
                    }
                  }}
                  className="file-input w-full"
                />
                {coverPreview[nft.tokenId] && <Image src={coverPreview[nft.tokenId]} alt="cover" width={400} height={400} className="rounded-xl" />}

                <p>Music Audio File</p>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const ipfsUrl = await uploadFileToIPFS(file)
                      setNewMetadata(prev => ({ ...prev, [nft.tokenId]: { ...prev[nft.tokenId], audio: ipfsUrl } }))
                      setAudioPreview(prev => ({ ...prev, [nft.tokenId]: ipfsUrl }))
                    }
                  }}
                  className="file-input w-full"
                />
                {audioPreview[nft.tokenId] && <audio controls src={audioPreview[nft.tokenId]} className="w-full" />}

                <button
                  disabled={updatingId === nft.tokenId}
                  className="btn btn-primary w-full"
                  onClick={() => uploadMetadata(nft.tokenId)}
                >
                  {updatingId === nft.tokenId ? 'Updating...' : 'Update Metadata'}
                </button>
              </div>
            )}

            {!nft.isCrowdFunding && (
              <p className="text-green-600 font-semibold mt-2">Metadata up to date ✔️</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
