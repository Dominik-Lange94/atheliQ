import { Router, Request, Response } from 'express'
import { RegisterSchema, LoginSchema } from '@shared/schemas'
import User from '../models/User'
import { signToken } from '../lib/jwt'
import { authenticate, AuthRequest } from '../middleware/auth'


const router = Router()

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() })
    return
  }

  const { name, email, password, role } = parsed.data

  try {
    const existing = await User.findOne({ email })
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already in use' })
      return
    }

    const user = await User.create({ name, email, password, role })
    const token = signToken({ userId: user._id.toString(), role: user.role })

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() })
    return
  }

  const { email, password } = parsed.data

  try {
    const user = await User.findOne({ email })
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ success: false, error: 'Invalid email or password' })
      return
    }

    const token = signToken({ userId: user._id.toString(), role: user.role })

    res.json({
      success: true,
      data: {
        token,
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId).select('-password')
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }
    res.json({ success: true, data: user })
  } catch {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

export default router
