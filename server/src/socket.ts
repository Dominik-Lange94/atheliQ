import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import ChatThread from "./models/ChatThread";
import ChatMessage from "./models/ChatMessage";
import CoachAthlete from "./models/CoachAthlete";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

type SocketUser = {
  userId: string;
  role: "coach" | "athlete";
};

export function initSocket(io: SocketIOServer) {
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) return next(new Error("Unauthorized"));

      const decoded = jwt.verify(token, JWT_SECRET) as SocketUser;
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = (socket as any).user as SocketUser;

    socket.on("chat:join", async ({ threadId }) => {
      const thread = await ChatThread.findById(threadId);
      if (!thread) return;

      const isMember =
        thread.coachId.toString() === user.userId ||
        thread.athleteId.toString() === user.userId;

      if (!isMember) return;

      const relation = await CoachAthlete.findOne({
        _id: thread.relationId,
        status: "active",
      });

      if (!relation) return;

      socket.join(`thread:${threadId}`);
    });

    socket.on("chat:message:send", async ({ threadId, text }) => {
      if (!text || typeof text !== "string" || !text.trim()) return;

      const thread = await ChatThread.findById(threadId);
      if (!thread) return;

      const isCoach = thread.coachId.toString() === user.userId;
      const isAthlete = thread.athleteId.toString() === user.userId;

      if (!isCoach && !isAthlete) return;

      const relation = await CoachAthlete.findOne({
        _id: thread.relationId,
        status: "active",
      });

      if (!relation) return;

      const receiverId = isCoach
        ? thread.athleteId.toString()
        : thread.coachId.toString();

      const message = await ChatMessage.create({
        threadId: thread._id,
        senderId: user.userId,
        receiverId,
        text: text.trim(),
      });

      thread.lastMessage = message.text;
      thread.lastMessageAt = message.createdAt;
      await thread.save();

      io.to(`thread:${threadId}`).emit("chat:message:new", {
        success: true,
        data: message,
      });
    });

    socket.on("chat:read", async ({ threadId }) => {
      const thread = await ChatThread.findById(threadId);
      if (!thread) return;

      const isMember =
        thread.coachId.toString() === user.userId ||
        thread.athleteId.toString() === user.userId;

      if (!isMember) return;

      await ChatMessage.updateMany(
        {
          threadId,
          receiverId: user.userId,
          readAt: null,
        },
        {
          $set: { readAt: new Date() },
        }
      );

      io.to(`thread:${threadId}`).emit("chat:read:update", {
        threadId,
        userId: user.userId,
      });
    });
  });
}
