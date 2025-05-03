import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 })
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { walletAddress: null },
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error('Error removing walletAddress:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
