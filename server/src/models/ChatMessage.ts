import mongoose, { Schema, Document } from "mongoose";

export type ChatMessageType =
  | "user"
  | "connect_request"
  | "connect_accepted"
  | "connect_declined"
  | "permission_update";

export interface IChatAttachment {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface IChatMessageMeta {
  type: ChatMessageType;
  actionRequired?: boolean;
  metricIds?: mongoose.Types.ObjectId[];
}

export interface IChatMessage extends Document {
  threadId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  text: string;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  meta: IChatMessageMeta;
  attachments: IChatAttachment[];
}

const ChatAttachmentSchema = new Schema<IChatAttachment>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    threadId: {
      type: Schema.Types.ObjectId,
      ref: "ChatThread",
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    readAt: {
      type: Date,
      default: null,
    },
    attachments: {
      type: [ChatAttachmentSchema],
      default: [],
    },
    meta: {
      type: {
        type: String,
        enum: [
          "user",
          "connect_request",
          "connect_accepted",
          "connect_declined",
          "permission_update",
          "goal_update",
        ],
        default: "user",
        required: true,
      },
      actionRequired: {
        type: Boolean,
        default: false,
      },
      metricIds: [
        {
          type: Schema.Types.ObjectId,
          ref: "StatCard",
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

ChatMessageSchema.index({ threadId: 1, createdAt: 1 });
ChatMessageSchema.index({ receiverId: 1, readAt: 1, createdAt: -1 });

export default mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
