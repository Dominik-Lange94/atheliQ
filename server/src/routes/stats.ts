import { Router, Response } from "express";
import mongoose from "mongoose";
import { authenticate, AuthRequest } from "../middleware/auth";
import { CreateStatEntrySchema } from "@shared/schemas";
import StatEntry from "../models/StatEntry";
import StatCard from "../models/StatCard";
import CoachAthlete from "../models/CoachAthlete";

const router = Router();
router.use(authenticate);

function toObjectId(id: string) {
  return new mongoose.Types.ObjectId(id);
}

function isValidObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

function normalizeDateRange(dateStr: string) {
  const start = new Date(dateStr);
  if (Number.isNaN(start.getTime())) return null;

  start.setHours(0, 0, 0, 0);

  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// POST /api/stats/entries
router.post("/entries", async (req: AuthRequest, res: Response) => {
  const parsed = CreateStatEntrySchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  try {
    const athleteId = toObjectId(req.user!.userId);

    const card = await StatCard.findOne({
      _id: parsed.data.cardId,
      athleteId,
    });

    if (!card) {
      res.status(404).json({ success: false, error: "Card not found" });
      return;
    }

    const entry = await StatEntry.create({
      ...parsed.data,
      athleteId,
      recordedAt: parsed.data.recordedAt ?? new Date(),
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error("POST /api/stats/entries error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/stats/entries/:id
router.delete("/entries/:id", async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, error: "Invalid entry id" });
      return;
    }

    const athleteId = toObjectId(req.user!.userId);

    const entry = await StatEntry.findOneAndDelete({
      _id: req.params.id,
      athleteId,
    });

    if (!entry) {
      res.status(404).json({ success: false, error: "Entry not found" });
      return;
    }

    res.json({ success: true, message: "Entry deleted" });
  } catch (error) {
    console.error("DELETE /api/stats/entries/:id error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/stats/latest
router.get("/latest", async (req: AuthRequest, res: Response) => {
  try {
    const athleteId = toObjectId(req.user!.userId);

    const cards = await StatCard.find({ athleteId }).sort({ order: 1 });

    const latest = await Promise.all(
      cards.map(async (card) => {
        const entry = await StatEntry.findOne({
          cardId: card._id,
          athleteId,
        })
          .sort({ recordedAt: -1, createdAt: -1 })
          .select("value secondaryValue recordedAt cardId athleteId");

        return {
          card,
          latest: entry ?? null,
        };
      })
    );

    res.json({ success: true, data: latest });
  } catch (error) {
    console.error("GET /api/stats/latest error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/stats/day?date=2024-01-15
router.get("/day", async (req: AuthRequest, res: Response) => {
  const dateStr = req.query.date as string;

  if (!dateStr) {
    res.status(400).json({ success: false, error: "date required" });
    return;
  }

  const range = normalizeDateRange(dateStr);
  if (!range) {
    res.status(400).json({ success: false, error: "invalid date" });
    return;
  }

  try {
    const athleteId = toObjectId(req.user!.userId);

    const cards = await StatCard.find({ athleteId }).sort({ order: 1 });

    const result = await Promise.all(
      cards.map(async (card) => {
        const entry = await StatEntry.findOne({
          cardId: card._id,
          athleteId,
          recordedAt: { $gte: range.start, $lte: range.end },
        }).sort({ recordedAt: -1, createdAt: -1 });

        return {
          card,
          entry: entry ?? null,
        };
      })
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("GET /api/stats/day error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/stats/entries/:cardId?from=...&to=...
router.get("/entries/:cardId", async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.cardId)) {
      res.status(400).json({ success: false, error: "Invalid card id" });
      return;
    }

    const currentUserId = req.user!.userId;
    const currentUserObjectId = toObjectId(currentUserId);

    const card = await StatCard.findById(req.params.cardId);

    if (!card) {
      res.status(404).json({ success: false, error: "Card not found" });
      return;
    }

    if (req.user!.role === "coach") {
      const relation = await CoachAthlete.findOne({
        coachId: currentUserObjectId,
        athleteId: card.athleteId,
        status: "active",
        allowedMetrics: card._id,
      });

      if (!relation) {
        res.status(403).json({ success: false, error: "Access not granted" });
        return;
      }
    } else if (card.athleteId.toString() !== currentUserId) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    const { from, to } = req.query;

    const filter: any = {
      cardId: card._id,
      athleteId: card.athleteId,
    };

    if (from || to) {
      filter.recordedAt = {};
      if (from) {
        const fromDate = new Date(from as string);
        if (!Number.isNaN(fromDate.getTime())) {
          filter.recordedAt.$gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to as string);
        if (!Number.isNaN(toDate.getTime())) {
          filter.recordedAt.$lte = toDate;
        }
      }

      if (Object.keys(filter.recordedAt).length === 0) {
        delete filter.recordedAt;
      }
    }

    const limit = from || to ? 500 : 90;

    const entries = await StatEntry.find(filter)
      .sort({ recordedAt: -1, createdAt: -1 })
      .limit(limit);

    res.json({ success: true, data: entries.reverse() });
  } catch (error) {
    console.error("GET /api/stats/entries/:cardId error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
