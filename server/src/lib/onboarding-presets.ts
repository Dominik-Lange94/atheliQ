import StatCard from "../models/StatCard";

type CardSeed = {
  type: "heartrate" | "calories" | "weight" | "steps" | "sleep" | "custom";
  label: string;
  unit: string;
  color?: string;
  chartType?: "line" | "bar" | "mixed";
};

type OnboardingPresetInput = {
  athleteId: string;
  startMode?: "smart" | "template" | "blank" | null;
  selectedTemplate?:
    | "weight_loss_starter"
    | "muscle_gain_starter"
    | "general_health_starter"
    | "cardio_starter"
    | "coach_ready_starter"
    | "minimal_tracker"
    | null;
  primaryGoal?:
    | "lose_fat"
    | "maintain"
    | "gain_weight"
    | "build_muscle"
    | "fitness"
    | "health"
    | "custom"
    | null;
};

function uniqueByLabel(cards: CardSeed[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = `${card.type}::${card.label.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSmartGoalCards(
  primaryGoal?: OnboardingPresetInput["primaryGoal"]
): CardSeed[] {
  switch (primaryGoal) {
    case "lose_fat":
      return [
        {
          type: "weight",
          label: "⚖️ Gewicht",
          unit: "kg",
          color: "blue",
          chartType: "line",
        },
        {
          type: "steps",
          label: "👟 Schritte",
          unit: "steps",
          color: "green",
          chartType: "bar",
        },
        {
          type: "calories",
          label: "🔥 Kalorien",
          unit: "kcal",
          color: "orange",
          chartType: "bar",
        },
        {
          type: "sleep",
          label: "🌙 Schlaf",
          unit: "hours",
          color: "purple",
          chartType: "line",
        },
        {
          type: "custom",
          label: "💧 Wasser",
          unit: "L",
          color: "teal",
          chartType: "bar",
        },
      ];

    case "build_muscle":
      return [
        {
          type: "weight",
          label: "⚖️ Gewicht",
          unit: "kg",
          color: "blue",
          chartType: "line",
        },
        {
          type: "custom",
          label: "🍗 Protein",
          unit: "g",
          color: "amber",
          chartType: "bar",
        },
        {
          type: "custom",
          label: "🏋️ Workout",
          unit: "sessions",
          color: "indigo",
          chartType: "bar",
        },
        {
          type: "sleep",
          label: "🌙 Schlaf",
          unit: "hours",
          color: "purple",
          chartType: "line",
        },
        {
          type: "custom",
          label: "💪 Kraftwert",
          unit: "kg",
          color: "pink",
          chartType: "line",
        },
      ];

    case "gain_weight":
      return [
        {
          type: "weight",
          label: "⚖️ Gewicht",
          unit: "kg",
          color: "blue",
          chartType: "line",
        },
        {
          type: "calories",
          label: "🔥 Kalorien",
          unit: "kcal",
          color: "orange",
          chartType: "bar",
        },
        {
          type: "custom",
          label: "🍗 Protein",
          unit: "g",
          color: "amber",
          chartType: "bar",
        },
        {
          type: "custom",
          label: "🏋️ Workout",
          unit: "sessions",
          color: "indigo",
          chartType: "bar",
        },
      ];

    case "fitness":
      return [
        {
          type: "steps",
          label: "👟 Schritte",
          unit: "steps",
          color: "green",
          chartType: "bar",
        },
        {
          type: "custom",
          label: "🏃 Cardio",
          unit: "min",
          color: "teal",
          chartType: "bar",
        },
        {
          type: "custom",
          label: "⚡ Pace",
          unit: "min/km",
          color: "rose",
          chartType: "line",
        },
        {
          type: "sleep",
          label: "🌙 Schlaf",
          unit: "hours",
          color: "purple",
          chartType: "line",
        },
      ];

    case "health":
      return [
        {
          type: "sleep",
          label: "🌙 Schlaf",
          unit: "hours",
          color: "purple",
          chartType: "line",
        },
        {
          type: "steps",
          label: "👟 Schritte",
          unit: "steps",
          color: "green",
          chartType: "bar",
        },
        {
          type: "custom",
          label: "💧 Wasser",
          unit: "L",
          color: "teal",
          chartType: "bar",
        },
        {
          type: "weight",
          label: "⚖️ Gewicht",
          unit: "kg",
          color: "blue",
          chartType: "line",
        },
        {
          type: "custom",
          label: "⚡ Energie",
          unit: "score",
          color: "yellow",
          chartType: "line",
        },
      ];

    case "maintain":
      return [
        {
          type: "weight",
          label: "⚖️ Gewicht",
          unit: "kg",
          color: "blue",
          chartType: "line",
        },
        {
          type: "steps",
          label: "👟 Schritte",
          unit: "steps",
          color: "green",
          chartType: "bar",
        },
        {
          type: "sleep",
          label: "🌙 Schlaf",
          unit: "hours",
          color: "purple",
          chartType: "line",
        },
        {
          type: "calories",
          label: "🔥 Kalorien",
          unit: "kcal",
          color: "orange",
          chartType: "bar",
        },
      ];

    default:
      return [
        {
          type: "weight",
          label: "⚖️ Gewicht",
          unit: "kg",
          color: "blue",
          chartType: "line",
        },
        {
          type: "steps",
          label: "👟 Schritte",
          unit: "steps",
          color: "green",
          chartType: "bar",
        },
        {
          type: "sleep",
          label: "🌙 Schlaf",
          unit: "hours",
          color: "purple",
          chartType: "line",
        },
      ];
  }
}

function buildTemplateCards(
  template?: OnboardingPresetInput["selectedTemplate"]
): CardSeed[] {
  switch (template) {
    case "weight_loss_starter":
      return [
        {
          type: "weight",
          label: "⚖️ Gewicht",
          unit: "kg",
          color: "blue",
          chartType: "line",
        },
        {
          type: "steps",
          label: "👟 Schritte",
          unit: "steps",
          color: "green",
          chartType: "bar",
        },
        {
          type: "calories",
          label: "🔥 Kalorien",
          unit: "kcal",
          color: "orange",
          chartType: "bar",
        },
        {
          type: "sleep",
          label: "🌙 Schlaf",
          unit: "hours",
          color: "purple",
          chartType: "line",
        },
        {
          type: "custom",
          label: "💧 Wasser",
          unit: "L",
          color: "teal",
          chartType: "bar",
        },
      ];

    case "muscle_gain_starter":
      return [
        {
          type: "weight",
          label: "⚖️ Gewicht",
          unit: "kg",
          color: "blue",
          chartType: "line",
        },
        {
          type: "custom",
          label: "🍗 Protein",
          unit: "g",
          color: "amber",
          chartType: "bar",
        },
        {
          type: "custom",
          label: "🏋️ Workout",
          unit: "sessions",
          color: "indigo",
          chartType: "bar",
        },
        {
          type: "sleep",
          label: "🌙 Schlaf",
          unit: "hours",
          color: "purple",
          chartType: "line",
        },
        {
          type: "custom",
          label: "💪 Kraftwert",
          unit: "kg",
          color: "pink",
          chartType: "line",
        },
      ];

    case "general_health_starter":
      return [
        {
          type: "sleep",
          label: "🌙 Schlaf",
          unit: "hours",
          color: "purple",
          chartType: "line",
        },
        {
          type: "steps",
          label: "👟 Schritte",
          unit: "steps",
          color: "green",
          chartType: "bar",
        },
        {
          type: "custom",
          label: "💧 Wasser",
          unit: "L",
          color: "teal",
          chartType: "bar",
        },
        {
          type: "weight",
          label: "⚖️ Gewicht",
          unit: "kg",
          color: "blue",
          chartType: "line",
        },
        {
          type: "custom",
          label: "⚡ Energie",
          unit: "score",
          color: "yellow",
          chartType: "line",
        },
      ];

    case "cardio_starter":
      return [
        {
          type: "steps",
          label: "👟 Schritte",
          unit: "steps",
          color: "green",
          chartType: "bar",
        },
        {
          type: "custom",
          label: "🏃 Cardio",
          unit: "min",
          color: "teal",
          chartType: "bar",
        },
        {
          type: "custom",
          label: "⚡ Pace",
          unit: "min/km",
          color: "rose",
          chartType: "line",
        },
        {
          type: "sleep",
          label: "🌙 Schlaf",
          unit: "hours",
          color: "purple",
          chartType: "line",
        },
        {
          type: "custom",
          label: "❤️ Ausdauer",
          unit: "score",
          color: "pink",
          chartType: "line",
        },
      ];

    case "coach_ready_starter":
      return [
        {
          type: "weight",
          label: "⚖️ Gewicht",
          unit: "kg",
          color: "blue",
          chartType: "line",
        },
        {
          type: "steps",
          label: "👟 Schritte",
          unit: "steps",
          color: "green",
          chartType: "bar",
        },
        {
          type: "sleep",
          label: "🌙 Schlaf",
          unit: "hours",
          color: "purple",
          chartType: "line",
        },
        {
          type: "custom",
          label: "⚡ Energie",
          unit: "score",
          color: "yellow",
          chartType: "line",
        },
        {
          type: "custom",
          label: "📝 Check-in",
          unit: "score",
          color: "indigo",
          chartType: "line",
        },
      ];

    case "minimal_tracker":
      return [
        {
          type: "weight",
          label: "⚖️ Gewicht",
          unit: "kg",
          color: "blue",
          chartType: "line",
        },
        {
          type: "steps",
          label: "👟 Schritte",
          unit: "steps",
          color: "green",
          chartType: "bar",
        },
        {
          type: "sleep",
          label: "🌙 Schlaf",
          unit: "hours",
          color: "purple",
          chartType: "line",
        },
      ];

    default:
      return [];
  }
}

export async function ensureOnboardingPresetCards(
  input: OnboardingPresetInput
) {
  if (input.startMode === "blank") {
    return [];
  }

  const existingCards = await StatCard.find({ athleteId: input.athleteId })
    .sort({ order: 1 })
    .select("_id label type");

  if (existingCards.length > 0) {
    return existingCards.map((card) => card._id);
  }

  const seeds =
    input.startMode === "template"
      ? buildTemplateCards(input.selectedTemplate)
      : buildSmartGoalCards(input.primaryGoal);

  const finalSeeds = uniqueByLabel(seeds);

  const created = await Promise.all(
    finalSeeds.map((seed, index) =>
      StatCard.create({
        athleteId: input.athleteId,
        type: seed.type,
        label: seed.label,
        unit: seed.unit,
        color: seed.color ?? null,
        chartType: seed.chartType ?? "line",
        visible: true,
        order: index,
      })
    )
  );

  return created.map((card) => card._id);
}
