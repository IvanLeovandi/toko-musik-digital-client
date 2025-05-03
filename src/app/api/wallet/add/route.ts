import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  const { email, wallet } = await req.json()

  if (!email || !wallet) {
    return NextResponse.json({ error: "Email and wallet are required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const existingWallet = await prisma.wallet.findUnique({ where: { address: wallet } })
  if (existingWallet) {
    return NextResponse.json({ message: "Wallet already linked" })
  }

  const newWallet = await prisma.wallet.create({
    data: {
      address: wallet,
      userId: user.id,
    },
  })

  return NextResponse.json({ message: "Wallet linked successfully", wallet: newWallet })
}
