import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"
import { ethers } from "ethers"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  const { email, address, signature, message } = await req.json()

  if (!email || !address || !signature || !message) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 })
  }

  const recovered = ethers.verifyMessage(message, signature)
  if (recovered.toLowerCase() !== address.toLowerCase()) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const alreadyUsed = await prisma.user.findFirst({
    where: { walletAddress: address },
  })

  if (alreadyUsed && alreadyUsed.email !== email) {
    return NextResponse.json({ error: "Wallet already in use" }, { status: 400 })
  }

  const updatedUser = await prisma.user.update({
    where: { email },
    data: { walletAddress: address },
    select: {
      id: true,
      email: true,
      walletAddress: true,
      role: true,
    }
  })

  return NextResponse.json({ user: updatedUser })
}
