import { NextResponse } from 'next/server'
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    const updated = await prisma.nFT.update({
      where: { tokenId: BigInt(id) },
      data: { playCount: { increment: 1 } },
    })

    return NextResponse.json({ success: true, newPlayCount: updated.playCount })
  } catch (error) {
    console.error('Failed to increment play count:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}