import { Router, Response } from 'express'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { UpdatePermissionsSchema } from '@shared/schemas'
import CoachAthlete from '../models/CoachAthlete'
import User from '../models/User'
import StatCard from '../models/StatCard'
import StatEntry from '../models/StatEntry'

const router = Router()
router.use(authenticate)

// GET /api/coach/athletes — list all athletes linked to this coach
router.get('/athletes', requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    const relations = await CoachAthlete.find({
      coachId: req.user!.userId,
      status: 'active',
    }).populate('athleteId', 'name email')
    res.json({ success: true, data: relations })
  } catch {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// GET /api/coach/athletes/:athleteId/stats — get permitted stats for an athlete
router.get('/athletes/:athleteId/stats', requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    const relation = await CoachAthlete.findOne({
      coachId: req.user!.userId,
      athleteId: req.params.athleteId,
      status: 'active',
    })
    if (!relation) {
      res.status(403).json({ success: false, error: 'No active relationship with this athlete' })
      return
    }
    const cards = await StatCard.find({
      _id: { $in: relation.allowedMetrics },
      athleteId: req.params.athleteId,
    })
    const stats = await Promise.all(
      cards.map(async (card) => {
        const entries = await StatEntry.find({ cardId: card._id })
          .sort({ recordedAt: -1 })
          .limit(30)
        return { card, entries: entries.reverse() }
      })
    )
    res.json({ success: true, data: stats })
  } catch {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// GET /api/coach/search?email=... — athlete searches for a coach by email
router.get('/search', requireRole('athlete'), async (req: AuthRequest, res: Response) => {
  const email = req.query.email as string
  if (!email) {
    res.status(400).json({ success: false, error: 'Email required' })
    return
  }
  try {
    const coach = await User.findOne({ email: email.toLowerCase(), role: 'coach' }).select('_id name email')
    if (!coach) {
      res.status(404).json({ success: false, error: 'Kein Coach mit dieser Email gefunden' })
      return
    }
    res.json({ success: true, data: coach })
  } catch {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// POST /api/coach/connect — athlete connects a coach
router.post('/connect', requireRole('athlete'), async (req: AuthRequest, res: Response) => {
  const { coachId } = req.body
  if (!coachId) {
    res.status(400).json({ success: false, error: 'coachId required' })
    return
  }
  try {
    const coach = await User.findOne({ _id: coachId, role: 'coach' })
    if (!coach) {
      res.status(404).json({ success: false, error: 'Coach not found' })
      return
    }
    const existing = await CoachAthlete.findOne({
      coachId,
      athleteId: req.user!.userId,
    })
    if (existing) {
      // Reactivate if revoked
      if (existing.status === 'revoked') {
        existing.status = 'active'
        await existing.save()
        res.json({ success: true, data: existing })
        return
      }
      res.status(409).json({ success: false, error: 'Coach bereits verbunden' })
      return
    }
    const relation = await CoachAthlete.create({
      coachId,
      athleteId: req.user!.userId,
      status: 'active',
      allowedMetrics: [],
    })
    res.status(201).json({ success: true, data: relation })
  } catch {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// PATCH /api/coach/permissions/:coachId — athlete updates what a coach can see
router.patch('/permissions/:coachId', requireRole('athlete'), async (req: AuthRequest, res: Response) => {
  const parsed = UpdatePermissionsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() })
    return
  }
  try {
    const relation = await CoachAthlete.findOneAndUpdate(
      { coachId: req.params.coachId, athleteId: req.user!.userId },
      { allowedMetrics: parsed.data.allowedMetrics },
      { new: true }
    )
    if (!relation) {
      res.status(404).json({ success: false, error: 'Relationship not found' })
      return
    }
    res.json({ success: true, data: relation })
  } catch {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// DELETE /api/coach/disconnect/:coachId — athlete removes a coach
router.delete('/disconnect/:coachId', requireRole('athlete'), async (req: AuthRequest, res: Response) => {
  try {
    await CoachAthlete.findOneAndUpdate(
      { coachId: req.params.coachId, athleteId: req.user!.userId },
      { status: 'revoked', allowedMetrics: [] }
    )
    res.json({ success: true, message: 'Coach disconnected' })
  } catch {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// GET /api/coach/my-coaches — athlete sees which coaches have access
router.get('/my-coaches', requireRole('athlete'), async (req: AuthRequest, res: Response) => {
  try {
    const relations = await CoachAthlete.find({
      athleteId: req.user!.userId,
      status: 'active',
    }).populate('coachId', 'name email')
    res.json({ success: true, data: relations })
  } catch {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

export default router
