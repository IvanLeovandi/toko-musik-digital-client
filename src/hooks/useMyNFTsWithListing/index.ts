import { useQuery } from '@apollo/client'
import { GET_MY_NFTS, GET_MY_ACTIVE_LISTINGS } from '@/graphql/queries'

export function useMyNFTsWithListing(walletAddress?: string) {
  const lowerAddress = walletAddress?.toLowerCase()

  const { data: nftData, loading: loadingNFTs } = useQuery(GET_MY_NFTS, {
    variables: { creator: lowerAddress },
    skip: !lowerAddress,
  })
  
  const { data: listingData, loading: loadingListings } = useQuery(GET_MY_ACTIVE_LISTINGS, {
    variables: { seller: lowerAddress },
    skip: !lowerAddress,
  })  
  
  const listedMap = new Map(
    listingData?.nftlistedEntities?.map((item: any) => [
      item.tokenId.toString(),
      item.price
    ]) || []
  )  
  
  const myNFTs = (nftData?.nftmintedEntities || []).map((nft: any) => {
    const tokenIdStr = nft.tokenId.toString()
    const listedPrice = listedMap.get(tokenIdStr)
  
    return {
      ...nft,
      isListed: listedMap.has(tokenIdStr),
      price: listedPrice ?? null,
    }
  })  

  return {
    loading: loadingNFTs || loadingListings,
    nfts: myNFTs
  }
}