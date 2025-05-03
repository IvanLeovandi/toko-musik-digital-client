import { useQuery } from '@apollo/client'
import { GET_ALL_MINTED_NFTS, GET_ACTIVE_LISTINGS } from '@/graphql/queries'

export function useMarketplaceNFTs() {
  const { data: mintedData, loading: loadingMinted } = useQuery(GET_ALL_MINTED_NFTS)
  const { data: listedData, loading: loadingListed } = useQuery(GET_ACTIVE_LISTINGS)

  const mintedMap = new Map(
    mintedData?.nftmintedEntities?.map((mint: any) => [mint.tokenId.toString(), mint.uri]) || []
  )

  const listings = (listedData?.nftlistedEntities || []).map((item: any) => ({
    ...item,
    uri: mintedMap.get(item.tokenId.toString()) || null,
  }))

  return {
    nfts: listings,
    loading: loadingMinted || loadingListed,
  }
}
