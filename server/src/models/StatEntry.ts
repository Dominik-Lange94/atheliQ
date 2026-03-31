import mongoose, { Schema, Document } from 'mongoose'

export interface IStatEntry extends Document {
  cardId: mongoose.Types.ObjectId
  athleteId: mongoose.Types.ObjectId
  value: number
  secondaryValue?: number  // e.g. time in minutes (for pace = value/secondaryValue)
  note?: string
  recordedAt: Date
}

const StatEntrySchema = new Schema<IStatEntry>(
  {
    cardId: { type: Schema.Types.ObjectId, ref: 'StatCard', required: true },
    athleteId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    value: { type: Number, required: true },
    secondaryValue: { type: Number },
    note: { type: String },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

// Index for fast athlete+card queries
StatEntrySchema.index({ athleteId: 1, cardId: 1, recordedAt: -1 })

export default mongoose.model<IStatEntry>('StatEntry', StatEntrySchema)
