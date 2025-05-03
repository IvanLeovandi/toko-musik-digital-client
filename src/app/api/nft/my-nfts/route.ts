import { authMiddleware } from "@/middleware/authMiddleware"
import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function GET(req: Request) {
  const userOrError = await authMiddleware(req)

  if (typeof userOrError === "object" && "error" in userOrError) {
    return userOrError // Langsung balikin error
  }

  if (typeof userOrError !== "object" || !("userId" in userOrError)) {
    return NextResponse.json({ error: "Invalid user data" }, { status: 400 })
  }

  const userId = userOrError.userId // Ini dari token payload

  const nfts = await prisma.nFT.findMany({
    where: { ownerId: userId },
  })

  return NextResponse.json({ nfts })
}
