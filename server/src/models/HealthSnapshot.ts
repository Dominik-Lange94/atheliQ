import mongoose, { Schema, InferSchemaType } from "mongoose";

const WorkoutSchema = new Schema(
  {
    exerciseType: {
      type: String,
      default: "WORKOUT",
      trim: true,
      maxlength: 100,
    },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    durationMinutes: { type: Number, default: 0, min: 0 },
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
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    source: {
      type: String,
      required: true,
      enum: ["health_connect"],
      default: "health_connect",
    },

    steps: { type: Number, default: null, min: 0 },
    sleepMinutes: { type: Number, default: null, min: 0 },
    heartRateAvg: { type: Number, default: null, min: 0 },
    heartRateMin: { type: Number, default: null, min: 0 },
    heartRateMax: { type: Number, default: null, min: 0 },
    caloriesActive: { type: Number, default: null, min: 0 },
    caloriesTotal: { type: Number, default: null, min: 0 },
    distanceMeters: { type: Number, default: null, min: 0 },

    workouts: {
      type: [WorkoutSchema],
      default: [],
    },

    sourceCapturedAt: {
      type: Date,
      required: true,
    },
    lastSyncedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    isTodayPreview: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

HealthSnapshotSchema.index({ athleteId: 1, dateKey: 1 }, { unique: true });

export type HealthSnapshotDocument = InferSchemaType<
  typeof HealthSnapshotSchema
>;
export default mongoose.model("HealthSnapshot", HealthSnapshotSchema);
