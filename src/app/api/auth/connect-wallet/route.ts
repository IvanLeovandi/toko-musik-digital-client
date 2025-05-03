import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  const { email, wallet } = await req.json()

  if (!email || !wallet) {
    return NextResponse.json({ error: "Email and wallet required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const updatedUser = await prisma.user.update({
    where: { email },
    data: { wallet },
  })

  return NextResponse.json({ message: "Wallet connected successfully", user: updatedUser })
}
