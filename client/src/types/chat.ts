export type ChatRelationStatus = "pending" | "active" | "revoked";

export type ChatMessageType =
  | "user"
  | "connect_request"
  | "connect_accepted"
  | "connect_declined"
  | "permission_update";

export interface ChatOtherUser {
  _id: string;
  name: string;
  email: string;
  role: "coach" | "athlete";
  avatarUrl?: string;
}

export interface ChatOtherUser {
  _id: string;
  name: string;
  email: string;
  role: "coach" | "athlete";
  avatarUrl?: string;
}

export interface ChatThread {
  _id: string;
  coachId: string;
  athleteId: string;
  relationId: string;
  relationStatus?: "pending" | "active" | "revoked";
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  createdAt?: string;
  updatedAt?: string;
  otherUser?: ChatOtherUser;
}

export interface ChatMessageMeta {
  type: ChatMessageType;
  actionRequired?: boolean;
  metricIds?: string[];
}

export interface ChatMessage {
  _id: string;
  threadId: string;
  senderId: string;
  receiverId: string;
  text: string;
  readAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  meta?: ChatMessageMeta;
}

export interface ChatMessagesResponseMeta {
  relationStatus: ChatRelationStatus;
  isCoach: boolean;
  isAthlete: boolean;
}
