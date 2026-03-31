import { z } from 'zod'

// ─── Auth ────────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['athlete', 'coach']),
})

export const LoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>

// ─── User ────────────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  _id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['athlete', 'coach']),
  createdAt: z.string(),
})

export type User = z.infer<typeof UserSchema>

// ─── Stat card types ─────────────────────────────────────────────────────────

export const StatTypeSchema = z.enum([
  'heartrate',
  'calories',
  'weight',
  'steps',
  'sleep',
  'custom',
])

export type StatType = z.infer<typeof StatTypeSchema>

export const StatCardSchema = z.object({
  _id: z.string(),
  athleteId: z.string(),
  type: StatTypeSchema,
  label: z.string(),           // custom label (e.g. "Running", "Cycling")
  unit: z.string(),            // e.g. "bpm", "kcal", "kg", "min/km"
  visible: z.boolean().default(true),
  order: z.number().default(0),
  createdAt: z.string().optional(),
})

export type StatCard = z.infer<typeof StatCardSchema>

export const CreateStatCardSchema = z.object({
  type: StatTypeSchema,
  label: z.string().min(1, 'Label is required'),
  unit: z.string().min(1, 'Unit is required'),
})

export type CreateStatCardInput = z.infer<typeof CreateStatCardSchema>

// ─── Stat entries ─────────────────────────────────────────────────────────────

export const StatEntrySchema = z.object({
  _id: z.string(),
  cardId: z.string(),
  athleteId: z.string(),
  value: z.number(),
  secondaryValue: z.number().optional(), // e.g. time for pace calculation
  note: z.string().optional(),
  recordedAt: z.string(),
})

export type StatEntry = z.infer<typeof StatEntrySchema>

export const CreateStatEntrySchema = z.object({
  cardId: z.string(),
  value: z.number({ required_error: 'Value is required' }),
  secondaryValue: z.number().optional(),
  note: z.string().optional(),
  recordedAt: z.string().optional(),
})

export type CreateStatEntryInput = z.infer<typeof CreateStatEntrySchema>

// ─── Weight ───────────────────────────────────────────────────────────────────

export const UpdateWeightSchema = z.object({
  delta: z.number().refine(v => Math.abs(v) === 0.1, 'Delta must be ±0.1'),
})

export type UpdateWeightInput = z.infer<typeof UpdateWeightSchema>

// ─── Athlete / Coach relationship ─────────────────────────────────────────────

export const CoachAthleteSchema = z.object({
  _id: z.string(),
  coachId: z.string(),
  athleteId: z.string(),
  status: z.enum(['pending', 'active', 'revoked']),
  allowedMetrics: z.array(z.string()), // cardIds the coach can see
  createdAt: z.string(),
})

export type CoachAthlete = z.infer<typeof CoachAthleteSchema>

export const UpdatePermissionsSchema = z.object({
  allowedMetrics: z.array(z.string()),
})

export type UpdatePermissionsInput = z.infer<typeof UpdatePermissionsSchema>

// ─── Check-in ─────────────────────────────────────────────────────────────────

export const CheckInSchema = z.object({
  _id: z.string(),
  athleteId: z.string(),
  coachId: z.string(),
  notes: z.string().optional(),
  metrics: z.array(z.object({
    cardId: z.string(),
    label: z.string(),
    value: z.number(),
    unit: z.string(),
  })),
  createdAt: z.string(),
})

export type CheckIn = z.infer<typeof CheckInSchema>

// ─── Custom card (free card) ───────────────────────────────────────────────────

export const FreeCardEntrySchema = z.object({
  distance: z.number().min(0).optional(),  // km
  time: z.number().min(0).optional(),      // minutes
  note: z.string().optional(),
})

export type FreeCardEntry = z.infer<typeof FreeCardEntrySchema>

// ─── API response wrapper ──────────────────────────────────────────────────────

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    message: z.string().optional(),
    error: z.string().optional(),
  })
