import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import StatCard from "../../models/StatCard";
import StatEntry from "../../models/StatEntry";
import User from "../../models/User";

const DEMO_EMAIL = "dirk@demo.com";
const DEMO_PASSWORD = "password123";
const DEMO_NAME = "Dirk Demo";

type CardSeed = {
  key: string;
  type: "heartrate" | "calories" | "weight" | "steps" | "sleep" | "custom";
  label: string;
  unit: string;
  color?: string;
  chartType?: "line" | "bar" | "mixed";
  order: number;
};

type GeneratedEntry = {
  cardKey: string;
  value: number;
  secondaryValue?: number;
  note?: string;
  recordedAt: Date;
};

const CARD_SEEDS: CardSeed[] = [
  {
    key: "sleep",
    type: "sleep",
    label: "🌙 Sleep",
    unit: "hrs",
    color: "purple",
    chartType: "line",
    order: 0,
  },
  {
    key: "heartrate",
    type: "heartrate",
    label: "❤️ Heart Rate",
    unit: "bpm",
    color: "rose",
    chartType: "line",
    order: 1,
  },
  {
    key: "steps",
    type: "steps",
    label: "👟 Steps",
    unit: "steps",
    color: "green",
    chartType: "bar",
    order: 2,
  },
  {
    key: "weight",
    type: "weight",
    label: "⚖️ Weight",
    unit: "kg",
    color: "blue",
    chartType: "line",
    order: 3,
  },
  {
    key: "burpees",
    type: "custom",
    label: "💪 Burpees",
    unit: "reps",
    color: "amber",
    chartType: "bar",
    order: 4,
  },
  {
    key: "running",
    type: "custom",
    label: "⚽ Laufen",
    unit: "min/km",
    color: "amber",
    chartType: "line",
    order: 5,
  },
  {
    key: "pushups",
    type: "custom",
    label: "💪 Liegestützen",
    unit: "reps",
    color: "purple",
    chartType: "bar",
    order: 6,
  },
  {
    key: "totalCalories",
    type: "custom",
    label: "📊 Total Calories",
    unit: "kcal",
    color: "amber",
    chartType: "bar",
    order: 7,
  },
  {
    key: "workoutMinutes",
    type: "custom",
    label: "📊 Workout Minutes",
    unit: "min",
    color: "amber",
    chartType: "bar",
    order: 8,
  },
  {
    key: "distance",
    type: "custom",
    label: "📊 Distance",
    unit: "m",
    color: "amber",
    chartType: "line",
    order: 9,
  },
];

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function chance(probability: number) {
  return Math.random() < probability;
}

function startOfDayAtNoon(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      12,
      0,
      0
    )
  );
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function formatIsoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getPhase(dayIndex: number, totalDays: number) {
  const ratio = dayIndex / totalDays;

  if (ratio < 0.18) return "starting";
  if (ratio < 0.42) return "building";
  if (ratio < 0.58) return "slump";
  if (ratio < 0.82) return "consistent";
  return "strong";
}

function generateDemoEntries(days = 540): GeneratedEntry[] {
  const today = new Date();
  const start = startOfDayAtNoon(addDays(today, -days + 1));
  const entries: GeneratedEntry[] = [];

  let weight = 78.8;
  let restingHrBase = 74;
  let runningPaceBase = 6.45;
  let strengthBase = 12;
  let sleepDebt = 0;

  for (let i = 0; i < days; i++) {
    const date = startOfDayAtNoon(addDays(start, i));
    const phase = getPhase(i, days);
    const weekday = date.getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;

    let workoutProb = 0.45;

    if (phase === "starting") {
      workoutProb = 0.32;
    } else if (phase === "building") {
      workoutProb = 0.52;
    } else if (phase === "slump") {
      workoutProb = 0.22;
    } else if (phase === "consistent") {
      workoutProb = 0.55;
    } else if (phase === "strong") {
      workoutProb = 0.6;
    }

    if (isWeekend) {
      workoutProb += 0.04;
    }

    const sicknessWindow =
      i > Math.floor(days * 0.5) && i < Math.floor(days * 0.53);
    const vacationWindow =
      i > Math.floor(days * 0.71) && i < Math.floor(days * 0.76);

    // sleep
    let sleep = randomBetween(6.1, 8.6);
    if (phase === "slump") sleep -= 0.35;
    if (sicknessWindow) sleep += 0.6;
    if (vacationWindow) sleep += 0.25;
    if (isWeekend) sleep += 0.2;
    sleep -= sleepDebt * 0.12;
    sleep = clamp(round(sleep, 1), 4.8, 9.4);

    if (sleep < 6.2) sleepDebt = clamp(sleepDebt + 1, 0, 6);
    else sleepDebt = clamp(sleepDebt - 1, 0, 6);

    entries.push({
      cardKey: "sleep",
      value: sleep,
      recordedAt: date,
    });

    // steps
    let stepsBase = isWeekend ? 7800 : 6900;
    if (phase === "starting") stepsBase -= 600;
    if (phase === "building") stepsBase += 800;
    if (phase === "slump") stepsBase -= 1400;
    if (phase === "consistent") stepsBase += 1100;
    if (phase === "strong") stepsBase += 1600;
    if (sicknessWindow) stepsBase -= 2600;
    if (vacationWindow) stepsBase += 1200;

    let steps = Math.round(stepsBase + randomBetween(-1800, 2600));
    steps = clamp(steps, 1800, 18500);

    entries.push({
      cardKey: "steps",
      value: steps,
      recordedAt: date,
    });

    // weight - now daily
    let weightDelta = randomBetween(-0.08, 0.08);
    if (phase === "building") weightDelta -= 0.01;
    if (phase === "slump") weightDelta += 0.01;
    if (phase === "consistent") weightDelta -= 0.015;
    if (phase === "strong") weightDelta -= 0.01;
    if (vacationWindow) weightDelta += 0.03;

    weight += weightDelta;
    weight = clamp(round(weight, 1), 71.8, 80.5);

    entries.push({
      cardKey: "weight",
      value: weight,
      recordedAt: date,
    });

    // heart rate
    let hr =
      restingHrBase +
      randomBetween(-3, 4) -
      (phase === "building" ? 2 : 0) -
      (phase === "consistent" ? 4 : 0) -
      (phase === "strong" ? 5 : 0) +
      (sleep < 6 ? 2.5 : 0) +
      (sicknessWindow ? 6 : 0);

    hr = clamp(round(hr, 0), 58, 84);

    entries.push({
      cardKey: "heartrate",
      value: hr,
      recordedAt: date,
    });

    // total calories
    const totalCalories = Math.round(
      1900 +
        steps * 0.055 +
        (isWeekend ? 80 : 0) +
        (phase === "strong" ? 120 : 0) +
        randomBetween(-120, 160)
    );

    entries.push({
      cardKey: "totalCalories",
      value: clamp(totalCalories, 1700, 3600),
      recordedAt: date,
    });

    // built-in calories
    const activeCalories = Math.round(
      260 +
        steps * 0.035 +
        (phase === "strong" ? 70 : 0) +
        randomBetween(-70, 110)
    );

    entries.push({
      cardKey: "caloriesBuiltIn",
      value: clamp(activeCalories, 120, 1200),
      recordedAt: date,
    });

    const didWorkout = chance(workoutProb) && !sicknessWindow;

    // workout minutes - now daily
    let workoutMinutes = 0;

    if (didWorkout) {
      workoutMinutes = Math.round(
        randomBetween(
          phase === "starting" ? 20 : 28,
          phase === "strong" ? 78 : 62
        )
      );

      if (isWeekend) workoutMinutes += 8;
      workoutMinutes = clamp(workoutMinutes, 18, 95);
    } else {
      workoutMinutes = sicknessWindow
        ? Math.round(randomBetween(0, 8))
        : Math.round(randomBetween(6, 18));
    }

    entries.push({
      cardKey: "workoutMinutes",
      value: workoutMinutes,
      recordedAt: date,
    });

    // pushups - now daily
    let pushups = 0;
    if (didWorkout && chance(0.52)) {
      strengthBase += randomBetween(-0.05, 0.18);
      pushups = Math.round(
        clamp(
          strengthBase +
            (phase === "building" ? 4 : 0) +
            (phase === "consistent" ? 6 : 0) +
            (phase === "strong" ? 8 : 0) +
            randomBetween(-3, 6),
          8,
          38
        )
      );
    } else {
      pushups = Math.round(
        clamp(
          4 +
            (phase === "consistent" ? 2 : 0) +
            (phase === "strong" ? 3 : 0) +
            randomBetween(-2, 3),
          0,
          16
        )
      );
    }

    entries.push({
      cardKey: "pushups",
      value: pushups,
      note: didWorkout && chance(0.06) ? "Sauberer Satz" : undefined,
      recordedAt: date,
    });

    // burpees - now daily
    let burpees = 0;
    if (didWorkout && chance(0.28)) {
      burpees = Math.round(
        clamp(
          8 +
            (phase === "building" ? 2 : 0) +
            (phase === "consistent" ? 3 : 0) +
            (phase === "strong" ? 5 : 0) +
            randomBetween(-2, 5),
          6,
          24
        )
      );
    } else {
      burpees = Math.round(randomBetween(0, 6));
    }

    entries.push({
      cardKey: "burpees",
      value: burpees,
      note: didWorkout && chance(0.05) ? "Finisher" : undefined,
      recordedAt: date,
    });

    // running / distance - keep realistic, not forced every day
    if (didWorkout && chance(0.4)) {
      runningPaceBase -= phase === "building" ? 0.002 : 0;
      runningPaceBase -= phase === "consistent" ? 0.003 : 0;
      runningPaceBase -= phase === "strong" ? 0.002 : 0;
      if (phase === "slump") runningPaceBase += 0.003;

      const distanceKm = round(
        clamp(
          randomBetween(
            phase === "starting" ? 2.4 : 3.2,
            phase === "strong" ? 10.5 : 7.8
          ),
          2,
          14
        ),
        2
      );

      let pace = runningPaceBase + randomBetween(-0.22, 0.28);
      if (sleep < 6) pace += 0.18;
      if (vacationWindow) pace += 0.08;
      pace = clamp(round(pace, 2), 4.65, 7.2);

      const timeMinutes = round(distanceKm * pace, 1);
      const distanceMeters = Math.round(distanceKm * 1000);

      entries.push({
        cardKey: "running",
        value: distanceKm,
        secondaryValue: timeMinutes,
        note: chance(0.08) ? "Locker" : chance(0.05) ? "Intervall" : undefined,
        recordedAt: date,
      });

      entries.push({
        cardKey: "distance",
        value: distanceMeters,
        recordedAt: date,
      });
    } else {
      // optional daily distance fallback
      const estimatedDistanceMeters = Math.round(
        clamp(steps * randomBetween(0.62, 0.78), 1200, 14000)
      );

      entries.push({
        cardKey: "distance",
        value: estimatedDistanceMeters,
        recordedAt: date,
      });
    }
  }

  return entries;
}

async function ensureDemoUser() {
  let user = await User.findOne({ email: DEMO_EMAIL });

  if (!user) {
    user = new User({
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      role: "athlete",
      isDemo: true,
    });

    await user.save();
    return user;
  }

  user.name = DEMO_NAME;
  user.email = DEMO_EMAIL;
  user.password = DEMO_PASSWORD;
  user.role = "athlete";
  user.isDemo = true;

  await user.save();
  return user;
}

async function wipeDemoStats(athleteId: mongoose.Types.ObjectId | string) {
  const cards = await StatCard.find({ athleteId }).select("_id");
  const cardIds = cards.map((c) => c._id);

  if (cardIds.length > 0) {
    await StatEntry.deleteMany({ cardId: { $in: cardIds } });
  }

  await StatCard.deleteMany({ athleteId });
}

async function seedDemoStats(athleteId: mongoose.Types.ObjectId | string) {
  const createdCards = await StatCard.insertMany(
    CARD_SEEDS.map((card) => ({
      athleteId,
      type: card.type,
      label: card.label,
      unit: card.unit,
      color: card.color ?? null,
      chartType: card.chartType ?? "line",
      visible: true,
      order: card.order,
    }))
  );

  const cardIdByKey = new Map<string, mongoose.Types.ObjectId>();

  for (let i = 0; i < CARD_SEEDS.length; i++) {
    cardIdByKey.set(CARD_SEEDS[i].key, createdCards[i]._id);
  }

  // built-in calories card key alias
  const caloriesCard = createdCards.find((c) => c.type === "calories");
  if (caloriesCard) {
    cardIdByKey.set("caloriesBuiltIn", caloriesCard._id);
  }

  const generated = generateDemoEntries(540);

  const entryDocs = generated
    .map((entry) => {
      const cardId = cardIdByKey.get(entry.cardKey);
      if (!cardId) return null;

      return {
        athleteId,
        cardId,
        value: entry.value,
        secondaryValue: entry.secondaryValue,
        note: entry.note,
        recordedAt: entry.recordedAt,
      };
    })
    .filter(Boolean);

  if (entryDocs.length > 0) {
    await StatEntry.insertMany(entryDocs, { ordered: false });
  }
}

export async function ensureDemoAccount(options?: { forceReseed?: boolean }) {
  const user = await ensureDemoUser();

  const existingCardCount = await StatCard.countDocuments({
    athleteId: user._id,
  });

  if (options?.forceReseed || existingCardCount === 0) {
    await wipeDemoStats(user._id);
    await seedDemoStats(user._id);
  }

  return {
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    userId: user._id,
  };
}
