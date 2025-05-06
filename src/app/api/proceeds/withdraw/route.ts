import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    await prisma.proceeds.updateMany({
      where: {
        userId,
        status: 'PENDING',
      },
      data: {
        status: 'WITHDRAWN',
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('❌ Error updating proceeds status:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
