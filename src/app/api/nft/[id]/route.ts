import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request, { params }: {params: Promise<{ id: string }>}) {
  const { id } = await params

  try {
    const nft = await prisma.nFT.findFirst({
      where: { tokenId: BigInt(id) },
      include: {
        owner: {
          select: {
            email: true,
            walletAddress: true,
          },
        },
      },
    })

    if (!nft) {
      return NextResponse.json({ error: 'NFT not found' }, { status: 404 })
    }

    const serializedNFT = {
      ...nft,
      tokenId: nft.tokenId.toString(),
      price: nft.price?.toString() ?? null,
    }

    return NextResponse.json(serializedNFT)
  } catch (err) {
    console.error('Error fetching NFT by ID:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
