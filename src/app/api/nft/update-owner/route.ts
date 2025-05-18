import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { tokenId, newOwnerId } = await req.json()

    const updatedNFT = await prisma.nFT.updateMany({
      where: { tokenId: BigInt(tokenId) },
      data: {
        ownerId: newOwnerId,
        isListed: false,
        price: 0,
      },
    })

    return NextResponse.json({ success: true, nft: updatedNFT })
  } catch (error) {
    console.error("Error updating NFT owner:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
