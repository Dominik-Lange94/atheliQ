import { Router, Response } from 'express'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { CreateStatCardSchema } from '@shared/schemas'
import StatCard from '../models/StatCard'
import StatEntry from '../models/StatEntry'

const router = Router()
router.use(authenticate, requireRole('athlete'))

// GET /api/athlete/cards
router.get('/cards', async (req: AuthRequest, res: Response) => {
  try {
    const cards = await StatCard.find({ athleteId: req.user!.userId }).sort({ order: 1 })
    res.json({ success: true, data: cards })
  } catch {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// POST /api/athlete/cards
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

// DELETE /api/athlete/cards/:id
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
    await StatEntry.deleteMany({ cardId: req.params.id })
    res.json({ success: true, message: 'Card removed' })
  } catch {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// PATCH /api/athlete/cards/reorder
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

// PATCH /api/athlete/weight — date-aware weight update
router.patch('/weight', async (req: AuthRequest, res: Response) => {
  const { delta, date } = req.body
  if (typeof delta !== 'number') {
    res.status(400).json({ success: false, error: 'delta required' })
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

    // Use provided date or today, set to noon to avoid timezone issues
    const targetDate = date
      ? new Date(date + 'T12:00:00')
      : new Date()

    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)

    // Check if entry already exists for this specific day
    const existingToday = await StatEntry.findOne({
      cardId: weightCard._id,
      athleteId: req.user!.userId,
      recordedAt: { $gte: dayStart, $lte: dayEnd },
    }).sort({ recordedAt: -1 })

    let newValue: number

    if (existingToday) {
      // Update the existing day's entry in place
      newValue = Math.round((existingToday.value + delta) * 10) / 10
      existingToday.value = newValue
      await existingToday.save()
      res.json({ success: true, data: { value: newValue, entry: existingToday } })
    } else {
      // No entry for this day — find last known value as base (before this day)
      const lastBefore = await StatEntry.findOne({
        cardId: weightCard._id,
        athleteId: req.user!.userId,
        recordedAt: { $lt: dayStart },
      }).sort({ recordedAt: -1 })

      newValue = Math.round(((lastBefore?.value ?? 70) + delta) * 10) / 10

      const entry = await StatEntry.create({
        cardId: weightCard._id,
        athleteId: req.user!.userId,
        value: newValue,
        recordedAt: targetDate,
      })
      res.json({ success: true, data: { value: newValue, entry } })
    }
  } catch {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// PATCH /api/athlete/cards/:id — edit label, color, chartType
router.patch('/cards/:id', async (req: AuthRequest, res: Response) => {
  const { label, color, chartType } = req.body
  try {
    const card = await StatCard.findOneAndUpdate(
      { _id: req.params.id, athleteId: req.user!.userId },
      {
        ...(label      ? { label }      : {}),
        ...(color      !== undefined ? { color }     : {}),
        ...(chartType  !== undefined ? { chartType } : {}),
      },
      { new: true }
    )
    if (!card) {
      res.status(404).json({ success: false, error: 'Card not found' })
      return
    }
    res.json({ success: true, data: card })
  } catch {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

export default router
