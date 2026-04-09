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
    meta: {
      provider: { type: String, default: "ollama" },
      model: { type: String, default: "" },
      kind: {
        type: String,
        enum: ["chat", "motivation", "insight"],
        default: "chat",
      },
    },
  },
  { timestamps: true }
);

AiChatMessageSchema.index({ athleteId: 1, createdAt: -1 });

export type AiChatMessageDoc = InferSchemaType<typeof AiChatMessageSchema>;

export default mongoose.model("AiChatMessage", AiChatMessageSchema);
