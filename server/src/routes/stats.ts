import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { CreateStatEntrySchema } from '@shared/schemas'
import StatEntry from '../models/StatEntry'
import StatCard from '../models/StatCard'
import CoachAthlete from '../models/CoachAthlete'

const router = Router()
router.use(authenticate)

// POST /api/stats/entries
router.post('/entries', async (req: AuthRequest, res: Response) => {
  const parsed = CreateStatEntrySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() })
    return
  }
  try {
    const card = await StatCard.findOne({ _id: parsed.data.cardId, athleteId: req.user!.userId })
    if (!card) { res.status(404).json({ success: false, error: 'Card not found' }); return }
    const entry = await StatEntry.create({
      ...parsed.data,
      athleteId: req.user!.userId,
      recordedAt: parsed.data.recordedAt ?? new Date(),
    })
    res.status(201).json({ success: true, data: entry })
  } catch { res.status(500).json({ success: false, error: 'Server error' }) }
})

// DELETE /api/stats/entries/:id
router.delete('/entries/:id', async (req: AuthRequest, res: Response) => {
  try {
    const entry = await StatEntry.findOneAndDelete({
      _id: req.params.id,
      athleteId: req.user!.userId,
    })
    if (!entry) { res.status(404).json({ success: false, error: 'Entry not found' }); return }
    res.json({ success: true, message: 'Entry deleted' })
  } catch { res.status(500).json({ success: false, error: 'Server error' }) }
})

// GET /api/stats/latest
router.get('/latest', async (req: AuthRequest, res: Response) => {
  try {
    const cards = await StatCard.find({ athleteId: req.user!.userId })
    const latest = await Promise.all(
      cards.map(async (card) => {
        const entry = await StatEntry.findOne({ cardId: card._id })
          .sort({ recordedAt: -1 })
          .select('value secondaryValue recordedAt cardId athleteId')
        return { card, latest: entry ?? null }
      })
    )
    res.json({ success: true, data: latest })
  } catch { res.status(500).json({ success: false, error: 'Server error' }) }
})

// GET /api/stats/day?date=2024-01-15
router.get('/day', async (req: AuthRequest, res: Response) => {
  const dateStr = req.query.date as string
  if (!dateStr) { res.status(400).json({ success: false, error: 'date required' }); return }
  try {
    const start = new Date(dateStr); start.setHours(0, 0, 0, 0)
    const end   = new Date(dateStr); end.setHours(23, 59, 59, 999)
    const cards = await StatCard.find({ athleteId: req.user!.userId })
    const result = await Promise.all(
      cards.map(async (card) => {
        const entry = await StatEntry.findOne({
          cardId: card._id,
          athleteId: req.user!.userId,
          recordedAt: { $gte: start, $lte: end },
        }).sort({ recordedAt: -1 })
        return { card, entry: entry ?? null }
      })
    )
    res.json({ success: true, data: result })
  } catch { res.status(500).json({ success: false, error: 'Server error' }) }
})

// GET /api/stats/entries/:cardId?from=...&to=...
router.get('/entries/:cardId', async (req: AuthRequest, res: Response) => {
  try {
    const card = await StatCard.findById(req.params.cardId)
    if (!card) { res.status(404).json({ success: false, error: 'Card not found' }); return }

    if (req.user!.role === 'coach') {
      const relation = await CoachAthlete.findOne({
        coachId: req.user!.userId, athleteId: card.athleteId,
        status: 'active', allowedMetrics: card._id,
      })
      if (!relation) { res.status(403).json({ success: false, error: 'Access not granted' }); return }
    } else if (card.athleteId.toString() !== req.user!.userId) {
      res.status(403).json({ success: false, error: 'Forbidden' }); return
    }

    const { from, to } = req.query
    const filter: any = { cardId: req.params.cardId }
    if (from || to) {
      filter.recordedAt = {}
      if (from) filter.recordedAt.$gte = new Date(from as string)
      if (to)   filter.recordedAt.$lte = new Date(to as string)
    }

    const limit = (from || to) ? 500 : 90
    const entries = await StatEntry.find(filter).sort({ recordedAt: -1 }).limit(limit)
    res.json({ success: true, data: entries.reverse() })
  } catch { res.status(500).json({ success: false, error: 'Server error' }) }
})

export default router
