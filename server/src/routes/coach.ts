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
      | "permission_update"
      | "goal_update";
    actionRequired?: boolean;
    metricIds?: mongoose.Types.ObjectId[] | string[];
    cardId?: mongoose.Types.ObjectId | string;
    goalEnabled?: boolean;
    goalValue?: number | null;
    goalDirection?: "lose" | "gain" | "min" | "max" | null;
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

// GET /api/coach/athletes
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

// GET /api/coach/athletes/:athleteId/stats?from=&to=&limit=
router.get(
  "/athletes/:athleteId/stats",
  requireRole("coach"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.athleteId)) {
        res.status(400).json({ success: false, error: "Invalid athlete id" });
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

      // Date range filter
      const { from, to } = req.query;
      const filter: any = {};
      if (from || to) {
        filter.recordedAt = {};
        if (from) filter.recordedAt.$gte = new Date(from as string);
        if (to) filter.recordedAt.$lte = new Date(to as string);
      }

      const limit = from || to ? 500 : 90;

      const stats = await Promise.all(
        cards.map(async (card) => {
          const entries = await StatEntry.find({ cardId: card._id, ...filter })
            .sort({ recordedAt: -1 })
            .limit(limit);
          return { card, entries: entries.reverse() };
        })
      );

      // Also compute whether athlete was active in the requested period
      // (has at least one entry across any card in range)
      let isActive: boolean | null = null;
      if (from || to) {
        const anyEntry = await StatEntry.findOne({
          cardId: { $in: cards.map((c) => c._id) },
          ...filter,
        });
        isActive = !!anyEntry;
      }

      res.json({ success: true, data: stats, isActive });
    } catch (error) {
      console.error("GET /api/coach/athletes/:athleteId/stats error:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

// PATCH /api/coach/athletes/:athleteId/cards/:cardId/goal
router.patch(
  "/athletes/:athleteId/cards/:cardId/goal",
  requireRole("coach"),
  async (req: AuthRequest, res: Response) => {
    try {
      const coachId = req.user!.userId;
      const athleteId = req.params.athleteId;
      const cardId = req.params.cardId;

      if (!mongoose.Types.ObjectId.isValid(athleteId)) {
        res.status(400).json({ success: false, error: "Invalid athlete id" });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(cardId)) {
        res.status(400).json({ success: false, error: "Invalid card id" });
        return;
      }

      const relation = await CoachAthlete.findOne({
        coachId,
        athleteId,
        status: "active",
      });

      if (!relation) {
        res.status(403).json({
          success: false,
          error: "No active relationship with this athlete",
        });
        return;
      }

      const isAllowedMetric = (relation.allowedMetrics ?? []).some(
        (id: any) => id.toString() === cardId
      );

      if (!isAllowedMetric) {
        res.status(403).json({
          success: false,
          error: "This metric is not shared with the coach",
        });
        return;
      }

      const {
        goalEnabled,
        goalValue,
        goalDirection,
      }: {
        goalEnabled?: boolean;
        goalValue?: number | null;
        goalDirection?: "lose" | "gain" | "min" | "max" | null;
      } = req.body ?? {};

      const update: Record<string, unknown> = {};

      if (typeof goalEnabled === "boolean") {
        update.goalEnabled = goalEnabled;
      }

      if (goalValue === null || goalValue === undefined || goalValue === "") {
        update.goalValue = null;
      } else {
        const parsedGoalValue = Number(goalValue);
        if (!Number.isFinite(parsedGoalValue)) {
          res.status(400).json({
            success: false,
            error: "Invalid goal value",
          });
          return;
        }
        update.goalValue = parsedGoalValue;
      }

      if (
        goalDirection === null ||
        goalDirection === undefined ||
        goalDirection === ""
      ) {
        update.goalDirection = null;
      } else if (
        goalDirection === "lose" ||
        goalDirection === "gain" ||
        goalDirection === "min" ||
        goalDirection === "max"
      ) {
        update.goalDirection = goalDirection;
      } else {
        res.status(400).json({
          success: false,
          error: "Invalid goal direction",
        });
        return;
      }

      // Wenn Goal deaktiviert wird, sauber resetten
      if (goalEnabled === false) {
        update.goalValue = null;
        update.goalDirection = null;
      }

      const card = await StatCard.findOneAndUpdate(
        {
          _id: cardId,
          athleteId,
        },
        { $set: update },
        { new: true }
      );

      if (!card) {
        res.status(404).json({ success: false, error: "Card not found" });
        return;
      }

      const thread = await ensureThreadForRelation(relation);

      const directionLabel =
        card.goalDirection === "lose"
          ? "Abnehmen"
          : card.goalDirection === "gain"
          ? "Zunehmen"
          : card.goalDirection === "max"
          ? "Obergrenze"
          : card.goalDirection === "min"
          ? "Mindestziel"
          : "Ziel";

      const messageText =
        card.goalEnabled && typeof card.goalValue === "number"
          ? `Coach-Ziel aktualisiert: ${card.label} → ${card.goalValue} ${card.unit} (${directionLabel})`
          : `Coach-Ziel entfernt: ${card.label}`;

      await pushSystemMessage({
        threadId: thread._id,
        senderId: coachId,
        receiverId: athleteId,
        text: messageText,
        meta: {
          type: "goal_update",
          metricIds: [new mongoose.Types.ObjectId(card._id)],
        },
      });

      res.json({
        success: true,
        data: card,
      });
    } catch (error) {
      console.error(
        "PATCH /api/coach/athletes/:athleteId/cards/:cardId/goal error:",
        error
      );
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

// GET /api/coach/athletes/activity?from=&to= — batch activity check for all athletes
router.get(
  "/athletes/activity",
  requireRole("coach"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { from, to } = req.query;
      if (!from && !to) {
        res.status(400).json({ success: false, error: "from or to required" });
        return;
      }

      const relations = await CoachAthlete.find({
        coachId: req.user!.userId,
        status: "active",
      }).populate("athleteId", "name email");

      const dateFilter: any = {};
      if (from) dateFilter.$gte = new Date(from as string);
      if (to) dateFilter.$lte = new Date(to as string);

      const result = await Promise.all(
        relations.map(async (rel: any) => {
          const cards = await StatCard.find({
            _id: { $in: rel.allowedMetrics },
            athleteId: rel.athleteId._id,
          }).select("_id");

          const anyEntry = await StatEntry.findOne({
            cardId: { $in: cards.map((c) => c._id) },
            recordedAt: dateFilter,
          });

          return {
            athleteId: rel.athleteId._id.toString(),
            isActive: !!anyEntry,
          };
        })
      );

      res.json({ success: true, data: result });
    } catch (error) {
      console.error("GET /api/coach/athletes/activity error:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

// GET /api/coach/search?email=...
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
      const coach = await User.findOne({ email, role: "coach" }).select(
        "_id name email role"
      );
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

      const coach = await User.findOne({ _id: coachId, role: "coach" }).select(
        "_id name email"
      );
      if (!coach) {
        res.status(404).json({ success: false, error: "Coach nicht gefunden" });
        return;
      }

      let relation = await CoachAthlete.findOne({ coachId, athleteId });
      if (relation) {
        if (relation.status === "active") {
          res
            .status(400)
            .json({ success: false, error: "Coach bereits verbunden" });
          return;
        }
        if (relation.status === "pending") {
          res
            .status(400)
            .json({ success: false, error: "Anfrage bereits gesendet" });
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
        meta: { type: "connect_request", actionRequired: true },
      });

      res.json({ success: true, data: { relation, threadId: thread._id } });
    } catch (error) {
      console.error("POST /api/coach/connect/:coachId error:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

// PATCH /api/coach/permissions/:coachId
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
        res
          .status(404)
          .json({ success: false, error: "Active relationship not found" });
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
        if (addedLabels.length)
          messageParts.push(`Freigegeben: ${addedLabels.join(", ")}`);
        if (removedLabels.length)
          messageParts.push(`Entfernt: ${removedLabels.join(", ")}`);
        const thread = await ensureThreadForRelation(relation);
        await pushSystemMessage({
          threadId: thread._id,
          senderId: athleteId,
          receiverId: coachId,
          text:
            messageParts.join(" • ") || "Metrik-Berechtigungen wurden geändert",
          meta: {
            type: "permission_update",
            metricIds: [...addedMetricIds, ...removedMetricIds].map(
              (id) => new mongoose.Types.ObjectId(id)
            ),
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

// DELETE /api/coach/disconnect/:coachId
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
        res
          .status(404)
          .json({ success: false, error: "Relationship not found" });
        return;
      }
      res.json({ success: true, message: "Coach disconnected" });
    } catch (error) {
      console.error("DELETE /api/coach/disconnect/:coachId error:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);

// GET /api/coach/my-coaches
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
