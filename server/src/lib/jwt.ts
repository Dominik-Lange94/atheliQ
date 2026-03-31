import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'fallback_secret'

export interface JwtPayload {
  userId: string
  role: 'athlete' | 'coach'
}

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, SECRET) as JwtPayload
}
