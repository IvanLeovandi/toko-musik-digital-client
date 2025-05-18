import { PrismaClient } from "@prisma/client"
import { compare } from "bcryptjs"
import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const isPasswordValid = await compare(password, user.password)
  if (!isPasswordValid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET as string,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  )

  return NextResponse.json({
    message: "Login successful",
    token,
    user,
  })

}
