import { useQuery } from '@apollo/client'
import { GET_ACTIVE_LISTINGS } from '@/graphql/queries'

export function useMarketplaceNFTs() {
  const { data, loading } = useQuery(GET_ACTIVE_LISTINGS)

  return {
    nfts: data?.listings || [],
    loading,
  }
}
