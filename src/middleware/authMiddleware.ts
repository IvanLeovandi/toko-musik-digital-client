import { verifyJwt } from "@/lib/jwt"
import { NextResponse } from "next/server"

export async function authMiddleware(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = authHeader.split(" ")[1]
  const decoded = verifyJwt(token)

  if (typeof decoded === "string") {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  return decoded
}
