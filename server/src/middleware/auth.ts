import { Request, Response, NextFunction } from 'express'
import { verifyToken, JwtPayload } from '../lib/jwt'

export interface AuthRequest extends Request {
  user?: JwtPayload
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' })
    return
  }

  const token = authHeader.split(' ')[1]
  try {
    req.user = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}

export const requireRole = (role: 'athlete' | 'coach') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      res.status(403).json({ success: false, error: 'Forbidden: wrong role' })
      return
    }
    next()
  }
}
