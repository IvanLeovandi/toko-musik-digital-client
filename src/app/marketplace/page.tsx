'use client'

import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { useMarketplaceNFTs } from '@/hooks/useMarketplaceNFTs'
import NFTMarketplaceContractABI from '@/constants/NftMarketplace.json'
import { showToast } from '@/utils/toast'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import MarketplaceCard from '@/components/MarketplaceCard'
import useWallet from '@/hooks/useWallet'
import WalletChangeWarning from '@/components/WalletChangeWarning'

export default function MarketplacePage() {
  const { isAuthenticated, user, dbSyncFailed, retryRemoveWalletFromDB, walletMismatch } = useAuth()
  const { account, connectWallet, isLoading: isUseWalletLoading } = useWallet()
  const { nfts, loading } = useMarketplaceNFTs()
  const [buyingTokenId, setBuyingTokenId] = useState<string | null>(null)
  
  const router = useRouter()

  const showConnectWallet = isAuthenticated && !isUseWalletLoading && !account

  useEffect(() => {
    if (!nfts.length) return;
  }, [nfts])
  

  const handleBuy = async (listingId: number, price: string, tokenId: string) => {
    if (!user) {
      showToast("🚨 You must be logged in to buy NFT", "error")
      return router.push("/login")
    }
  
    try {
      setBuyingTokenId(listingId.toString())
  
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const marketplaceContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_NFT_MARKETPLACE_CONTRACT_ADDRESS!,
        NFTMarketplaceContractABI,
        signer
      )
  
      const tx = await marketplaceContract.buyNFT(listingId, {
        value: price,
      })
  
      await tx.wait(1)
      showToast("✅ NFT purchased successfully!", "success")
      const response = await fetch('/api/nft/update-owner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenId: tokenId.toString(),
          newOwnerId: user.id,
        }),
      })

      if (response.ok) {
        showToast("✅ NFT ownership updated!", "success")
        window.location.reload()
      } else {
        throw new Error("Failed to update ownership")
      }
      window.location.reload()
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
      setBuyingTokenId(null)
    }
  }

  return (
    <div className="bg-base-100 min-h-screen px-32 py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">🎵 NFT Marketplace</h1>
      <WalletChangeWarning
        walletMismatch={walletMismatch}
        dbSyncFailed={dbSyncFailed}
        retryRemoveWalletFromDB={retryRemoveWalletFromDB}
        connectWallet={connectWallet}
        showConnectWallet={showConnectWallet}
        user={user}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-24">
      {loading
        ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton w-full h-64 rounded-xl" />
          ))
        : nfts.map((item) => {
            const isBuying = buyingTokenId === item.listingId.toString()
            const isOwner = item.seller.toLowerCase() === user?.walletAddress?.toLowerCase()
            const isAdmin = user?.role === 'ADMIN'
            
            return (
              <MarketplaceCard
                key={item.listingId}
                item={item}
                isOwner={isOwner}
                isAdmin={isAdmin}
                isBuying={isBuying}
                isWalletMismatch={walletMismatch}
                onBuyClick={() => handleBuy(item.listingId, item.price, item.tokenId)}
              />
            )
          })}
      </div>
    </div>
  )
}
