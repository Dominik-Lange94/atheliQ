import { Router, Response } from "express";
import mongoose from "mongoose";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import { CreateStatCardSchema } from "@shared/schemas";
import StatCard from "../models/StatCard";
import StatEntry from "../models/StatEntry";
import AthleteProfile from "../models/AthleteProfile";
import { ensureOnboardingPresetCards } from "../lib/onboarding-presets";

const router = Router();
router.use(authenticate, requireRole("athlete"));

function toObjectId(id: string) {
  return new mongoose.Types.ObjectId(id);
}

function isValidObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

function toSafeDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeRecordedAt(date?: string) {
  if (!date) return new Date();
  const d = new Date(`${date}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

// GET /api/athlete/cards
router.get("/cards", async (req: AuthRequest, res: Response) => {
  try {
    const athleteId = toObjectId(req.user!.userId);

    const cards = await StatCard.find({ athleteId }).sort({ order: 1 });

    res.json({ success: true, data: cards });
  } catch (error) {
    console.error("GET /api/athlete/cards error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/athlete/cards
router.post("/cards", async (req: AuthRequest, res: Response) => {
  const parsed = CreateStatCardSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  try {
    const athleteId = toObjectId(req.user!.userId);

    const count = await StatCard.countDocuments({ athleteId });

    const card = await StatCard.create({
      ...parsed.data,
      athleteId,
      order: count,
    });

    res.status(201).json({ success: true, data: card });
  } catch (error) {
    console.error("POST /api/athlete/cards error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PATCH /api/athlete/cards/reorder
router.patch("/cards/reorder", async (req: AuthRequest, res: Response) => {
  const { order }: { order?: { id: string; order: number }[] } = req.body ?? {};

  if (!Array.isArray(order)) {
    res.status(400).json({ success: false, error: "Invalid order payload" });
    return;
  }

  try {
    const athleteId = toObjectId(req.user!.userId);

    const validItems = order.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        isValidObjectId(item.id) &&
        typeof item.order === "number"
    );

    await Promise.all(
      validItems.map(({ id, order }) =>
        StatCard.updateOne({ _id: id, athleteId }, { order })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/athlete/cards/reorder error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PATCH /api/athlete/cards/:id
router.patch("/cards/:id", async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, error: "Invalid card id" });
      return;
    }

    const athleteId = toObjectId(req.user!.userId);
    const { label, color, chartType, visible, unit } = req.body ?? {};

    const update: Record<string, unknown> = {};

    if (typeof label === "string" && label.trim()) {
      update.label = label.trim();
    }

    if (typeof color === "string") {
      update.color = color;
    }

    if (chartType === "line" || chartType === "bar" || chartType === "mixed") {
      update.chartType = chartType;
    }

    if (typeof visible === "boolean") {
      update.visible = visible;
    }

    if (typeof unit === "string" && unit.trim()) {
      update.unit = unit.trim();
    }

    const card = await StatCard.findOneAndUpdate(
      {
        _id: req.params.id,
        athleteId,
      },
      update,
      { new: true }
    );

    if (!card) {
      res.status(404).json({ success: false, error: "Card not found" });
      return;
    }

    res.json({ success: true, data: card });
  } catch (error) {
    console.error("PATCH /api/athlete/cards/:id error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/athlete/cards/:id
router.delete("/cards/:id", async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, error: "Invalid card id" });
      return;
    }

    const athleteId = toObjectId(req.user!.userId);

    const card = await StatCard.findOneAndDelete({
      _id: req.params.id,
      athleteId,
    });

    if (!card) {
      res.status(404).json({ success: false, error: "Card not found" });
      return;
    }

    await StatEntry.deleteMany({
      athleteId,
      cardId: card._id,
    });

    await AthleteProfile.updateOne(
      { athleteId },
      {
        $pull: {
          generatedCardIds: card._id,
        },
      }
    );

    res.json({ success: true, message: "Card removed" });
  } catch (error) {
    console.error("DELETE /api/athlete/cards/:id error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PATCH /api/athlete/weight
router.patch("/weight", async (req: AuthRequest, res: Response) => {
  try {
    const athleteId = toObjectId(req.user!.userId);
    const delta = Number(req.body?.delta);
    const date = typeof req.body?.date === "string" ? req.body.date : undefined;

    if (!Number.isFinite(delta)) {
      res.status(400).json({ success: false, error: "Invalid delta" });
      return;
    }

    const weightCard = await StatCard.findOne({
      athleteId,
      type: "weight",
    }).sort({ order: 1 });

    if (!weightCard) {
      res.status(404).json({ success: false, error: "Weight card not found" });
      return;
    }

    const recordedAt = normalizeRecordedAt(date);

    const dayStart = new Date(recordedAt);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(recordedAt);
    dayEnd.setHours(23, 59, 59, 999);

    const latestForDay = await StatEntry.findOne({
      athleteId,
      cardId: weightCard._id,
      recordedAt: { $gte: dayStart, $lte: dayEnd },
    }).sort({ recordedAt: -1, createdAt: -1 });

    let baseValue = 0;

    if (latestForDay && typeof latestForDay.value === "number") {
      baseValue = latestForDay.value;
    } else {
      const latestOverall = await StatEntry.findOne({
        athleteId,
        cardId: weightCard._id,
      }).sort({ recordedAt: -1, createdAt: -1 });

      if (latestOverall && typeof latestOverall.value === "number") {
        baseValue = latestOverall.value;
      }
    }

    const nextValue = Number((baseValue + delta).toFixed(2));

    const entry = await StatEntry.create({
      athleteId,
      cardId: weightCard._id,
      value: nextValue,
      recordedAt,
      note: "Manual weight delta update",
    });

    await AthleteProfile.updateOne(
      { athleteId },
      { currentWeightKg: nextValue }
    );

    res.json({ success: true, data: entry });
  } catch (error) {
    console.error("PATCH /api/athlete/weight error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/athlete/profile
router.get("/profile", async (req: AuthRequest, res: Response) => {
  try {
    const athleteId = toObjectId(req.user!.userId);

    const profile = await AthleteProfile.findOne({ athleteId }).lean();

    res.json({
      success: true,
      data: profile ?? null,
    });
  } catch (error) {
    console.error("GET /api/athlete/profile error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PATCH /api/athlete/profile
router.patch("/profile", async (req: AuthRequest, res: Response) => {
  try {
    const athleteId = toObjectId(req.user!.userId);
    const body = req.body ?? {};

    const updateSet: Record<string, unknown> = {};

    if (body.currentWeightKg !== undefined) {
      updateSet.currentWeightKg = toFiniteNumber(body.currentWeightKg);
    }
    if (body.targetWeightKg !== undefined) {
      updateSet.targetWeightKg = toFiniteNumber(body.targetWeightKg);
    }
    if (body.heightCm !== undefined) {
      updateSet.heightCm = toFiniteNumber(body.heightCm);
    }
    if (body.birthDate !== undefined) {
      updateSet.birthDate = toSafeDate(body.birthDate);
    }
    if (body.gender !== undefined) {
      updateSet.gender = body.gender;
    }

    if (body.primaryGoal !== undefined) {
      updateSet.primaryGoal = body.primaryGoal;
    }
    if (body.reason !== undefined) {
      updateSet.reason = body.reason;
    }
    if (body.eventType !== undefined) {
      updateSet.eventType = body.eventType;
    }
    if (body.eventDate !== undefined) {
      updateSet.eventDate = toSafeDate(body.eventDate);
    }

    if (body.workLifestyle !== undefined) {
      updateSet.workLifestyle = body.workLifestyle;
    }
    if (body.activityLevel !== undefined) {
      updateSet.activityLevel = body.activityLevel;
    }
    if (body.experienceLevel !== undefined) {
      updateSet.experienceLevel = body.experienceLevel;
    }
    if (body.workoutsPerWeek !== undefined) {
      updateSet.workoutsPerWeek = body.workoutsPerWeek;
    }

    if (body.painPoints !== undefined && Array.isArray(body.painPoints)) {
      updateSet.painPoints = body.painPoints;
    }
    if (body.dietPreference !== undefined) {
      updateSet.dietPreference = body.dietPreference;
    }

    if (body.goalSpeed !== undefined) {
      updateSet.goalSpeed = body.goalSpeed;
    }
    if (body.trainingLocation !== undefined) {
      updateSet.trainingLocation = body.trainingLocation;
    }
    if (body.equipmentLevel !== undefined) {
      updateSet.equipmentLevel = body.equipmentLevel;
    }
    if (body.sleepQuality !== undefined) {
      updateSet.sleepQuality = body.sleepQuality;
    }
    if (body.stressLevel !== undefined) {
      updateSet.stressLevel = body.stressLevel;
    }
    if (body.mealStructure !== undefined) {
      updateSet.mealStructure = body.mealStructure;
    }
    if (body.aiTone !== undefined) {
      updateSet.aiTone = body.aiTone;
    }
    if (body.unitSystem !== undefined) {
      updateSet.unitSystem = body.unitSystem;
    }

    if (body.availableDays !== undefined && Array.isArray(body.availableDays)) {
      updateSet.availableDays = body.availableDays;
    }
    if (body.limitations !== undefined && Array.isArray(body.limitations)) {
      updateSet.limitations = body.limitations;
    }
    if (body.notes !== undefined && typeof body.notes === "string") {
      updateSet.notes = body.notes.trim();
    }

    const profile = await AthleteProfile.findOneAndUpdate(
      { athleteId },
      { $set: updateSet },
      { new: true }
    );

    res.json({ success: true, data: profile });
  } catch (error) {
    console.error("PATCH /api/athlete/profile error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/athlete/onboarding
router.post("/onboarding", async (req: AuthRequest, res: Response) => {
  try {
    const athleteId = toObjectId(req.user!.userId);
    const body = req.body ?? {};

    const startMode =
      body.startMode === "smart" ||
      body.startMode === "template" ||
      body.startMode === "blank"
        ? body.startMode
        : null;

    const selectedTemplate =
      typeof body.selectedTemplate === "string" ? body.selectedTemplate : null;

    const primaryGoal =
      typeof body.primaryGoal === "string" ? body.primaryGoal : null;

    const generatedCardIds = await ensureOnboardingPresetCards({
      athleteId: athleteId.toString(),
      startMode,
      selectedTemplate,
      primaryGoal,
    });

    const currentWeight = toFiniteNumber(body.currentWeightKg);

    const profile = await AthleteProfile.findOneAndUpdate(
      { athleteId },
      {
        athleteId,

        currentWeightKg: currentWeight,
        targetWeightKg: toFiniteNumber(body.targetWeightKg),
        heightCm: toFiniteNumber(body.heightCm),
        birthDate: toSafeDate(body.birthDate),
        gender: body.gender ?? null,

        primaryGoal: body.primaryGoal ?? null,
        reason: body.reason ?? null,
        eventType: body.eventType ?? null,
        eventDate: toSafeDate(body.eventDate),

        workLifestyle: body.workLifestyle ?? null,
        activityLevel: body.activityLevel ?? null,
        experienceLevel: body.experienceLevel ?? null,
        workoutsPerWeek: body.workoutsPerWeek ?? null,

        painPoints: Array.isArray(body.painPoints) ? body.painPoints : [],
        dietPreference: body.dietPreference ?? null,

        goalSpeed: body.goalSpeed ?? null,
        trainingLocation: body.trainingLocation ?? null,
        equipmentLevel: body.equipmentLevel ?? null,
        sleepQuality: body.sleepQuality ?? null,
        stressLevel: body.stressLevel ?? null,
        mealStructure: body.mealStructure ?? null,
        aiTone: body.aiTone ?? null,
        unitSystem: body.unitSystem ?? "metric",

        availableDays: Array.isArray(body.availableDays)
          ? body.availableDays
          : [],
        limitations: Array.isArray(body.limitations) ? body.limitations : [],
        notes: typeof body.notes === "string" ? body.notes.trim() : "",

        startMode,
        selectedTemplate,
        generatedCardIds,

        onboardingCompleted: true,
        completedAt: new Date(),
        profileVersion: 1,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    if (currentWeight !== null) {
      const weightCard = await StatCard.findOne({
        athleteId,
        type: "weight",
      }).sort({ order: 1 });

      if (weightCard) {
        const existingWeightEntry = await StatEntry.findOne({
          athleteId,
          cardId: weightCard._id,
        });

        if (!existingWeightEntry) {
          await StatEntry.create({
            athleteId,
            cardId: weightCard._id,
            value: currentWeight,
            recordedAt: new Date(),
            note: "Initial onboarding value",
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      data: profile,
      meta: {
        generatedCardIds,
      },
    });
  } catch (error) {
    console.error("POST /api/athlete/onboarding error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Server error",
    });
  }
});

export default router;
