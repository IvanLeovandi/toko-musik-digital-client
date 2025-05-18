import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
  }

  // 🔍 Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return NextResponse.json({ error: "Email is already registered" }, { status: 409 }) // 409 Conflict
  }

  const hashedPassword = await hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  })

  return NextResponse.json({ message: "User registered successfully", user })
}
