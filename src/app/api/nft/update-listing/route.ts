import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { tokenId, price, isListed } = await req.json()

    const updated = await prisma.nFT.updateMany({
      where: {
        tokenId: BigInt(tokenId),
      },
      data: {
        price: price ? parseFloat(price) : undefined,
        isListed: typeof isListed === 'boolean' ? isListed : undefined,
      },
    })

    return NextResponse.json({ success: true, updated })
  } catch (err) {
    console.error('Failed to update NFT listing:', err)
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
  }
}
