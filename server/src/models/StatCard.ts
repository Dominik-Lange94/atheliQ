import mongoose, { Schema, Document } from "mongoose";

export interface IStatCard extends Document {
  athleteId: mongoose.Types.ObjectId;
  type: "heartrate" | "calories" | "weight" | "steps" | "sleep" | "custom";
  label: string;
  unit: string;
  color?: string;
  chartType?: "line" | "bar" | "mixed";
  visible: boolean;
  order: number;

  goalEnabled?: boolean;
  goalValue?: number | null;
  goalDirection?: "lose" | "gain" | "min" | "max" | null;

  createdAt: Date;
}

const StatCardSchema = new Schema<IStatCard>(
  {
    athleteId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["heartrate", "calories", "weight", "steps", "sleep", "custom"],
      required: true,
    },
    label: { type: String, required: true },
    unit: { type: String, required: true },
    color: { type: String, default: null },
    chartType: {
      type: String,
      enum: ["line", "bar", "mixed"],
      default: "line",
    },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },

    goalEnabled: { type: Boolean, default: false },
    goalValue: { type: Number, default: null },
    goalDirection: {
      type: String,
      enum: ["lose", "gain", "min", "max", null],
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IStatCard>("StatCard", StatCardSchema);
