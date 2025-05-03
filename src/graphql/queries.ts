// queries/listings.ts
import { gql } from '@apollo/client'

export const GET_ACTIVE_LISTINGS = gql`
  query GetActiveListings {
    nftlistedEntities(where: { isActive: true }) {
      id
      tokenId
      price
      seller
      timestamp
    }
  }
`

export const GET_MY_NFTS = gql`
  query GetMyNFTs($creator: Bytes!) {
    nftmintedEntities(where: { creator: $creator }) {
      id
      tokenId
      creator
      uri
      timestamp
    }
  }
`

export const GET_MY_ACTIVE_LISTINGS = gql`
  query GetMyListings($seller: Bytes!) {
    nftlistedEntities(where: { seller: $seller, isActive: true }) {
      tokenId
      isActive
      price
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
