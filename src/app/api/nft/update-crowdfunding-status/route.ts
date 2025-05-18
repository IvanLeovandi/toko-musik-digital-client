import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { tokenId, isCrowdFunding } = await req.json()
    if (!tokenId || typeof isCrowdFunding !== "boolean") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const updatedNFT = await prisma.nFT.updateMany({
      where: {
        tokenId: BigInt(tokenId),
      },
      data: {
        isCrowdFunding,
      },
    })

    if (updatedNFT.count === 0) {
      return NextResponse.json({ error: "NFT not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update crowdfunding status:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
