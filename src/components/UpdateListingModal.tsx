'use client'

import { useState } from 'react'

interface UpdateListingModalProps {
  tokenId: string
  currentPrice: string
  isOpen: boolean
  onClose: () => void
  onUpdate: (tokenId: string, newPrice: string) => void
}

export default function UpdateListingModal({ tokenId, currentPrice, isOpen, onClose, onUpdate }: UpdateListingModalProps) {
  const [newPrice, setNewPrice] = useState(currentPrice)

  const handleUpdate = () => {
    onUpdate(tokenId, newPrice)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="modal-box max-w-sm bg-base-100 p-6 rounded-xl shadow-lg">
        <h3 className="font-bold text-lg mb-4">Update Listing #{tokenId}</h3>
        <input
          type="number"
          placeholder="New price in ETH"
          className="input input-bordered w-full mb-4"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleUpdate}>Update</button>
        </div>
      </div>
    </div>
  )
}
