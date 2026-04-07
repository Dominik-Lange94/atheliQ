import { useMemo, useState } from "react";

type PrimaryGoal =
  | "lose_fat"
  | "maintain"
  | "gain_weight"
  | "build_muscle"
  | "fitness"
  | "health"
  | "custom";

type WorkLifestyle = "sitting" | "standing" | "walking" | "physical";
type ActivityLevel = "low" | "moderate" | "high";
type ExperienceLevel = "beginner" | "intermediate" | "advanced";
type WorkoutsPerWeek = "0" | "1_2" | "3_4" | "5_plus";

type Reason =
  | "confidence"
  | "health"
  | "fitness"
  | "event"
  | "feel_better"
  | "other";

type PainPoint =
  | "cravings"
  | "motivation"
  | "portion_control"
  | "food_knowledge"
  | "time"
  | "energy"
  | "training_consistency"
  | "other";

type DietPreference =
  | "classic"
  | "vegetarian"
  | "vegan"
  | "pescetarian"
  | "high_protein"
  | "flexible"
  | "none";

type StartMode = "smart" | "template" | "blank";

type TemplatePreset =
  | "weight_loss_starter"
  | "muscle_gain_starter"
  | "general_health_starter"
  | "cardio_starter"
  | "coach_ready_starter"
  | "minimal_tracker";

type EventType =
  | "vacation"
  | "wedding"
  | "competition"
  | "summer"
  | "reunion"
  | "other"
  | "none";

type Gender = "female" | "male" | "other" | "prefer_not_to_say";

type OnboardingData = {
  currentWeightKg: string;
  targetWeightKg: string;
  heightCm: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  gender: Gender | null;

  primaryGoal: PrimaryGoal | null;
  reason: Reason | null;
  eventType: EventType | null;
  eventDay: string;
  eventMonth: string;
  eventYear: string;

  workLifestyle: WorkLifestyle | null;
  activityLevel: ActivityLevel | null;
  experienceLevel: ExperienceLevel | null;
  workoutsPerWeek: WorkoutsPerWeek | null;

  painPoints: PainPoint[];
  dietPreference: DietPreference | null;

  startMode: StartMode | null;
  selectedTemplate: TemplatePreset | null;
};

const STORAGE_KEY = "fittrack_onboarding_v2_draft";
const COMPLETED_KEY = "fittrack_onboarding_completed";

const INITIAL_DATA: OnboardingData = {
  currentWeightKg: "",
  targetWeightKg: "",
  heightCm: "",
  birthDay: "",
  birthMonth: "",
  birthYear: "",
  gender: null,

  primaryGoal: null,
  reason: null,
  eventType: null,
  eventDay: "",
  eventMonth: "",
  eventYear: "",

  workLifestyle: null,
  activityLevel: null,
  experienceLevel: null,
  workoutsPerWeek: null,

  painPoints: [],
  dietPreference: null,

  startMode: null,
  selectedTemplate: null,
};

function loadDraft(): OnboardingData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_DATA;
    return { ...INITIAL_DATA, ...JSON.parse(raw) };
  } catch {
    return INITIAL_DATA;
  }
}

function calculateAge(day: string, month: string, year: string): number | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!d || !m || !y) return null;
  const birthDate = new Date(y, m - 1, d);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age >= 0 ? age : null;
}

function calculateBmi(heightCm: string, weightKg: string): number | null {
  const h = Number(heightCm);
  const w = Number(weightKg);
  if (!h || !w || h <= 0 || w <= 0) return null;
  const hm = h / 100;
  return Number((w / (hm * hm)).toFixed(1));
}

function getBmiCategory(bmi: number | null): string {
  if (bmi === null) return "Enter your height and weight";
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal range";
  if (bmi < 30) return "Overweight";
  return "Obesity range";
}

const GOAL_OPTIONS: {
  value: PrimaryGoal;
  title: string;
  subtitle: string;
  icon: string;
}[] = [
  {
    value: "lose_fat",
    title: "Abnehmen",
    subtitle: "Körperfett reduzieren und leichter werden",
    icon: "🔥",
  },
  {
    value: "maintain",
    title: "Gewicht halten",
    subtitle: "Stabil bleiben und gute Routinen halten",
    icon: "⚖️",
  },
  {
    value: "gain_weight",
    title: "Zunehmen",
    subtitle: "Gesund an Gewicht zulegen",
    icon: "📈",
  },
  {
    value: "build_muscle",
    title: "Muskeln aufbauen",
    subtitle: "Mehr Kraft und Muskelmasse aufbauen",
    icon: "💪",
  },
  {
    value: "fitness",
    title: "Fitter werden",
    subtitle: "Leistung, Ausdauer und Alltag verbessern",
    icon: "🏃",
  },
  {
    value: "health",
    title: "Gesünder leben",
    subtitle: "Mehr Balance, Energie und Wohlbefinden",
    icon: "❤️",
  },
];

const REASON_OPTIONS: {
  value: Reason;
  title: string;
}[] = [
  { value: "confidence", title: "Für mein Selbstbewusstsein" },
  { value: "health", title: "Für meine Gesundheit" },
  { value: "fitness", title: "Für meine Fitness" },
  { value: "event", title: "Für ein Event / Anlass" },
  { value: "feel_better", title: "Um mich wohler zu fühlen" },
  { value: "other", title: "Aus einem anderen Grund" },
];

const EVENT_OPTIONS: {
  value: EventType;
  title: string;
}[] = [
  { value: "vacation", title: "Urlaub" },
  { value: "wedding", title: "Hochzeit" },
  { value: "competition", title: "Sportwettbewerb" },
  { value: "summer", title: "Sommer" },
  { value: "reunion", title: "Wiedersehen" },
  { value: "other", title: "Etwas anderes" },
  { value: "none", title: "Kein besonderes Event" },
];

const LIFESTYLE_OPTIONS: {
  value: WorkLifestyle;
  title: string;
  subtitle: string;
}[] = [
  {
    value: "sitting",
    title: "Ich sitze viel",
    subtitle: "Meistens sitzend, z.B. Bürojob",
  },
  {
    value: "standing",
    title: "Ich stehe viel",
    subtitle: "Meistens stehend, z.B. Lehrkraft",
  },
  {
    value: "walking",
    title: "Ich gehe viel",
    subtitle: "Meistens laufend, z.B. Verkauf",
  },
  {
    value: "physical",
    title: "Körperlich harte Arbeit",
    subtitle: "Körperlich anstrengend, z.B. Baustelle",
  },
];

const ACTIVITY_OPTIONS: {
  value: ActivityLevel;
  title: string;
  subtitle: string;
}[] = [
  {
    value: "low",
    title: "Wenig aktiv",
    subtitle: "Kaum Bewegung außerhalb des Alltags",
  },
  {
    value: "moderate",
    title: "Mittel",
    subtitle: "Regelmäßige Bewegung und etwas Training",
  },
  {
    value: "high",
    title: "Sehr aktiv",
    subtitle: "Viel Bewegung oder häufiges Training",
  },
];

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; title: string }[] = [
  { value: "beginner", title: "Anfänger" },
  { value: "intermediate", title: "Fortgeschritten" },
  { value: "advanced", title: "Sehr erfahren" },
];

const WORKOUT_OPTIONS: { value: WorkoutsPerWeek; title: string }[] = [
  { value: "0", title: "Gar nicht" },
  { value: "1_2", title: "1–2x / Woche" },
  { value: "3_4", title: "3–4x / Woche" },
  { value: "5_plus", title: "5x+ / Woche" },
];

const PAIN_OPTIONS: { value: PainPoint; title: string }[] = [
  { value: "cravings", title: "Heißhunger zu widerstehen" },
  { value: "motivation", title: "Motiviert zu bleiben" },
  { value: "portion_control", title: "Kleinere Portionen zu essen" },
  { value: "food_knowledge", title: "Zu wissen, was ich essen kann" },
  { value: "time", title: "Zeit dafür zu finden" },
  { value: "energy", title: "Mehr Energie zu haben" },
  { value: "training_consistency", title: "Regelmäßig zu trainieren" },
  { value: "other", title: "Etwas anderes" },
];

const DIET_OPTIONS: {
  value: DietPreference;
  title: string;
}[] = [
  { value: "classic", title: "Klassisch" },
  { value: "pescetarian", title: "Pescetarisch" },
  { value: "vegetarian", title: "Vegetarisch" },
  { value: "vegan", title: "Vegan" },
  { value: "high_protein", title: "High Protein" },
  { value: "flexible", title: "Flexibel" },
  { value: "none", title: "Keine Präferenz" },
];

const START_OPTIONS: {
  value: StartMode;
  title: string;
  subtitle: string;
  icon: string;
}[] = [
  {
    value: "smart",
    title: "Smart Setup",
    subtitle: "Wir erstellen automatisch passende Start-Cards für dein Ziel",
    icon: "✨",
  },
  {
    value: "template",
    title: "Vorlage wählen",
    subtitle: "Starte mit einem Preset, das zu deinem Fokus passt",
    icon: "🧩",
  },
  {
    value: "blank",
    title: "Leer starten",
    subtitle: "Starte mit einem leeren Dashboard und richte alles selbst ein",
    icon: "🪄",
  },
];

const TEMPLATE_OPTIONS: {
  value: TemplatePreset;
  title: string;
  subtitle: string;
}[] = [
  {
    value: "weight_loss_starter",
    title: "Weight Loss Starter",
    subtitle: "Gewicht, Schritte, Kalorien, Schlaf, Wasser",
  },
  {
    value: "muscle_gain_starter",
    title: "Muscle Gain Starter",
    subtitle: "Gewicht, Protein, Workout, Schlaf, Kraftwerte",
  },
  {
    value: "general_health_starter",
    title: "General Health Starter",
    subtitle: "Schlaf, Schritte, Wasser, Gewicht, Energie",
  },
  {
    value: "cardio_starter",
    title: "Cardio Starter",
    subtitle: "Schritte, Cardio, Pace, Schlaf, Ausdauer",
  },
  {
    value: "coach_ready_starter",
    title: "Coach Ready Starter",
    subtitle: "Klar strukturierte Basis für Austausch mit Coaches",
  },
  {
    value: "minimal_tracker",
    title: "Minimal Tracker",
    subtitle: "Nur die wichtigsten 2–3 Startmetriken",
  },
];

function StepShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#1a1a24] border border-white/10 rounded-3xl p-6 sm:p-8">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#FFD300] font-semibold">
          {eyebrow}
        </p>
        <h2 className="text-2xl sm:text-3xl font-semibold text-white mt-2">
          {title}
        </h2>
        <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-2xl">
          {subtitle}
        </p>
      </div>
      {children}
    </div>
  );
}

function OptionCard({
  selected,
  title,
  subtitle,
  icon,
  onClick,
}: {
  selected: boolean;
  title: string;
  subtitle?: string;
  icon?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-4 transition-all ${
        selected
          ? "border-[#FFD300]/50 bg-[#FFD300]/10"
          : "border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20"
      }`}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0">
            {icon}
          </div>
        ) : null}
        <div>
          <p className="text-white font-medium">{title}</p>
          {subtitle ? (
            <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function ChoiceChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
        active
          ? "bg-[#FFD300] border-[#FFD300] text-[#0f0f13]"
          : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:border-white/20"
      }`}
    >
      {label}
    </button>
  );
}

function MultiSelectCard({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-4 transition-all flex items-center justify-between gap-3 ${
        active
          ? "border-[#FFD300]/50 bg-[#FFD300]/10"
          : "border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20"
      }`}
    >
      <span className="text-white">{label}</span>
      <div
        className={`w-5 h-5 rounded-md border flex items-center justify-center ${
          active
            ? "bg-[#FFD300] border-[#FFD300]"
            : "border-white/20 bg-transparent"
        }`}
      >
        {active ? (
          <svg
            className="w-3 h-3 text-[#0f0f13]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : null}
      </div>
    </button>
  );
}

function buildPresetSummary(data: OnboardingData): string[] {
  if (data.startMode === "blank") return ["Leeres Dashboard", "Keine Presets"];
  if (data.startMode === "template") {
    const selected = TEMPLATE_OPTIONS.find(
      (t) => t.value === data.selectedTemplate
    );
    return [selected?.title ?? "Vorlage", selected?.subtitle ?? "Preset"];
  }

  switch (data.primaryGoal) {
    case "lose_fat":
      return ["Gewicht", "Schritte", "Kalorien", "Schlaf", "Wasser"];
    case "build_muscle":
      return ["Gewicht", "Protein", "Workout", "Schlaf", "Kraftwerte"];
    case "gain_weight":
      return ["Gewicht", "Kalorien", "Protein", "Workout"];
    case "fitness":
      return ["Schritte", "Cardio", "Pace", "Schlaf"];
    case "health":
      return ["Schlaf", "Wasser", "Gewicht", "Energie"];
    case "maintain":
      return ["Gewicht", "Schritte", "Schlaf", "Kalorien"];
    default:
      return ["Gewicht", "Schritte", "Schlaf"];
  }
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(() => loadDraft());

  const totalSteps = 8;
  const progress = ((step + 1) / totalSteps) * 100;

  const bmi = useMemo(
    () => calculateBmi(data.heightCm, data.currentWeightKg),
    [data.heightCm, data.currentWeightKg]
  );

  const age = useMemo(
    () => calculateAge(data.birthDay, data.birthMonth, data.birthYear),
    [data.birthDay, data.birthMonth, data.birthYear]
  );

  const presetSummary = useMemo(() => buildPresetSummary(data), [data]);

  const patch = (next: Partial<OnboardingData>) => {
    setData((prev) => {
      const updated = { ...prev, ...next };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const togglePainPoint = (value: PainPoint) => {
    const exists = data.painPoints.includes(value);
    patch({
      painPoints: exists
        ? data.painPoints.filter((p) => p !== value)
        : [...data.painPoints, value],
    });
  };

  const canContinue = () => {
    if (step === 0) return Boolean(data.primaryGoal);
    if (step === 1) return Boolean(data.reason);
    if (step === 2) {
      if (data.reason !== "event") return true;
      if (!data.eventType) return false;
      if (data.eventType === "none") return true;
      return Boolean(data.eventDay && data.eventMonth && data.eventYear);
    }
    if (step === 3) {
      return Boolean(
        data.currentWeightKg &&
          data.heightCm &&
          data.birthDay &&
          data.birthMonth &&
          data.birthYear &&
          data.gender
      );
    }
    if (step === 4) {
      return Boolean(
        data.workLifestyle &&
          data.activityLevel &&
          data.experienceLevel &&
          data.workoutsPerWeek
      );
    }
    if (step === 5) return data.painPoints.length > 0;
    if (step === 6) return Boolean(data.dietPreference);
    if (step === 7) {
      if (!data.startMode) return false;
      if (data.startMode === "template") return Boolean(data.selectedTemplate);
      return true;
    }
    return true;
  };

  const handleContinue = () => {
    if (step < totalSteps - 1) {
      setStep((prev) => prev + 1);
      return;
    }

    localStorage.setItem(COMPLETED_KEY, "true");
    console.log("Onboarding complete", data);
  };

  const handleBack = () => {
    if (step > 0) setStep((prev) => prev - 1);
  };

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFD300]/10 border border-[#FFD300]/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-[#FFD300]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">AthletiQ</p>
              <p className="text-slate-500 text-xs">Smart onboarding</p>
            </div>
          </div>

          <div className="hidden sm:block text-right">
            <p className="text-slate-400 text-xs">
              Step {step + 1} of {totalSteps}
            </p>
            <p className="text-white text-sm font-medium">
              {step === 0 && "Dein Ziel"}
              {step === 1 && "Dein Warum"}
              {step === 2 && "Event"}
              {step === 3 && "Ausgangslage"}
              {step === 4 && "Aktivität"}
              {step === 5 && "Hürden"}
              {step === 6 && "Ernährung"}
              {step === 7 && "Dein Start"}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <div className="h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
            <div
              className="h-full bg-[#FFD300] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {step === 0 && (
          <StepShell
            eyebrow="Ziel"
            title="Was ist dein Hauptziel?"
            subtitle="Wir richten dein Dashboard später passend dazu ein. Du kannst alles später noch anpassen."
          >
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {GOAL_OPTIONS.map((goal) => (
                <OptionCard
                  key={goal.value}
                  selected={data.primaryGoal === goal.value}
                  title={goal.title}
                  subtitle={goal.subtitle}
                  icon={goal.icon}
                  onClick={() => patch({ primaryGoal: goal.value })}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell
            eyebrow="Motivation"
            title="Warum möchtest du das erreichen?"
            subtitle="Der Grund dahinter hilft später bei Zielen, Texten, Tipps und Erinnerungston."
          >
            <div className="space-y-3">
              {REASON_OPTIONS.map((reason) => (
                <OptionCard
                  key={reason.value}
                  selected={data.reason === reason.value}
                  title={reason.title}
                  onClick={() => patch({ reason: reason.value })}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell
            eyebrow="Event"
            title="Gibt es ein Event, das dich motiviert?"
            subtitle="Optional. Besonders hilfreich, wenn du auf ein klares Ziel oder Datum hinarbeitest."
          >
            {data.reason !== "event" ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-white font-medium">Kein Event nötig</p>
                <p className="text-slate-400 text-sm mt-2">
                  Du hast kein zielgebundenes Event gewählt. Du kannst diesen
                  Schritt einfach weitergehen.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-3">
                  {EVENT_OPTIONS.map((event) => (
                    <OptionCard
                      key={event.value}
                      selected={data.eventType === event.value}
                      title={event.title}
                      onClick={() => patch({ eventType: event.value })}
                    />
                  ))}
                </div>

                {data.eventType && data.eventType !== "none" && (
                  <div className="grid sm:grid-cols-3 gap-4 max-w-3xl">
                    <div>
                      <label className="block text-sm text-slate-300 mb-1.5">
                        Tag
                      </label>
                      <input
                        value={data.eventDay}
                        onChange={(e) => patch({ eventDay: e.target.value })}
                        type="number"
                        placeholder="12"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD300]/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-1.5">
                        Monat
                      </label>
                      <input
                        value={data.eventMonth}
                        onChange={(e) => patch({ eventMonth: e.target.value })}
                        type="number"
                        placeholder="08"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD300]/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-1.5">
                        Jahr
                      </label>
                      <input
                        value={data.eventYear}
                        onChange={(e) => patch({ eventYear: e.target.value })}
                        type="number"
                        placeholder="2026"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD300]/50 transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </StepShell>
        )}

        {step === 3 && (
          <StepShell
            eyebrow="Ausgangslage"
            title="Lass uns deinen Startpunkt festlegen"
            subtitle="Diese Werte helfen später bei Fortschritt, BMI, Zielrichtung und sinnvollen Presets."
          >
            <div className="grid lg:grid-cols-[1fr_0.8fr] gap-6">
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1.5">
                      Aktuelles Gewicht
                    </label>
                    <div className="relative">
                      <input
                        value={data.currentWeightKg}
                        onChange={(e) =>
                          patch({ currentWeightKg: e.target.value })
                        }
                        placeholder="78"
                        type="number"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD300]/50 transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                        kg
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-1.5">
                      Zielgewicht{" "}
                      <span className="text-slate-500">(optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        value={data.targetWeightKg}
                        onChange={(e) =>
                          patch({ targetWeightKg: e.target.value })
                        }
                        placeholder="72"
                        type="number"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD300]/50 transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                        kg
                      </span>
                    </div>
                  </div>
                </div>

                <div className="max-w-xs">
                  <label className="block text-sm text-slate-300 mb-1.5">
                    Größe
                  </label>
                  <div className="relative">
                    <input
                      value={data.heightCm}
                      onChange={(e) => patch({ heightCm: e.target.value })}
                      placeholder="180"
                      type="number"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD300]/50 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      cm
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">
                    Geburtsdatum
                  </label>
                  <div className="grid sm:grid-cols-3 gap-4 max-w-3xl">
                    <input
                      value={data.birthDay}
                      onChange={(e) => patch({ birthDay: e.target.value })}
                      type="number"
                      placeholder="Tag"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD300]/50 transition-all"
                    />
                    <input
                      value={data.birthMonth}
                      onChange={(e) => patch({ birthMonth: e.target.value })}
                      type="number"
                      placeholder="Monat"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD300]/50 transition-all"
                    />
                    <input
                      value={data.birthYear}
                      onChange={(e) => patch({ birthYear: e.target.value })}
                      type="number"
                      placeholder="Jahr"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD300]/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-3">
                    Geschlecht
                  </label>
                  <div className="grid sm:grid-cols-2 gap-3 max-w-3xl">
                    {[
                      { value: "female", label: "Weiblich" },
                      { value: "male", label: "Männlich" },
                      { value: "other", label: "Divers" },
                      {
                        value: "prefer_not_to_say",
                        label: "Möchte ich nicht angeben",
                      },
                    ].map((option) => (
                      <OptionCard
                        key={option.value}
                        selected={data.gender === option.value}
                        title={option.label}
                        onClick={() =>
                          patch({ gender: option.value as Gender })
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 h-fit">
                <p className="text-slate-400 text-sm">Quick preview</p>
                <div className="mt-4 rounded-2xl border border-[#FFD300]/20 bg-[#FFD300]/5 p-5">
                  <p className="text-[#FFD300] text-xs uppercase tracking-[0.18em] font-semibold">
                    Startwert
                  </p>
                  <p className="text-4xl font-semibold text-white mt-2">
                    {bmi ?? "—"}
                  </p>
                  <p className="text-slate-300 text-sm mt-2">
                    {getBmiCategory(bmi)}
                  </p>
                  <p className="text-slate-500 text-xs mt-4">
                    Alter: {age ?? "—"} · Zielgewicht:{" "}
                    {data.targetWeightKg || "—"} kg
                  </p>
                </div>
              </div>
            </div>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell
            eyebrow="Aktivität"
            title="Wie sieht dein Alltag aktuell aus?"
            subtitle="So versteht die App deinen echten Startpunkt und schlägt passendere Presets und Ziele vor."
          >
            <div className="space-y-7">
              <div>
                <p className="text-sm text-slate-300 mb-3">Alltag</p>
                <div className="grid md:grid-cols-2 gap-4">
                  {LIFESTYLE_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.value}
                      selected={data.workLifestyle === option.value}
                      title={option.title}
                      subtitle={option.subtitle}
                      onClick={() => patch({ workLifestyle: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-300 mb-3">
                  Allgemeines Aktivitätsniveau
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  {ACTIVITY_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.value}
                      selected={data.activityLevel === option.value}
                      title={option.title}
                      subtitle={option.subtitle}
                      onClick={() => patch({ activityLevel: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-300 mb-3">
                  Trainingserfahrung
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option.value}
                      active={data.experienceLevel === option.value}
                      label={option.title}
                      onClick={() => patch({ experienceLevel: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-300 mb-3">
                  Wie oft trainierst du aktuell?
                </p>
                <div className="flex flex-wrap gap-2">
                  {WORKOUT_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option.value}
                      active={data.workoutsPerWeek === option.value}
                      label={option.title}
                      onClick={() => patch({ workoutsPerWeek: option.value })}
                    />
                  ))}
                </div>
              </div>
            </div>
          </StepShell>
        )}

        {step === 5 && (
          <StepShell
            eyebrow="Hürden"
            title="Was fällt dir aktuell am schwersten?"
            subtitle="Diese Infos können später Reminder, Coach-Ansichten und Tipps viel hilfreicher machen."
          >
            <div className="space-y-3">
              {PAIN_OPTIONS.map((option) => (
                <MultiSelectCard
                  key={option.value}
                  active={data.painPoints.includes(option.value)}
                  label={option.title}
                  onClick={() => togglePainPoint(option.value)}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 6 && (
          <StepShell
            eyebrow="Ernährung"
            title="Wie ernährst du dich aktuell?"
            subtitle="Das muss noch kein Food-Tracking sein. Es hilft nur, spätere Empfehlungen besser auszurichten."
          >
            <div className="grid md:grid-cols-2 gap-4">
              {DIET_OPTIONS.map((option) => (
                <OptionCard
                  key={option.value}
                  selected={data.dietPreference === option.value}
                  title={option.title}
                  onClick={() => patch({ dietPreference: option.value })}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 7 && (
          <StepShell
            eyebrow="Startmodus"
            title="Wie möchtest du starten?"
            subtitle="Du kannst dir direkt ein sinnvolles Setup erstellen lassen, eine Vorlage wählen oder komplett leer beginnen."
          >
            <div className="grid md:grid-cols-3 gap-4">
              {START_OPTIONS.map((option) => (
                <OptionCard
                  key={option.value}
                  selected={data.startMode === option.value}
                  title={option.title}
                  subtitle={option.subtitle}
                  icon={option.icon}
                  onClick={() =>
                    patch({
                      startMode: option.value,
                      selectedTemplate:
                        option.value === "template"
                          ? data.selectedTemplate
                          : null,
                    })
                  }
                />
              ))}
            </div>

            {data.startMode === "template" && (
              <div className="mt-6">
                <p className="text-sm text-slate-300 mb-3">Vorlage wählen</p>
                <div className="grid md:grid-cols-2 gap-4">
                  {TEMPLATE_OPTIONS.map((template) => (
                    <OptionCard
                      key={template.value}
                      selected={data.selectedTemplate === template.value}
                      title={template.title}
                      subtitle={template.subtitle}
                      onClick={() =>
                        patch({ selectedTemplate: template.value })
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-white font-medium">
                Was als Nächstes passiert
              </p>
              <p className="text-slate-400 text-sm mt-2">
                Nach dem Abschluss kann die App direkt mit einem passenden
                Dashboard starten.
              </p>

              <div className="flex flex-wrap gap-2 mt-4">
                {presetSummary.map((item) => (
                  <span
                    key={item}
                    className="px-3 py-1.5 rounded-xl text-sm border border-[#FFD300]/20 bg-[#FFD300]/10 text-[#FFD300]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </StepShell>
        )}

        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue()}
            className="px-5 py-2.5 rounded-xl bg-[#FFD300] hover:bg-[#e6be00] disabled:opacity-40 text-[#0f0f13] font-medium transition-colors"
          >
            {step === totalSteps - 1 ? "Finish setup" : "Continue"}
          </button>
        </div>
      </main>
    </div>
  );
}
