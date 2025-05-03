"use client";

import { useState, useEffect, useCallback } from "react"
import { useWeb3Contract, useMoralis } from "react-moralis"
import nftMarketplaceAbi from "../constants/NftMarketplace.json"
import nftAbi from "../constants/BasicNft.json"
import Image from "next/image"
import { Card, useNotification } from "web3uikit"
import { ethers } from "ethers"
import UpdateListingModal from "./UpdateListingModal"

const truncateStr = (fullStr: string, strLen: number) => {
    if (fullStr.length <= strLen) return fullStr

    const separator = "..."
    const seperatorLength = separator.length
    const charsToShow = strLen - seperatorLength
    const frontChars = Math.ceil(charsToShow / 2)
    const backChars = Math.floor(charsToShow / 2)
    return (
        fullStr.substring(0, frontChars) +
        separator +
        fullStr.substring(fullStr.length - backChars)
    )
}

export default function NFTCard({
  price,
  nftAddress,
  tokenId,
  marketplaceAddress,
  seller,
}: {
    price: number
    nftAddress: string
    tokenId: number
    marketplaceAddress: string
    seller?: string
}) {
    const { isWeb3Enabled, account } = useMoralis()
    const [imageURI, setImageURI] = useState("")
    const [tokenName, setTokenName] = useState("")
    const [tokenDescription, setTokenDescription] = useState("")
    const [showModal, setShowModal] = useState(false)
    const hideModal = () => setShowModal(false)
    const dispatch = useNotification()

    console.log(`NFTCard render ${nftAddress} ${tokenId} ${price} ${marketplaceAddress} ${seller}`);
    

    const { runContractFunction: getTokenURI } = useWeb3Contract({
        abi: nftAbi,
        contractAddress: nftAddress,
        functionName: "tokenURI",
        params: {
            tokenId: tokenId,
        },
    })

    const { runContractFunction: buyItem } = useWeb3Contract({
        abi: nftMarketplaceAbi,
        contractAddress: marketplaceAddress,
        functionName: "buyItem",
        msgValue: price,
        params: {
            nftAddress: nftAddress,
            tokenId: tokenId,
        },
    })

    const updateUI = useCallback(async () => {
        try {
            const tokenURI = await getTokenURI()
            console.log(`The TokenURI is ${tokenURI}`)
            if (tokenURI) {
                const requestURL = (tokenURI as string).replace("ipfs://", "https://ipfs.io/ipfs/")
                const response = await fetch(requestURL)
                if (!response.ok) {
                    throw new Error(`Failed to fetch token metadata: ${response.statusText}`)
                }
                const tokenURIResponse = await response.json()
                const imageURI = tokenURIResponse.image
                const imageURIURL = imageURI.replace("ipfs://", "https://ipfs.io/ipfs/")
                setImageURI(imageURIURL)
                setTokenName(tokenURIResponse.name)
                setTokenDescription(tokenURIResponse.description)
            } else {
                console.warn("TokenURI returned undefined")
            }
        } catch (error) {
            console.error("Failed to update NFT data:", error)
        }
    }, [getTokenURI])
    

    useEffect(() => {
        if (isWeb3Enabled && nftAddress && tokenId !== undefined) {
            updateUI()
        } else {
            console.log("Web3 not enabled or missing nftAddress/tokenId")
        }
    }, [isWeb3Enabled, nftAddress, tokenId, updateUI])
    

    const isOwnedByUser = seller === account || seller === undefined
    const formattedSellerAddress = isOwnedByUser ? "you" : truncateStr(seller || "", 15)

    const handleCardClick = () => {
      if (isOwnedByUser) setShowModal(true)
      else buyItem({
            onError: (error) => console.log(error),
            onSuccess: () => handleBuyItemSuccess(),
        })
    }

    const handleBuyItemSuccess = () => {
        dispatch({
            type: "success",
            message: "Item bought!",
            title: "Item Bought",
            position: "topR",
        })
    }

    return (
        <div>
            <div>
                {imageURI ? (
                    <div>
                        <UpdateListingModal
                            isVisible={showModal}
                            tokenId={tokenId}
                            marketplaceAddress={marketplaceAddress}
                            nftAddress={nftAddress}
                            onClose={hideModal}
                        />
                        <Card
                            title={tokenName}
                            description={tokenDescription}
                            onClick={handleCardClick}
                        >
                            <div className="p-2">
                                <div className="flex flex-col items-end gap-2">
                                    <div>#{tokenId}</div>
                                    <div className="italic text-sm">
                                        Owned by {formattedSellerAddress}
                                    </div>
                                    <Image
                                        loader={() => imageURI}
                                        src={imageURI}
                                        alt="NFT Image"
                                        height="200"
                                        width="200"
                                    />
                                    <div className="font-bold">
                                        {ethers.formatUnits(price, "ether")} ETH
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                ) : (
                    <div>Loading...</div>
                )}
            </div>
        </div>
    )
}
