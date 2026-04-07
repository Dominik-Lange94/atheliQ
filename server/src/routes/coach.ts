import { Router, Response } from "express";
import mongoose from "mongoose";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import { UpdatePermissionsSchema } from "@shared/schemas";
import CoachAthlete from "../models/CoachAthlete";
import User from "../models/User";
import StatCard from "../models/StatCard";
import StatEntry from "../models/StatEntry";
import ChatThread from "../models/ChatThread";
import ChatMessage from "../models/ChatMessage";

const router = Router();
router.use(authenticate);

async function ensureThreadForRelation(relation: {
  _id: mongoose.Types.ObjectId | string;
  coachId: mongoose.Types.ObjectId | string;
  athleteId: mongoose.Types.ObjectId | string;
}) {
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
  meta: {
    type:
      | "user"
      | "connect_request"
      | "connect_accepted"
      | "connect_declined"
      | "permission_update";
    actionRequired?: boolean;
    metricIds?: mongoose.Types.ObjectId[] | string[];
  };
}) {
  const message = await ChatMessage.create({
    threadId: params.threadId,
    senderId: params.senderId,
    receiverId: params.receiverId,
    text: params.text,
    meta: params.meta,
  });

  await ChatThread.findByIdAndUpdate(params.threadId, {
    lastMessage: params.text,
    lastMessageAt: message.createdAt ?? new Date(),
  });

  return message;
}

// GET /api/coach/athletes — list all athletes linked to this coach
router.get(
  "/athletes",
  requireRole("coach"),
  async (req: AuthRequest, res: Response) => {
    try {
      const relations = await CoachAthlete.find({
        coachId: req.user!.userId,
        status: "active",
      }).populate("athleteId", "name email");

      res.json({ success: true, data: relations });
    } catch (error) {
      console.error("GET /api/coach/athletes error:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

// GET /api/coach/athletes/:athleteId/stats — get permitted stats for an athlete
router.get(
  "/athletes/:athleteId/stats",
  requireRole("coach"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.athleteId)) {
        res.status(400).json({
          success: false,
          error: "Invalid athlete id",
        });
        return;
      }

      const relation = await CoachAthlete.findOne({
        coachId: req.user!.userId,
        athleteId: req.params.athleteId,
        status: "active",
      });

      if (!relation) {
        res.status(403).json({
          success: false,
          error: "No active relationship with this athlete",
        });
        return;
      }

      const cards = await StatCard.find({
        _id: { $in: relation.allowedMetrics },
        athleteId: req.params.athleteId,
      }).sort({ order: 1 });

      const stats = await Promise.all(
        cards.map(async (card) => {
          const entries = await StatEntry.find({ cardId: card._id })
            .sort({ recordedAt: -1 })
            .limit(30);

          return {
            card,
            entries: entries.reverse(),
          };
        })
      );

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error("GET /api/coach/athletes/:athleteId/stats error:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

// GET /api/coach/search?email=... — athlete searches for a coach by email
router.get(
  "/search",
  requireRole("athlete"),
  async (req: AuthRequest, res: Response) => {
    const email = String(req.query.email ?? "")
      .trim()
      .toLowerCase();

    if (!email) {
      res.status(400).json({ success: false, error: "Email required" });
      return;
    }

    try {
      const coach = await User.findOne({
        email,
        role: "coach",
      }).select("_id name email role");

      if (!coach) {
        res.status(404).json({
          success: false,
          error: "Kein Coach mit dieser Email gefunden",
        });
        return;
      }

      if (coach._id.toString() === req.user!.userId) {
        res.status(400).json({
          success: false,
          error: "Du kannst dich nicht selbst als Coach hinzufügen",
        });
        return;
      }

      res.json({ success: true, data: coach });
    } catch (error) {
      console.error("GET /api/coach/search error:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

// POST /api/coach/connect/:coachId
router.post(
  "/connect/:coachId",
  requireRole("athlete"),
  async (req: AuthRequest, res: Response) => {
    try {
      const athleteId = req.user!.userId;
      const coachId = req.params.coachId;

      if (!mongoose.Types.ObjectId.isValid(coachId)) {
        res.status(400).json({ success: false, error: "Invalid coach id" });
        return;
      }

      if (athleteId === coachId) {
        res.status(400).json({
          success: false,
          error: "Du kannst dich nicht selbst verbinden",
        });
        return;
      }

      const coach = await User.findOne({
        _id: coachId,
        role: "coach",
      }).select("_id name email");

      if (!coach) {
        res.status(404).json({
          success: false,
          error: "Coach nicht gefunden",
        });
        return;
      }

      let relation = await CoachAthlete.findOne({ coachId, athleteId });

      if (relation) {
        if (relation.status === "active") {
          res.status(400).json({
            success: false,
            error: "Coach bereits verbunden",
          });
          return;
        }

        if (relation.status === "pending") {
          res.status(400).json({
            success: false,
            error: "Anfrage bereits gesendet",
          });
          return;
        }

        relation.status = "pending";
        relation.allowedMetrics = [];
        await relation.save();
      } else {
        relation = await CoachAthlete.create({
          coachId,
          athleteId,
          status: "pending",
          allowedMetrics: [],
        });
      }

      const thread = await ensureThreadForRelation(relation);

      await pushSystemMessage({
        threadId: thread._id,
        senderId: athleteId,
        receiverId: coachId,
        text: "Verbindungsanfrage gesendet",
        meta: {
          type: "connect_request",
          actionRequired: true,
        },
      });

      res.json({
        success: true,
        data: {
          relation,
          threadId: thread._id,
        },
      });
    } catch (error) {
      console.error("POST /api/coach/connect/:coachId error:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

// PATCH /api/coach/permissions/:coachId — athlete updates what a coach can see
router.patch(
  "/permissions/:coachId",
  requireRole("athlete"),
  async (req: AuthRequest, res: Response) => {
    const parsed = UpdatePermissionsSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    try {
      const coachId = req.params.coachId;
      const athleteId = req.user!.userId;

      if (!mongoose.Types.ObjectId.isValid(coachId)) {
        res.status(400).json({ success: false, error: "Invalid coach id" });
        return;
      }

      const relation = await CoachAthlete.findOne({
        coachId,
        athleteId,
        status: "active",
      });

      if (!relation) {
        res.status(404).json({
          success: false,
          error: "Active relationship not found",
        });
        return;
      }

      const previousMetricIds = (relation.allowedMetrics ?? []).map((id: any) =>
        id.toString()
      );
      const nextMetricIds = parsed.data.allowedMetrics.map((id) =>
        id.toString()
      );

      relation.allowedMetrics = parsed.data.allowedMetrics as any;
      await relation.save();

      const addedMetricIds = nextMetricIds.filter(
        (id) => !previousMetricIds.includes(id)
      );
      const removedMetricIds = previousMetricIds.filter(
        (id) => !nextMetricIds.includes(id)
      );

      if (addedMetricIds.length || removedMetricIds.length) {
        const changedCards = await StatCard.find({
          _id: { $in: [...addedMetricIds, ...removedMetricIds] },
          athleteId,
        }).select("_id label");

        const labelMap = new Map(
          changedCards.map((card: any) => [card._id.toString(), card.label])
        );

        const addedLabels = addedMetricIds
          .map((id) => labelMap.get(id))
          .filter(Boolean) as string[];

        const removedLabels = removedMetricIds
          .map((id) => labelMap.get(id))
          .filter(Boolean) as string[];

        const messageParts: string[] = [];

        if (addedLabels.length) {
          messageParts.push(`Freigegeben: ${addedLabels.join(", ")}`);
        }

        if (removedLabels.length) {
          messageParts.push(`Entfernt: ${removedLabels.join(", ")}`);
        }

        const thread = await ensureThreadForRelation(relation);

        await pushSystemMessage({
          threadId: thread._id,
          senderId: athleteId,
          receiverId: coachId,
          text:
            messageParts.join(" • ") || "Metrik-Berechtigungen wurden geändert",
          meta: {
            type: "permission_update",
            metricIds: [
              ...addedMetricIds.map((id) => new mongoose.Types.ObjectId(id)),
              ...removedMetricIds.map((id) => new mongoose.Types.ObjectId(id)),
            ],
          },
        });
      }

      res.json({ success: true, data: relation });
    } catch (error) {
      console.error("PATCH /api/coach/permissions/:coachId error:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

// DELETE /api/coach/disconnect/:coachId — athlete removes a coach
router.delete(
  "/disconnect/:coachId",
  requireRole("athlete"),
  async (req: AuthRequest, res: Response) => {
    try {
      const coachId = req.params.coachId;
      const athleteId = req.user!.userId;

      if (!mongoose.Types.ObjectId.isValid(coachId)) {
        res.status(400).json({ success: false, error: "Invalid coach id" });
        return;
      }

      const relation = await CoachAthlete.findOneAndUpdate(
        { coachId, athleteId },
        { status: "revoked", allowedMetrics: [] },
        { new: true }
      );

      if (!relation) {
        res.status(404).json({
          success: false,
          error: "Relationship not found",
        });
        return;
      }

      res.json({ success: true, message: "Coach disconnected" });
    } catch (error) {
      console.error("DELETE /api/coach/disconnect/:coachId error:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

// GET /api/coach/my-coaches — athlete sees pending + active coaches
router.get(
  "/my-coaches",
  requireRole("athlete"),
  async (req: AuthRequest, res: Response) => {
    try {
      const relations = await CoachAthlete.find({
        athleteId: req.user!.userId,
        status: { $in: ["pending", "active"] },
      })
        .populate("coachId", "name email")
        .sort({ updatedAt: -1 });

      res.json({ success: true, data: relations });
    } catch (error) {
      console.error("GET /api/coach/my-coaches error:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

export default router;
