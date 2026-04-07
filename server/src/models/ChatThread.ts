import mongoose, { Schema, Document } from "mongoose";

export interface IChatThread extends Document {
  coachId: mongoose.Types.ObjectId;
  athleteId: mongoose.Types.ObjectId;
  relationId: mongoose.Types.ObjectId;
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChatThreadSchema = new Schema<IChatThread>(
  {
    coachId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    athleteId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    relationId: {
      type: Schema.Types.ObjectId,
      ref: "CoachAthlete",
      required: true,
      unique: true,
      index: true,
    },
    lastMessage: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    lastMessageAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

ChatThreadSchema.index({ coachId: 1, athleteId: 1 }, { unique: true });

export default mongoose.model<IChatThread>("ChatThread", ChatThreadSchema);
