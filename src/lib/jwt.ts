import jwt from "jsonwebtoken"

export function generateJwt(payload: object) {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET is not set")
  }

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  })
}

export function verifyJwt(token: string) {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET is not set")
  }
  try {
    return jwt.verify(token, secret)
  } catch {
    throw new Error("Invalid or expired token")
  }
}
