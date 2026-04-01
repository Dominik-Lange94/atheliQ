import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { CreateStatEntrySchema } from "@shared/schemas";
import StatEntry from "../models/StatEntry";
import StatCard from "../models/StatCard";
import CoachAthlete from "../models/CoachAthlete";
import HealthSnapshot from "../models/HealthSnapshot";

const router = Router();
router.use(authenticate);

type HealthSyncBody = {
  steps?: number | null;
  sleepMinutes?: number | null;
  heartRateAvg?: number | null;
  heartRateMin?: number | null;
  heartRateMax?: number | null;
  caloriesActive?: number | null;
  caloriesTotal?: number | null;
  distanceMeters?: number | null;
  workouts?: Array<{
    exerciseType?: string;
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
  }>;
  recordedAt?: string;
};

type SanitizedWorkout = {
  exerciseType: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const dateKeyFromDate = (date: Date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const sanitizeWorkout = (workout: {
  exerciseType?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
}): SanitizedWorkout | null => {
  if (!workout?.startTime || !workout?.endTime) return null;

  const start = new Date(workout.startTime);
  const end = new Date(workout.endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const fallbackMinutes = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60000)
  );

  return {
    exerciseType:
      typeof workout.exerciseType === "string" && workout.exerciseType.trim()
        ? workout.exerciseType.trim()
        : "WORKOUT",
    startTime: start,
    endTime: end,
    durationMinutes:
      isFiniteNumber(workout.durationMinutes) && workout.durationMinutes >= 0
        ? Math.round(workout.durationMinutes)
        : fallbackMinutes,
  };
};

// POST /api/stats/health-sync
router.post("/health-sync", async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== "athlete") {
    res
      .status(403)
      .json({ success: false, error: "Only athletes can sync health data" });
    return;
  }

  const body = (req.body ?? {}) as HealthSyncBody;
  const athleteId = req.user.userId;
  const recordedAt = body.recordedAt ? new Date(body.recordedAt) : new Date();

  if (Number.isNaN(recordedAt.getTime())) {
    res.status(400).json({ success: false, error: "Invalid recordedAt date" });
    return;
  }

  try {
    const dateKey = dateKeyFromDate(recordedAt);
    const saved: string[] = [];

    const update: Record<string, unknown> = {
      athleteId,
      dateKey,
      source: "health_connect",
      recordedAt,
      lastSyncedAt: new Date(),
    };

    if (isFiniteNumber(body.steps)) {
      update.steps = Math.round(body.steps);
      saved.push("steps");
    }

    if (isFiniteNumber(body.sleepMinutes)) {
      update.sleepMinutes = Math.round(body.sleepMinutes);
      saved.push("sleepMinutes");
    }

    if (isFiniteNumber(body.heartRateAvg)) {
      update.heartRateAvg = Math.round(body.heartRateAvg);
      saved.push("heartRateAvg");
    }

    if (isFiniteNumber(body.heartRateMin)) {
      update.heartRateMin = Math.round(body.heartRateMin);
      saved.push("heartRateMin");
    }

    if (isFiniteNumber(body.heartRateMax)) {
      update.heartRateMax = Math.round(body.heartRateMax);
      saved.push("heartRateMax");
    }

    if (isFiniteNumber(body.caloriesActive)) {
      update.caloriesActive = Math.round(body.caloriesActive);
      saved.push("caloriesActive");
    }

    if (isFiniteNumber(body.caloriesTotal)) {
      update.caloriesTotal = Math.round(body.caloriesTotal);
      saved.push("caloriesTotal");
    }

    if (isFiniteNumber(body.distanceMeters)) {
      update.distanceMeters = Math.round(body.distanceMeters);
      saved.push("distanceMeters");
    }

    if (Array.isArray(body.workouts)) {
      const sanitizedWorkouts = body.workouts
        .map(sanitizeWorkout)
        .filter((workout): workout is SanitizedWorkout => workout !== null);

      update.workouts = sanitizedWorkouts;

      if (sanitizedWorkouts.length > 0) {
        saved.push("workouts");
      }
    }

    const snapshot = await HealthSnapshot.findOneAndUpdate(
      { athleteId, dateKey },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      data: {
        dateKey,
        saved,
        snapshot,
      },
    });
  } catch (error) {
    console.error("Health sync error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/stats/entries
router.post("/entries", async (req: AuthRequest, res: Response) => {
  const parsed = CreateStatEntrySchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  try {
    const userId = req.user!.userId;

    const card = await StatCard.findOne({
      _id: parsed.data.cardId,
      athleteId: userId,
    });

    if (!card) {
      res.status(404).json({ success: false, error: "Card not found" });
      return;
    }

    const entry = await StatEntry.create({
      ...parsed.data,
      athleteId: userId,
      recordedAt: parsed.data.recordedAt ?? new Date(),
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error("Create entry error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/stats/entries/:id
router.delete("/entries/:id", async (req: AuthRequest, res: Response) => {
  try {
    const entry = await StatEntry.findOneAndDelete({
      _id: req.params.id,
      athleteId: req.user!.userId,
    });

    if (!entry) {
      res.status(404).json({ success: false, error: "Entry not found" });
      return;
    }

    res.json({ success: true, message: "Entry deleted" });
  } catch (error) {
    console.error("Delete entry error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/stats/entries/:cardId
router.get("/entries/:cardId", async (req: AuthRequest, res: Response) => {
  try {
    const card = await StatCard.findById(req.params.cardId);

    if (!card) {
      res.status(404).json({ success: false, error: "Card not found" });
      return;
    }

    if (req.user!.role === "coach") {
      const relation = await CoachAthlete.findOne({
        coachId: req.user!.userId,
        athleteId: card.athleteId,
        status: "active",
        allowedMetrics: card._id,
      });

      if (!relation) {
        res
          .status(403)
          .json({ success: false, error: "Access not granted by athlete" });
        return;
      }
    } else if (card.athleteId.toString() !== req.user!.userId) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    const entries = await StatEntry.find({ cardId: req.params.cardId })
      .sort({ recordedAt: -1 })
      .limit(90);

    res.json({ success: true, data: entries.reverse() });
  } catch (error) {
    console.error("Get entries error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/stats/latest
router.get("/latest", async (req: AuthRequest, res: Response) => {
  try {
    const athleteId = req.user!.userId;

    const cards = await StatCard.find({ athleteId }).sort({
      order: 1,
      createdAt: 1,
    });

    const today = new Date();
    const dateKey = dateKeyFromDate(today);

    const snapshot = await HealthSnapshot.findOne({ athleteId, dateKey });

    const latest = await Promise.all(
      cards.map(async (card) => {
        const label = card.label?.toLowerCase?.() ?? "";

        if (snapshot) {
          if (card.type === "steps" && isFiniteNumber(snapshot.steps)) {
            return {
              card,
              latest: {
                value: snapshot.steps,
                recordedAt: snapshot.recordedAt,
                source: "health_snapshot",
              },
            };
          }

          if (card.type === "sleep" && isFiniteNumber(snapshot.sleepMinutes)) {
            return {
              card,
              latest: {
                value: snapshot.sleepMinutes,
                recordedAt: snapshot.recordedAt,
                source: "health_snapshot",
              },
            };
          }

          if (
            card.type === "heartrate" &&
            isFiniteNumber(snapshot.heartRateAvg)
          ) {
            return {
              card,
              latest: {
                value: snapshot.heartRateAvg,
                recordedAt: snapshot.recordedAt,
                source: "health_snapshot",
                note: [
                  isFiniteNumber(snapshot.heartRateMin)
                    ? `min:${snapshot.heartRateMin}`
                    : null,
                  isFiniteNumber(snapshot.heartRateMax)
                    ? `max:${snapshot.heartRateMax}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" | "),
              },
            };
          }

          if (
            card.type === "calories" &&
            isFiniteNumber(snapshot.caloriesActive)
          ) {
            return {
              card,
              latest: {
                value: snapshot.caloriesActive,
                recordedAt: snapshot.recordedAt,
                source: "health_snapshot",
              },
            };
          }

          if (
            card.type === "custom" &&
            label === "total calories" &&
            isFiniteNumber(snapshot.caloriesTotal)
          ) {
            return {
              card,
              latest: {
                value: snapshot.caloriesTotal,
                recordedAt: snapshot.recordedAt,
                source: "health_snapshot",
              },
            };
          }

          if (
            card.type === "custom" &&
            label === "distance" &&
            isFiniteNumber(snapshot.distanceMeters)
          ) {
            return {
              card,
              latest: {
                value: snapshot.distanceMeters,
                recordedAt: snapshot.recordedAt,
                source: "health_snapshot",
              },
            };
          }

          if (
            card.type === "custom" &&
            label === "workout minutes" &&
            Array.isArray(snapshot.workouts)
          ) {
            const totalWorkoutMinutes = snapshot.workouts.reduce(
              (sum: number, workout: any) =>
                sum +
                (isFiniteNumber(workout?.durationMinutes)
                  ? workout.durationMinutes
                  : 0),
              0
            );

            if (totalWorkoutMinutes > 0) {
              return {
                card,
                latest: {
                  value: totalWorkoutMinutes,
                  recordedAt: snapshot.recordedAt,
                  source: "health_snapshot",
                },
              };
            }
          }
        }

        const entry = await StatEntry.findOne({ cardId: card._id }).sort({
          recordedAt: -1,
        });

        return {
          card,
          latest: entry ?? null,
        };
      })
    );

    res.json({ success: true, data: latest });
  } catch (error) {
    console.error("Get latest stats error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
