import { useQuery } from '@apollo/client'
import { GET_MY_NFTS } from '@/graphql/queries'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'

interface nftsType {
  id: number;
  contractAddress: string;
  tokenId: string;
  ownerId: number;
  listingId: string;
  isListed: boolean;
  isCrowdFunding: boolean;
  price: string;
  playCount: number;
  lastRoyaltyPlayCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ListingType {
  id: string;
  listingId: string;
  isActive: boolean;
  nftContract: string;
  price: string;
  seller: string;
  tokenId: string;
  __typename?: string;
}


export function useMyNFTsWithListing(walletAddress?: string) {
  const [nfts, setNFTs] = useState<nftsType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lowerAddress = walletAddress?.toLowerCase()

  const { token } = useAuth()

  const { data, loading: graphLoading } = useQuery(GET_MY_NFTS, {
    variables: { seller: lowerAddress },
    skip: !lowerAddress,
  })

  const fetchNFTs = useCallback(async () => {
    if (!walletAddress) return
    setLoading(true)
    try {
      const res = await fetch('/api/nft/my-nfts', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })      

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to fetch NFTs')
      }
      const data = await res.json()
      setNFTs(data.nfts)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching NFTs:', err)
      setError(err.message)
      setNFTs([])
    } finally {
      setLoading(false)
    }
  }, [token, walletAddress])

  useEffect(() => {
    if (walletAddress) {
      fetchNFTs()
    }
  }, [walletAddress, fetchNFTs])

  const listings = data?.listings || []
  
  const listingMap = new Map<string, ListingType>(
    listings.map((listing: ListingType) => [
      `${listing.nftContract.toLowerCase()}-${listing.tokenId.toString()}`,
      listing,
    ])
  )  

  const mergedNFTs = nfts.map(nft => {
    const key = `${nft.contractAddress.toLowerCase()}-${nft.tokenId.toString()}`
    const matchedListing = listingMap.get(key)
    return {
      ...nft,
      isListed: matchedListing ? matchedListing.isActive : nft.isListed,
      price: matchedListing ? matchedListing.price : nft.price,
      listingId: matchedListing ? matchedListing.listingId : null,
      id: nft.id,
    }
  })

  return {
    loading: loading || graphLoading,
    nfts: mergedNFTs,
    error,
  }
}
