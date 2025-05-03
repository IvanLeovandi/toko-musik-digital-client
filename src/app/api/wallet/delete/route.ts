import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  const { wallet } = await req.json()

  if (!wallet) {
    return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
  }

  await prisma.wallet.delete({
    where: { address: wallet },
  })

  return NextResponse.json({ message: "Wallet unlinked successfully" })
}
