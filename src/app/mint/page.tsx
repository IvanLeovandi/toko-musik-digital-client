'use client'

import { useState, useRef, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ethers } from 'ethers'

import { useAuth } from '@/context/AuthContext'

import { pinata } from "@/utils/config"
import { showToast } from '@/utils/toast'

import MusicNFTContractABI from '@/constants/MusicNFT.json'
import NFTMarketplaceContractABI from '@/constants/NftMarketplace.json'
import useWallet from '@/hooks/useWallet'
import WalletChangeWarning from '@/components/WalletChangeWarning'

interface NFTData {
  title: string
  artistName: string
  description: string
  price: string
  salesRoyaltyPercentage: string
  ownerListenPercentage: string
  coverImage?: File
  audioFile?: File
  isCrowdFunding: boolean
}

interface NFTMetadata {
  name: string;
  artist: string;
  description: string;
  image: string;
  audio: string;
  attributes: {
      trait_type: string;
      value: string;
  }[];
}

interface MintedToken extends NFTMetadata {
  tokenId: string;
}

export default function MintPage() {
  const [coverPreview, setCoverPreview] = useState<string>('')
  const [audioPreview, setAudioPreview] = useState<string>('')
  const [isMinting, setIsMinting] = useState(false)
  const [mintedToken, setMintedToken] = useState<MintedToken|null>(null)
  const coverRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState<NFTData>({
    title: '',
    artistName: '',
    description: '',
    price: '',
    salesRoyaltyPercentage: '',
    ownerListenPercentage: '',
    isCrowdFunding: false,
  })
  const { isAuthenticated, isHydrated, user, dbSyncFailed, retryRemoveWalletFromDB, walletMismatch } = useAuth()
  const { connectWallet } = useWallet()
  const showConnectWallet = isAuthenticated && !user?.walletAddress

  const router = useRouter()

  useEffect(() => {
      if (isHydrated && (!isAuthenticated || user?.role === 'ADMIN')) {
        router.replace('/')
      }
    }, [isHydrated, isAuthenticated, user, router])

  const handleFileChange = (type: 'cover' | 'audio') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (type === 'cover') {
      setFormData(prev => ({ ...prev, coverImage: file }))
      setCoverPreview(URL.createObjectURL(file))
    } else {
      setFormData(prev => ({ ...prev, audioFile: file }))
      setAudioPreview(URL.createObjectURL(file))
    }
  }

  const uploadToIPFS = async (file: File) => {
    const urlRes = await fetch('/api/url')
    const { url } = await urlRes.json()
    const upload = await pinata.upload.public.file(file).url(url)
    return {
      cid: upload.cid,
      gatewayURL: pinata.gateways.public.convert(upload.cid)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return alert("You must be logged in")

    const salesRoyalty = parseFloat(formData.salesRoyaltyPercentage)
    const listenRoyalty = parseFloat(formData.ownerListenPercentage)
  
    if (salesRoyalty > 50 || listenRoyalty > 50) {
      showToast("❌ Royalty percentage cannot exceed 50%", "error")
      return
    }

    setIsMinting(true)
    try {
      const [coverUpload, audioUpload] = await Promise.all([
        uploadToIPFS(formData.coverImage!),
        uploadToIPFS(formData.audioFile!)
      ])

      const imageCID = coverUpload.cid
      const audioCID = audioUpload.cid

      const metadata = {
        name: formData.title,
        artist: formData.artistName,
        description: formData.description,
        image: `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${imageCID}`,
        audio: `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${audioCID}`,
        attributes: [
          { trait_type: "Sales Royalty", value: formData.salesRoyaltyPercentage },
          { trait_type: "Listen Royalty", value: formData.ownerListenPercentage },
        ]
      }

      const metadataFile = new File(
        [JSON.stringify(metadata)],
        "metadata.json",
        { type: "application/json" }
      )

      const metadataUpload = await uploadToIPFS(metadataFile)

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const musicNFTContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MUSIC_NFT_CONTRACT_ADDRESS!,
        MusicNFTContractABI,
        signer
      )

      const tx = await musicNFTContract.mintNFT(
        `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${metadataUpload.cid}`,
        parseInt(formData.salesRoyaltyPercentage) * 100,
        parseInt(formData.ownerListenPercentage) * 100,
      )

      const mintTxReceipt = await tx.wait(1)
      if (!mintTxReceipt) throw new Error("Transaction receipt is null")

      let tokenId
      for (const log of mintTxReceipt.logs) {
        try {
          const parsedLog = musicNFTContract.interface.parseLog(log)
          if (parsedLog && parsedLog.name === "Transfer") {
            tokenId = parsedLog.args.tokenId.toString();
            break
          }
        } catch {}
      }

      if (!tokenId) throw new Error("Token ID not found")


      const isApprovedForMarketplace = await musicNFTContract.isApprovedForAll(user.walletAddress, process.env.NEXT_PUBLIC_NFT_MARKETPLACE_CONTRACT_ADDRESS!)
      if (!isApprovedForMarketplace) {
        const approveTx = await musicNFTContract.approve(process.env.NEXT_PUBLIC_NFT_MARKETPLACE_CONTRACT_ADDRESS!, tokenId)
        await approveTx.wait()
      }

      const marketplaceContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_NFT_MARKETPLACE_CONTRACT_ADDRESS!,
        NFTMarketplaceContractABI,
        signer
      )
      const listingTx = await marketplaceContract.createListing(process.env.NEXT_PUBLIC_MUSIC_NFT_CONTRACT_ADDRESS, tokenId, ethers.parseEther(formData.price))
      await listingTx.wait(1)

      await fetch("/api/nft/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: tokenId.toString(),
          contractAddress: process.env.NEXT_PUBLIC_MUSIC_NFT_CONTRACT_ADDRESS,
          ownerId: user.id,
          price: ethers.parseEther(formData.price).toString,
          isListed: true,
          isCrowdFunding: formData.isCrowdFunding,
        })
      })

      setMintedToken({ ...metadata, tokenId })
      showToast("✅ NFT successfully minted!", "success")

      setTimeout(() => {
        router.push('/marketplace')
      }, 3000)

    } catch (err: any) {
      console.error(err)

      if (err.code === "ACTION_REJECTED") {
        showToast("🚫 Transaction has been cancelled by user.", "error")
      } else if (err.code === "INSUFFICIENT_FUNDS") {
        showToast("❌ Insufficient balance.", "error")
      } else {
        showToast("❌ Minting failed. Please try again.", "error")
      }
    } finally {
      setIsMinting(false)
    }
  }

  return (
    <div className="container min-h-screen mt-12 mx-auto p-4 max-w-2xl">
      {!mintedToken ? (
        <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl p-6 space-y-4">
          <h1 className="text-2xl font-bold">Mint Music NFT</h1>

          <p>Music Cover Image</p>
          <WalletChangeWarning
            walletMismatch={walletMismatch}
            dbSyncFailed={dbSyncFailed}
            retryRemoveWalletFromDB={retryRemoveWalletFromDB}
            connectWallet={connectWallet}
            showConnectWallet={showConnectWallet}
            user={user}
          />
          <input type="file" accept="image/*" onChange={handleFileChange('cover')} ref={coverRef} className="file-input w-full" required />
          {coverPreview && <Image src={coverPreview} alt="cover" width={400} height={400} className="rounded-xl" />}

          <p>Music Audio File</p>
          <input type="file" accept="audio/*" onChange={handleFileChange('audio')} ref={audioRef} className="file-input w-full" required />
          {audioPreview && <audio controls src={audioPreview} className="w-full" />}

          <input type="text" className="input input-bordered w-full" placeholder="Song Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />

          <input type="text" className="input input-bordered w-full" placeholder="Artist Name" value={formData.artistName} onChange={(e) => setFormData({ ...formData, artistName: e.target.value })} required />

          <textarea className="textarea textarea-bordered w-full" placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />

          <input type="number" className="input input-bordered w-full" placeholder="Price (ETH)" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />

          <input type="number" className="input input-bordered w-full" placeholder="Sales Royalty (%)" value={formData.salesRoyaltyPercentage} onChange={(e) => setFormData({ ...formData, salesRoyaltyPercentage: e.target.value })} max={50} required />

          <input type="number" className="input input-bordered w-full" placeholder="Owner Listen Royalty (%)" value={formData.ownerListenPercentage} onChange={(e) => setFormData({ ...formData, ownerListenPercentage: e.target.value })} max={50} required />

          <div className="form-control">
            <label className="label cursor-pointer flex justify-between">
              <span className="label-text">Is this NFT for Crowd Funding?</span>
              <input
                type="checkbox"
                className="toggle toggle-primary ml-2"
                checked={formData.isCrowdFunding}
                onChange={(e) =>
                  setFormData({ ...formData, isCrowdFunding: e.target.checked })
                }
              />
            </label>
          </div>

          <button type="submit" className={`btn btn-primary w-full`} disabled={isMinting || walletMismatch}>
            {isMinting
              ? <span className="loading loading-spinner loading-sm"></span>
              : 'Mint NFT'}
          </button>
        </form>
      ) : (
        <div className="alert alert-success shadow-lg text-center text-lg">
          ✅ NFT Minted Successfully! Redirecting to Marketplace...
        </div>
      )}
    </div>
  )
}
