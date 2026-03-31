import mongoose, { Schema, Document } from 'mongoose'

export interface IStatCard extends Document {
  athleteId: mongoose.Types.ObjectId
  type: 'heartrate' | 'calories' | 'weight' | 'steps' | 'sleep' | 'custom'
  label: string
  unit: string
  color?: string
  visible: boolean
  order: number
  createdAt: Date
}

const StatCardSchema = new Schema<IStatCard>(
  {
    athleteId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['heartrate', 'calories', 'weight', 'steps', 'sleep', 'custom'],
      required: true,
    },
    label: { type: String, required: true },
    unit: { type: String, required: true },
    color: { type: String, default: null },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export default mongoose.model<IStatCard>('StatCard', StatCardSchema)
