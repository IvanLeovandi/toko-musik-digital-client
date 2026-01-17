// hooks/useNFTListing.ts
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import NFTMarketplaceContractABI from '@/constants/NftMarketplace.json'

export default function useNFTListing(nftContractAddress: string, tokenId: string) {
  const [listingId, setListingId] = useState<string | null>(null)
  const [seller, setSeller] = useState<string>('')
  const [price, setPrice] = useState<string>('0')
  const [isListed, setIsListed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchListing = async () => {
      try {
        // Use public RPC instead of MetaMask for read-only operations
        const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com')
        const marketplace = new ethers.Contract(
          process.env.NEXT_PUBLIC_NFT_MARKETPLACE_CONTRACT_ADDRESS!,
          NFTMarketplaceContractABI,
          provider
        )

        const [id, sellerAddr, listingPrice, active] = await marketplace.getListingByToken(
          nftContractAddress,
          tokenId
        )

        if (active) {
          setListingId(id.toString())
          setSeller(sellerAddr)
          setPrice(listingPrice.toString())
          setIsListed(true)
        } else {
          setIsListed(false)
        }
      } catch (err) {
        console.error('Failed to fetch listing:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchListing()
  }, [nftContractAddress, tokenId])

  return { listingId, seller, price, isListed, loading }
}
