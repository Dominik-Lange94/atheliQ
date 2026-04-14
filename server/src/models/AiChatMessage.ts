import mongoose, { Schema, InferSchemaType } from "mongoose";

const AiChatMessageSchema = new Schema(
  {
    athleteId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
    meta: {
      provider: { type: String, default: "ollama" },
      model: { type: String, default: "" },
      kind: {
        type: String,
        enum: [
          "chat",
          "motivation",
          "insight",
          "daily_review",
          "progress_review",
          "long_term_review",
          "goal_review",
          "consistency_review",
          "general",
        ],
        default: "chat",
      },
      isOnboardingWelcome: {
        type: Boolean,
        default: false,
        index: true,
      },
    },
  },
  { timestamps: true }
);

AiChatMessageSchema.index({ athleteId: 1, createdAt: -1 });
AiChatMessageSchema.index({
  athleteId: 1,
  role: 1,
  readAt: 1,
  "meta.kind": 1,
  "meta.isOnboardingWelcome": 1,
});

export type AiChatMessageDoc = InferSchemaType<typeof AiChatMessageSchema>;

export default mongoose.model("AiChatMessage", AiChatMessageSchema);
