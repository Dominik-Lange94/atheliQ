import mongoose, { Schema, InferSchemaType } from "mongoose";

const WorkoutSchema = new Schema(
  {
    exerciseType: { type: String, default: "WORKOUT" },
    startTime: { type: Date },
    endTime: { type: Date },
    durationMinutes: { type: Number, default: 0 },
  },
  { _id: false }
);

const HealthSnapshotSchema = new Schema(
  {
    athleteId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      default: "health_connect",
    },
    steps: { type: Number, default: null },
    sleepMinutes: { type: Number, default: null },
    heartRateAvg: { type: Number, default: null },
    heartRateMin: { type: Number, default: null },
    heartRateMax: { type: Number, default: null },
    caloriesActive: { type: Number, default: null },
    caloriesTotal: { type: Number, default: null },
    distanceMeters: { type: Number, default: null },
    workouts: {
      type: [WorkoutSchema],
      default: [],
    },
    recordedAt: { type: Date, required: true },
    lastSyncedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

HealthSnapshotSchema.index({ athleteId: 1, dateKey: 1 }, { unique: true });

export type HealthSnapshotDocument = InferSchemaType<
  typeof HealthSnapshotSchema
>;
export default mongoose.model("HealthSnapshot", HealthSnapshotSchema);
