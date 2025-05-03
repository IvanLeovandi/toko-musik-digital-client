"use client"

import { useState, useRef, FormEvent } from 'react'
import { pinata } from "@/utils/config"
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/context/AuthContext'
import { ethers } from 'ethers'
import contractABI from '@/constants/NftMarketplace.json'

interface NFTData {
  title: string
  description: string
  price: string
  salesRoyaltyPercentage: string
  ownerListenPercentage: string
  coverImage?: File
  audioFile?: File
}

export default function MintPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [formData, setFormData] = useState<NFTData>({
    title: '',
    description: '',
    price: '',
    salesRoyaltyPercentage: '',
    ownerListenPercentage: '',
  })
  const [coverPreview, setCoverPreview] = useState<string>('')
  const [audioPreview, setAudioPreview] = useState<string>('')
  const [isMinting, setIsMinting] = useState(false)
  const [mintedToken, setMintedToken] = useState<any>(null)
  const coverRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLInputElement>(null)

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

    setIsMinting(true)
    try {
      const [coverUpload, audioUpload] = await Promise.all([
        uploadToIPFS(formData.coverImage!),
        uploadToIPFS(formData.audioFile!)
      ])

      const imageCID = coverUpload.cid;
      const audioCID = audioUpload.cid;

      const metadata = {
        name: formData.title,
        description: formData.description,
        image: `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${imageCID}`,
        audio: `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${audioCID}`,
        attributes: [
          { trait_type: "Sales Royalty", value: formData.salesRoyaltyPercentage },
          { trait_type: "Listen Royalty", value: formData.ownerListenPercentage },
        ]
      }

      const metadataFile = new File([
        JSON.stringify(metadata)
      ], "metadata.json", { type: "application/json" })

      const metadataUpload = await uploadToIPFS(metadataFile)

      // Call smart contract via ethers
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
        contractABI,
        signer
      )

      const tx = await contract.mint(
        `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${metadataUpload.cid}`,
        parseInt(formData.salesRoyaltyPercentage),
        parseInt(formData.ownerListenPercentage),
        { value: ethers.parseEther("0.01") }
      )

      const mintTxReceipt = await tx.wait(1)

      if (!mintTxReceipt) {
          throw new Error("Transaction receipt is null")
      }
  
      let tokenId
      for (const log of mintTxReceipt.logs) {
          try {            
              const parsedLog = contract.interface.parseLog(log)
              console.log("Log:", parsedLog);
              if (parsedLog && parsedLog.name === "Transfer") {
                  tokenId = parsedLog.args.tokenId
                  break
              }
          } catch (err) {
              console.log("Error parsing log:", err);
          }
      }
      if (!tokenId) {
          throw new Error("Token ID not found in transaction logs")
      }

      const listingTx = await contract.listNFT(
        tokenId,
        ethers.parseEther(formData.price)
      )
      await listingTx.wait(1)

      console.log(`https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${metadataUpload.cid}`);

      // Save to Supabase
      await fetch("/api/nft/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: tokenId.toString(),
          contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
          ownerId: user.id,
          price: formData.price,
          metadataUrl: `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${metadataUpload.cid}`,
          isListed: true,
        })
      })

      setMintedToken({ ...metadata, tokenId })
      setIsMinting(false)
    } catch (err: any) {
      console.error(err)
      setIsMinting(false)
      if (err.code === 4001) {
        alert("🚫 Transaksi dibatalkan oleh pengguna.")
      } else {
        alert("❌ Minting gagal. Silakan coba lagi.")
      }
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      {!mintedToken ? (
        <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl p-6 space-y-4">
          <h1 className="text-2xl font-bold">Mint Music NFT</h1>

          <p>Music Cover Image</p>
          <input type="file" accept="image/*" onChange={handleFileChange('cover')} ref={coverRef} className="file-input w-full" required />
          {coverPreview && <Image src={coverPreview} alt="cover" width={400} height={400} className="rounded-xl" />}

          <p>Music Audio File</p>
          <input type="file" accept="audio/*" onChange={handleFileChange('audio')} ref={audioRef} className="file-input w-full" required />
          {audioPreview && <audio controls src={audioPreview} className="w-full" />}

          <input type="text" className="input input-bordered w-full" placeholder="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />

          <textarea className="textarea textarea-bordered w-full" placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />

          <input type="number" className="input input-bordered w-full" placeholder="Price (ETH)" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />

          <input type="number" className="input input-bordered w-full" placeholder="Sales Royalty (%)" value={formData.salesRoyaltyPercentage} onChange={(e) => setFormData({ ...formData, salesRoyaltyPercentage: e.target.value })} required />

          <input type="number" className="input input-bordered w-full" placeholder="Owner Listen Royalty (%)" value={formData.ownerListenPercentage} onChange={(e) => setFormData({ ...formData, ownerListenPercentage: e.target.value })} required />

          <button type="submit" className={`btn btn-primary w-full ${isMinting ? 'loading' : ''}`} disabled={isMinting}>
            {isMinting ? 'Minting...' : 'Mint NFT'}
          </button>
        </form>
      ) : (
        <div className="alert alert-success">NFT Minted! Token ID: {mintedToken.tokenId}</div>
      )}
    </div>
  )
}
