import mongoose, { Schema, InferSchemaType } from "mongoose";
import crypto from "crypto";

const MobileLoginTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

MobileLoginTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type MobileLoginTokenDocument = InferSchemaType<
  typeof MobileLoginTokenSchema
>;

export const hashMobileToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export default mongoose.model("MobileLoginToken", MobileLoginTokenSchema);
