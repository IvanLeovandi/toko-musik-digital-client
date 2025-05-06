import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const { nftId, amountEth, txHash } = await req.json()

    if (!nftId || !amountEth || !txHash) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 })
    }

    // Fetch NFT and owner
    const nft = await prisma.nFT.findUnique({
      where: { id: nftId },
      include: { owner: true },
    })

    if (!nft || !nft.owner) {
      return NextResponse.json({ error: 'NFT or owner not found' }, { status: 404 })
    }

    const userId = nft.owner.id

    // Find pending proceeds
    const pendingProceeds = await prisma.proceeds.findFirst({
      where: {
        userId,
        status: 'PENDING',
      },
    })

    await prisma.$transaction([
      // Update NFT play count
      prisma.nFT.update({
        where: { id: nftId },
        data: {
          lastRoyaltyPlayCount: nft.playCount,
        },
      }),

      // Update existing proceeds or create new one
      pendingProceeds
        ? prisma.proceeds.update({
            where: { id: pendingProceeds.id },
            data: {
              amount: {
                increment: amountEth,
              },
            },
          })
        : prisma.proceeds.create({
            data: {
              userId,
              amount: amountEth,
              status: 'PENDING',
            },
          }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('❌ Error in distribute route:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
