import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { tokenIds } = await req.json()
    if (!tokenIds || !Array.isArray(tokenIds)) {
      return NextResponse.json({ error: "Invalid tokenIds array" }, { status: 400 })
    }

    const nfts = await prisma.nFT.findMany({
      where: {
        tokenId: { in: tokenIds.map((id: string) => BigInt(id)) },
      },
      include: {
        owner: {
          select: { email: true, walletAddress: true }
        }
      }
    })    

    const safeNFTs = nfts.map(nft => ({
      ...nft,
      tokenId: nft.tokenId.toString(),
      owner: {
        email: nft.owner.email,
        walletAddress: nft.owner.walletAddress
      }
    }))

    return NextResponse.json({ nfts: safeNFTs })
  } catch (error) {
    console.error("Failed to fetch NFT details:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
