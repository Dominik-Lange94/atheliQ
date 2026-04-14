import { Router, Response, Request } from "express";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import multer from "multer";

import { authenticate, AuthRequest } from "../middleware/auth";
import CoachAthlete from "../models/CoachAthlete";
import ChatThread from "../models/ChatThread";
import ChatMessage from "../models/ChatMessage";
import { SendChatMessageSchema } from "@shared/schemas";

const router = Router();
router.use(authenticate);

// ─────────────────────────────────────────────────────────────
// Upload setup
// ─────────────────────────────────────────────────────────────

const uploadDir = path.join(process.cwd(), "uploads", "chat");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const safeBaseName = file.originalname
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 80);

    const ext = path.extname(file.originalname).toLowerCase() || ".pdf";
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}-${safeBaseName}${ext}`;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Nur PDF-Dateien sind erlaubt"));
      return;
    }

    cb(null, true);
  },
});

type RelationStatus = "pending" | "active" | "revoked";

type ChatAttachment = {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
};

type SystemMessageMeta = {
  type:
    | "user"
    | "connect_request"
    | "connect_accepted"
    | "connect_declined"
    | "permission_update";
  actionRequired?: boolean;
  metricIds?: mongoose.Types.ObjectId[] | string[];
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function getAccessibleRelation(userId: string, threadId?: string) {
  if (!threadId || !mongoose.Types.ObjectId.isValid(threadId)) return null;

  const thread = await ChatThread.findById(threadId);
  if (!thread) return null;

  const isCoach = thread.coachId.toString() === userId;
  const isAthlete = thread.athleteId.toString() === userId;

  if (!isCoach && !isAthlete) return null;

  const relation = await CoachAthlete.findOne({
    _id: thread.relationId,
    status: { $in: ["pending", "active"] },
  });

  if (!relation) return null;

  return {
    thread,
    relation,
    isCoach,
    isAthlete,
    relationStatus: relation.status as RelationStatus,
  };
}

async function ensureThreadForRelation(relation: any) {
  if (!relation?.coachId || !relation?.athleteId || !relation?._id) {
    return null;
  }

  let thread = await ChatThread.findOne({ relationId: relation._id });

  if (!thread) {
    thread = await ChatThread.create({
      coachId: relation.coachId,
      athleteId: relation.athleteId,
      relationId: relation._id,
    });
  }

  return thread;
}

async function pushSystemMessage(params: {
  threadId: mongoose.Types.ObjectId | string;
  senderId: mongoose.Types.ObjectId | string;
  receiverId: mongoose.Types.ObjectId | string;
  text: string;
  attachments?: ChatAttachment[];
  meta: SystemMessageMeta;
}) {
  const message = await ChatMessage.create({
    threadId: params.threadId,
    senderId: params.senderId,
    receiverId: params.receiverId,
    text: params.text,
    attachments: params.attachments ?? [],
    meta: params.meta,
  });

  await ChatThread.findByIdAndUpdate(params.threadId, {
    lastMessage:
      params.text?.trim() ||
      (params.attachments?.length
        ? `📎 ${params.attachments[0].filename}`
        : ""),
    lastMessageAt: message.createdAt ?? new Date(),
  });

  return message;
}

// ─────────────────────────────────────────────────────────────
// POST /api/chat/uploads
// ─────────────────────────────────────────────────────────────

router.post("/uploads", (req: Request, res: Response) => {
  upload.single("file")(req, res, async (err: any) => {
    try {
      if (err) {
        res.status(400).json({
          success: false,
          error:
            err.message ||
            "Upload fehlgeschlagen. Bitte nur PDFs bis 5 MB hochladen.",
        });
        return;
      }

      const fileReq = req as Request & { file?: Express.Multer.File };

      if (!fileReq.file) {
        res.status(400).json({
          success: false,
          error: "Keine Datei hochgeladen",
        });
        return;
      }

      const fileUrl = `/uploads/chat/${fileReq.file.filename}`;

      res.status(201).json({
        success: true,
        data: {
          url: fileUrl,
          filename: fileReq.file.originalname,
          mimeType: fileReq.file.mimetype,
          size: fileReq.file.size,
        },
      });
    } catch (error) {
      console.error("chat upload error:", error);
      res.status(500).json({
        success: false,
        error: "Upload fehlgeschlagen",
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/chat/threads
// ─────────────────────────────────────────────────────────────

router.get("/threads", async (req: AuthRequest, res: Response) => {
  try {
    let relations;

    if (req.user!.role === "coach") {
      relations = await CoachAthlete.find({
        coachId: req.user!.userId,
        status: { $in: ["pending", "active"] },
      }).populate("athleteId", "name email role");
    } else {
      relations = await CoachAthlete.find({
        athleteId: req.user!.userId,
        status: { $in: ["pending", "active"] },
      }).populate("coachId", "name email role");
    }

    const validRelations = relations.filter((relation: any) => {
      if (req.user!.role === "coach") {
        return relation?.coachId && relation?.athleteId;
      }
      return relation?.athleteId && relation?.coachId;
    });

    const threadsRaw = await Promise.all(
      validRelations.map(async (relation: any) => {
        try {
          const thread = await ensureThreadForRelation(relation);
          if (!thread) return null;

          const unreadCount = await ChatMessage.countDocuments({
            threadId: thread._id,
            receiverId: req.user!.userId,
            readAt: null,
          });

          return {
            ...thread.toObject(),
            relationStatus: relation.status,
            unreadCount,
            otherUser:
              req.user!.role === "coach"
                ? relation.athleteId
                : relation.coachId,
          };
        } catch (innerError) {
          console.error(
            "Failed relation thread build:",
            relation?._id,
            innerError
          );
          return null;
        }
      })
    );

    const threads = threadsRaw.filter(Boolean) as any[];

    threads.sort((a, b) => {
      const statusScore = (status?: string) => {
        if (status === "pending") return 0;
        if (status === "active") return 1;
        return 2;
      };

      const aScore = statusScore(a.relationStatus);
      const bScore = statusScore(b.relationStatus);

      if (aScore !== bScore) return aScore - bScore;

      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });

    res.json({ success: true, data: threads });
  } catch (error) {
    console.error("chat threads error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/chat/threads/:threadId/messages
// ─────────────────────────────────────────────────────────────

router.get(
  "/threads/:threadId/messages",
  async (req: AuthRequest, res: Response) => {
    try {
      const access = await getAccessibleRelation(
        req.user!.userId,
        req.params.threadId
      );

      if (!access) {
        res.status(404).json({ success: false, error: "Thread not found" });
        return;
      }

      const messages = await ChatMessage.find({
        threadId: access.thread._id,
      }).sort({ createdAt: 1 });

      res.json({
        success: true,
        data: messages,
        meta: {
          relationStatus: access.relationStatus,
          isCoach: access.isCoach,
          isAthlete: access.isAthlete,
        },
      });
    } catch (error) {
      console.error("chat messages error:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// POST /api/chat/threads/:threadId/messages
// ─────────────────────────────────────────────────────────────

router.post(
  "/threads/:threadId/messages",
  async (req: AuthRequest, res: Response) => {
    const parsed = SendChatMessageSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    try {
      const access = await getAccessibleRelation(
        req.user!.userId,
        req.params.threadId
      );

      if (!access) {
        res.status(404).json({ success: false, error: "Thread not found" });
        return;
      }

      if (access.relationStatus !== "active") {
        res.status(403).json({
          success: false,
          error:
            "Normale Nachrichten sind erst nach akzeptierter Verbindung möglich",
        });
        return;
      }

      const receiverId = access.isCoach
        ? access.thread.athleteId.toString()
        : access.thread.coachId.toString();

      const text = (parsed.data.text ?? "").trim();

      const attachments = ((parsed.data as any).attachments ?? []).filter(
        (attachment: ChatAttachment) =>
          attachment.mimeType === "application/pdf" &&
          attachment.url.startsWith("/uploads/chat/") &&
          attachment.size <= 5 * 1024 * 1024
      ) as ChatAttachment[];

      if (!text && attachments.length === 0) {
        res.status(400).json({
          success: false,
          error: "Nachricht oder PDF ist erforderlich",
        });
        return;
      }

      const message = await ChatMessage.create({
        threadId: access.thread._id,
        senderId: req.user!.userId,
        receiverId,
        text,
        attachments,
        meta: {
          type: "user",
        },
      });

      access.thread.lastMessage =
        text || (attachments.length ? `📎 ${attachments[0].filename}` : "");
      access.thread.lastMessageAt = message.createdAt;
      await access.thread.save();

      res.status(201).json({ success: true, data: message });
    } catch (error) {
      console.error("send chat message error:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// POST /api/chat/threads/:threadId/accept
// ─────────────────────────────────────────────────────────────

router.post(
  "/threads/:threadId/accept",
  async (req: AuthRequest, res: Response) => {
    try {
      const access = await getAccessibleRelation(
        req.user!.userId,
        req.params.threadId
      );

      if (!access) {
        res.status(404).json({ success: false, error: "Thread not found" });
        return;
      }

      if (!access.isCoach) {
        res.status(403).json({
          success: false,
          error: "Nur Coaches können Anfragen akzeptieren",
        });
        return;
      }

      if (access.relationStatus !== "pending") {
        res.status(400).json({
          success: false,
          error: "Keine offene Anfrage vorhanden",
        });
        return;
      }

      access.relation.status = "active";
      await access.relation.save();

      const message = await pushSystemMessage({
        threadId: access.thread._id,
        senderId: access.thread.coachId,
        receiverId: access.thread.athleteId,
        text: "Coach hat deine Anfrage akzeptiert",
        meta: {
          type: "connect_accepted",
          actionRequired: false,
        },
      });

      res.json({
        success: true,
        data: {
          relation: access.relation,
          message,
        },
      });
    } catch (error) {
      console.error("accept chat request error:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// POST /api/chat/threads/:threadId/decline
// ─────────────────────────────────────────────────────────────

router.post(
  "/threads/:threadId/decline",
  async (req: AuthRequest, res: Response) => {
    try {
      const access = await getAccessibleRelation(
        req.user!.userId,
        req.params.threadId
      );

      if (!access) {
        res.status(404).json({ success: false, error: "Thread not found" });
        return;
      }

      if (!access.isCoach) {
        res.status(403).json({
          success: false,
          error: "Nur Coaches können Anfragen ablehnen",
        });
        return;
      }

      if (access.relationStatus !== "pending") {
        res.status(400).json({
          success: false,
          error: "Keine offene Anfrage vorhanden",
        });
        return;
      }

      access.relation.status = "revoked";
      await access.relation.save();

      const message = await pushSystemMessage({
        threadId: access.thread._id,
        senderId: access.thread.coachId,
        receiverId: access.thread.athleteId,
        text: "Coach hat deine Anfrage abgelehnt",
        meta: {
          type: "connect_declined",
          actionRequired: false,
        },
      });

      res.json({
        success: true,
        data: {
          relation: access.relation,
          message,
        },
      });
    } catch (error) {
      console.error("decline chat request error:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// POST /api/chat/threads/:threadId/read
// ─────────────────────────────────────────────────────────────

router.post(
  "/threads/:threadId/read",
  async (req: AuthRequest, res: Response) => {
    try {
      const access = await getAccessibleRelation(
        req.user!.userId,
        req.params.threadId
      );

      if (!access) {
        res.status(404).json({ success: false, error: "Thread not found" });
        return;
      }

      await ChatMessage.updateMany(
        {
          threadId: access.thread._id,
          receiverId: req.user!.userId,
          readAt: null,
        },
        {
          $set: { readAt: new Date() },
        }
      );

      res.json({ success: true, message: "Messages marked as read" });
    } catch (error) {
      console.error("read chat messages error:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

export default router;
