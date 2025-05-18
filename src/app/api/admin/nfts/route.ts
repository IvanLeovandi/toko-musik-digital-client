import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function serializeBigInts(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ))
}

export async function GET() {
  try {
    const nfts = await prisma.nFT.findMany({
      include: {
        owner: {
          select: {
            email: true,
            walletAddress: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    })

    return NextResponse.json(serializeBigInts(nfts))
  } catch (err) {
    console.error('Failed to fetch NFTs:', err)
    return NextResponse.json({ error: 'Failed to fetch NFTs' }, { status: 500 })
  }
}
