'use client'

import { useState } from 'react'

interface ListNFTModalProps {
  tokenId: string
  isOpen: boolean
  onClose: () => void
  onList: (tokenId: string, price: string) => void
}

export default function ListNFTModal({ tokenId, isOpen, onClose, onList }: ListNFTModalProps) {
  const [price, setPrice] = useState('')

  const handleList = () => {
    onList(tokenId, price)
    setPrice('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="modal-box max-w-sm bg-base-100 p-6 rounded-xl shadow-lg">
        <h3 className="font-bold text-lg mb-4">List NFT #{tokenId}</h3>
        <input
          type="number"
          placeholder="Price in ETH"
          className="input input-bordered w-full mb-4"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleList}>List</button>
        </div>
      </div>
    </div>
  )
}
