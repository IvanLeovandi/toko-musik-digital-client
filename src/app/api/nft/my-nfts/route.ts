import { authMiddleware } from "@/middleware/authMiddleware"
import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function GET(req: Request) {
  const userOrError = await authMiddleware(req)

  if (typeof userOrError === "object" && "error" in userOrError) {
    return NextResponse.json(userOrError, { status: 401 })
  }

  if (typeof userOrError !== "object" || !("userId" in userOrError)) {
    return NextResponse.json({ error: "Invalid user data" }, { status: 400 })
  }

  const userId = userOrError.userId  

  try {
    const nftsRaw = await prisma.nFT.findMany({
      where: { ownerId: userId },
    })
    
    const nfts = nftsRaw.map(nft => ({
      ...nft,
      tokenId: nft.tokenId.toString(),
    }))

    return NextResponse.json({ nfts })

  } catch (err) {
    console.error("Error fetching NFTs:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
