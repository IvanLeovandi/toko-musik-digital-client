import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  const body = await req.json()
  const { tokenId, contractAddress, ownerId, price, isListed, isCrowdFunding } = body

  if (!tokenId || !contractAddress || !ownerId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  try {
    const nft = await prisma.nFT.create({
      data: {
        tokenId: BigInt(tokenId),
        contractAddress,
        ownerId,
        price: price ? parseFloat(price) : null,
        isListed: !!isListed,
        isCrowdFunding: !!isCrowdFunding,
      }
    })

    return NextResponse.json(nft)
  } catch (error) {
    console.error("Error storing NFT:", error)
    return NextResponse.json({ error: "Failed to store NFT" }, { status: 500 })
  }
}
