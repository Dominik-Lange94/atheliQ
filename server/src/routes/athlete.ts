import { Router, Response } from 'express'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { CreateStatCardSchema, UpdateWeightSchema } from '@shared/schemas'
import StatCard from '../models/StatCard'
import StatEntry from '../models/StatEntry'

const router = Router()
router.use(authenticate, requireRole('athlete'))

// GET /api/athlete/cards — get all cards for the logged-in athlete
router.get('/cards', async (req: AuthRequest, res: Response) => {
  try {
    const cards = await StatCard.find({ athleteId: req.user!.userId }).sort({ order: 1 })
    res.json({ success: true, data: cards })
  } catch {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// POST /api/athlete/cards — add a new card
router.post('/cards', async (req: AuthRequest, res: Response) => {
  const parsed = CreateStatCardSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() })
    return
  }

  try {
    const count = await StatCard.countDocuments({ athleteId: req.user!.userId })
    const card = await StatCard.create({
      ...parsed.data,
      athleteId: req.user!.userId,
      order: count,
    })
    res.status(201).json({ success: true, data: card })
  } catch {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// DELETE /api/athlete/cards/:id — remove a card
router.delete('/cards/:id', async (req: AuthRequest, res: Response) => {
  try {
    const card = await StatCard.findOneAndDelete({
      _id: req.params.id,
      athleteId: req.user!.userId,
    })
    if (!card) {
      res.status(404).json({ success: false, error: 'Card not found' })
      return
    }
    // Also remove all entries for this card
    await StatEntry.deleteMany({ cardId: req.params.id })
    res.json({ success: true, message: 'Card removed' })
  } catch {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// PATCH /api/athlete/cards/reorder — update card order
router.patch('/cards/reorder', async (req: AuthRequest, res: Response) => {
  const { order }: { order: { id: string; order: number }[] } = req.body
  try {
    await Promise.all(
      order.map(({ id, order }) =>
        StatCard.updateOne({ _id: id, athleteId: req.user!.userId }, { order })
      )
    )
    res.json({ success: true })
  } catch {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// PATCH /api/athlete/weight — increment/decrement weight by ±0.1
router.patch('/weight', async (req: AuthRequest, res: Response) => {
  const parsed = UpdateWeightSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() })
    return
  }

  try {
    const weightCard = await StatCard.findOne({
      athleteId: req.user!.userId,
      type: 'weight',
    })
    if (!weightCard) {
      res.status(404).json({ success: false, error: 'Weight card not found' })
      return
    }

    // Get last entry and adjust
    const last = await StatEntry.findOne({ cardId: weightCard._id }).sort({ recordedAt: -1 })
    const newValue = Math.round(((last?.value ?? 70) + parsed.data.delta) * 10) / 10

    const entry = await StatEntry.create({
      cardId: weightCard._id,
      athleteId: req.user!.userId,
      value: newValue,
    })

    res.json({ success: true, data: { value: newValue, entry } })
  } catch {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})


// PATCH /api/athlete/cards/:id — edit label and color
router.patch("/cards/:id", async (req: AuthRequest, res: Response) => {
  const { label, color, chartType } = req.body
  try {
    const card = await StatCard.findOneAndUpdate(
      { _id: req.params.id, athleteId: req.user!.userId },
      { ...(label ? { label } : {}), ...(color !== undefined ? { color } : {}), ...(chartType !== undefined ? { chartType } : {}) },
      { new: true }
    )
    if (!card) {
      res.status(404).json({ success: false, error: "Card not found" })
      return
    }
    res.json({ success: true, data: card })
  } catch {
    res.status(500).json({ success: false, error: "Server error" })
  }
})

export default router
