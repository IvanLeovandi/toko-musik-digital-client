// /api/nft/[id]/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request, { params }: {params: Promise<{ id: string }>}) {
  const { id } = await params;
  try {
    const nft = await prisma.nFT.findFirst({
      where: { tokenId: BigInt(id) },
    })

    if (!nft) {
      return NextResponse.json({ error: 'NFT not found' }, { status: 404 })
    }

    return NextResponse.json(nft)
  } catch (err) {
    console.error('Error fetching NFT by ID:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
