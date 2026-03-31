import mongoose, { Schema, Document } from 'mongoose'

export interface ICoachAthlete extends Document {
  coachId: mongoose.Types.ObjectId
  athleteId: mongoose.Types.ObjectId
  status: 'pending' | 'active' | 'revoked'
  allowedMetrics: mongoose.Types.ObjectId[]  // cardIds the coach can see
  createdAt: Date
}

const CoachAthleteSchema = new Schema<ICoachAthlete>(
  {
    coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    athleteId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'active', 'revoked'], default: 'pending' },
    allowedMetrics: [{ type: Schema.Types.ObjectId, ref: 'StatCard' }],
  },
  { timestamps: true }
)

CoachAthleteSchema.index({ coachId: 1, athleteId: 1 }, { unique: true })

export default mongoose.model<ICoachAthlete>('CoachAthlete', CoachAthleteSchema)
