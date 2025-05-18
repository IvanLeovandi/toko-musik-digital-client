import { gql } from '@apollo/client'

export const GET_ACTIVE_LISTINGS = gql`
  query GetActiveListings {
    listings(where: { isActive: true }, orderBy: createdAt, orderDirection: desc) {
      id
      listingId
      seller
      nftContract
      tokenId
      price
      createdAt
    }
  }
`

export const GET_MY_NFTS = gql`
  query GetMyActiveListings($seller: Bytes!) {
    listings(where: { seller: $seller }) {
      id
      listingId
      seller
      nftContract
      tokenId
      price
      isActive
    }
  }
`

export const GET_ALL_MINTED_NFTS = gql`
  query GetAllMintedNFTs {
    nftmintedEntities {
      id
      tokenId
      creator
      uri
      timestamp
    }
  }
`
