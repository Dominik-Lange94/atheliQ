import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import BrandLogo from "../../components/layout/BrandLogo";

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

type GoalSpeed = "gentle" | "balanced" | "aggressive";
type TrainingLocation = "gym" | "home" | "outdoor" | "mixed";
type EquipmentLevel = "none" | "basic" | "full_gym";
type SleepQuality = "poor" | "okay" | "good";
type StressLevel = "low" | "moderate" | "high";
type MealStructure = "unstructured" | "somewhat_structured" | "structured";
type AiTone = "supportive" | "direct" | "coach_like";
type UnitSystem = "metric" | "imperial";

type Limitation =
  | "none"
  | "back"
  | "knee"
  | "shoulder"
  | "low_energy"
  | "medical"
  | "other";

type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

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

  goalSpeed: GoalSpeed | null;
  trainingLocation: TrainingLocation | null;
  equipmentLevel: EquipmentLevel | null;
  sleepQuality: SleepQuality | null;
  stressLevel: StressLevel | null;
  mealStructure: MealStructure | null;
  aiTone: AiTone | null;
  unitSystem: UnitSystem | null;
  availableDays: Weekday[];
  limitations: Limitation[];
  notes: string;
};

type AuthUser = {
  _id: string;
  name: string;
  email: string;
  role: "athlete" | "coach";
  onboardingCompleted?: boolean;
};

const STORAGE_KEY = "fittrack_onboarding_v3_draft";
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

  goalSpeed: null,
  trainingLocation: null,
  equipmentLevel: null,
  sleepQuality: null,
  stressLevel: null,
  mealStructure: null,
  aiTone: null,
  unitSystem: "metric",
  availableDays: [],
  limitations: [],
  notes: "",
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

function formatWeightDelta(currentWeightKg: string, targetWeightKg: string) {
  const current = Number(currentWeightKg);
  const target = Number(targetWeightKg);
  if (!current || !target) return null;
  return Number((target - current).toFixed(1));
}

function isoFromParts(day: string, month: string, year: string): string | null {
  if (!day || !month || !year) return null;
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const yyyy = String(year);
  return `${yyyy}-${mm}-${dd}`;
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

const REASON_OPTIONS: { value: Reason; title: string }[] = [
  { value: "confidence", title: "Für mein Selbstbewusstsein" },
  { value: "health", title: "Für meine Gesundheit" },
  { value: "fitness", title: "Für meine Fitness" },
  { value: "event", title: "Für ein Event / Anlass" },
  { value: "feel_better", title: "Um mich wohler zu fühlen" },
  { value: "other", title: "Aus einem anderen Grund" },
];

const EVENT_OPTIONS: { value: EventType; title: string }[] = [
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

const DIET_OPTIONS: { value: DietPreference; title: string }[] = [
  { value: "classic", title: "Klassisch" },
  { value: "pescetarian", title: "Pescetarisch" },
  { value: "vegetarian", title: "Vegetarisch" },
  { value: "vegan", title: "Vegan" },
  { value: "high_protein", title: "High Protein" },
  { value: "flexible", title: "Flexibel" },
  { value: "none", title: "Keine Präferenz" },
];

const GOAL_SPEED_OPTIONS: {
  value: GoalSpeed;
  title: string;
  subtitle: string;
}[] = [
  {
    value: "gentle",
    title: "Sanft",
    subtitle: "Nachhaltig und mit wenig Druck",
  },
  {
    value: "balanced",
    title: "Ausgewogen",
    subtitle: "Guter Mix aus Tempo und Alltagstauglichkeit",
  },
  {
    value: "aggressive",
    title: "Ambitioniert",
    subtitle: "Schnellerer Fokus, wenn dein Alltag das hergibt",
  },
];

const TRAINING_LOCATION_OPTIONS: {
  value: TrainingLocation;
  title: string;
  subtitle: string;
}[] = [
  {
    value: "gym",
    title: "Fitnessstudio",
    subtitle: "Zugang zu Geräten und Gewichten",
  },
  {
    value: "home",
    title: "Zuhause",
    subtitle: "Home-Workouts oder kleines Setup",
  },
  {
    value: "outdoor",
    title: "Draußen",
    subtitle: "Laufen, Walken, Calisthenics, Sportplatz",
  },
  { value: "mixed", title: "Gemischt", subtitle: "Je nach Zeit und Situation" },
];

const EQUIPMENT_OPTIONS: {
  value: EquipmentLevel;
  title: string;
  subtitle: string;
}[] = [
  { value: "none", title: "Kein Equipment", subtitle: "Nur Körpergewicht" },
  {
    value: "basic",
    title: "Basis-Equipment",
    subtitle: "Kurzhanteln, Bänder, Matte etc.",
  },
  {
    value: "full_gym",
    title: "Volles Gym",
    subtitle: "Maschinen, Hanteln, volle Auswahl",
  },
];

const SLEEP_OPTIONS: { value: SleepQuality; title: string }[] = [
  { value: "poor", title: "Eher schlecht" },
  { value: "okay", title: "Okay" },
  { value: "good", title: "Gut" },
];

const STRESS_OPTIONS: { value: StressLevel; title: string }[] = [
  { value: "low", title: "Niedrig" },
  { value: "moderate", title: "Mittel" },
  { value: "high", title: "Hoch" },
];

const MEAL_STRUCTURE_OPTIONS: { value: MealStructure; title: string }[] = [
  { value: "unstructured", title: "Eher ungeordnet" },
  { value: "somewhat_structured", title: "Teils strukturiert" },
  { value: "structured", title: "Klar strukturiert" },
];

const AI_TONE_OPTIONS: { value: AiTone; title: string; subtitle: string }[] = [
  {
    value: "supportive",
    title: "Supportive",
    subtitle: "Freundlich, motivierend, weich",
  },
  {
    value: "direct",
    title: "Direkt",
    subtitle: "Klar, knapp, ehrlich",
  },
  {
    value: "coach_like",
    title: "Coach-like",
    subtitle: "Strukturiert, sachlich, führend",
  },
];

const UNIT_OPTIONS: { value: UnitSystem; title: string }[] = [
  { value: "metric", title: "Metrisch (kg, cm)" },
  { value: "imperial", title: "Imperial (lb, ft)" },
];

const LIMITATION_OPTIONS: { value: Limitation; title: string }[] = [
  { value: "none", title: "Keine Einschränkung" },
  { value: "back", title: "Rücken" },
  { value: "knee", title: "Knie" },
  { value: "shoulder", title: "Schulter" },
  { value: "low_energy", title: "Wenig Energie / Erschöpfung" },
  { value: "medical", title: "Medizinische Einschränkung" },
  { value: "other", title: "Etwas anderes" },
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

const WEEKDAY_OPTIONS: { value: Weekday; label: string }[] = [
  { value: "mon", label: "Mo" },
  { value: "tue", label: "Di" },
  { value: "wed", label: "Mi" },
  { value: "thu", label: "Do" },
  { value: "fri", label: "Fr" },
  { value: "sat", label: "Sa" },
  { value: "sun", label: "So" },
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
    <div className="rounded-3xl border border-subtle bg-surface p-6 sm:p-8">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#FFD300] font-semibold">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-primary sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
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
          : "border-subtle bg-surface hover:border-strong hover:bg-surface-2"
      }`}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-subtle bg-surface-2 text-xl">
            {icon}
          </div>
        ) : null}
        <div>
          <p className="font-medium text-primary">{title}</p>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
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
          ? "border-[#FFD300] bg-[#FFD300] text-[#0f0f13]"
          : "border-subtle bg-surface text-secondary hover:border-strong hover:text-primary"
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
          : "border-subtle bg-surface hover:border-strong hover:bg-surface-2"
      }`}
    >
      <span className="text-primary">{label}</span>
      <div
        className={`w-5 h-5 rounded-md border flex items-center justify-center ${
          active
            ? "bg-[#FFD300] border-[#FFD300]"
            : "border-subtle bg-transparent"
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

function InfoCard({
  title,
  text,
  accent = "cyan",
}: {
  title: string;
  text: string;
  accent?: "cyan" | "yellow";
}) {
  const styles =
    accent === "yellow"
      ? "border-[#FFD300]/20 bg-[#FFD300]/5 text-[#FFD300]"
      : "border-cyan-400/20 bg-cyan-400/5 text-cyan-300";

  return (
    <div className={`rounded-2xl border p-5 ${styles}`}>
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
            accent === "yellow"
              ? "bg-[#FFD300]/10 border-[#FFD300]/20"
              : "bg-cyan-400/10 border-cyan-400/20"
          }`}
        >
          <span className="text-lg">⌚</span>
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm leading-6 mt-1 text-slate-300">{text}</p>
        </div>
      </div>
    </div>
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

function stepTitle(step: number) {
  switch (step) {
    case 0:
      return "Dein Ziel";
    case 1:
      return "Dein Warum";
    case 2:
      return "Event";
    case 3:
      return "Ausgangslage";
    case 4:
      return "Aktivität";
    case 5:
      return "Hürden";
    case 6:
      return "Ernährung";
    case 7:
      return "Training Setup";
    case 8:
      return "Recovery & KI";
    case 9:
      return "Dein Start";
    default:
      return "Onboarding";
  }
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(() => loadDraft());
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const totalSteps = 10;
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

  const weightDelta = useMemo(
    () => formatWeightDelta(data.currentWeightKg, data.targetWeightKg),
    [data.currentWeightKg, data.targetWeightKg]
  );

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

  const toggleLimitation = (value: Limitation) => {
    if (value === "none") {
      patch({
        limitations: data.limitations.includes("none") ? [] : ["none"],
      });
      return;
    }

    const next = data.limitations.filter((item) => item !== "none");
    const exists = next.includes(value);

    patch({
      limitations: exists
        ? next.filter((item) => item !== value)
        : [...next, value],
    });
  };

  const toggleDay = (value: Weekday) => {
    const exists = data.availableDays.includes(value);
    patch({
      availableDays: exists
        ? data.availableDays.filter((d) => d !== value)
        : [...data.availableDays, value],
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
          data.workoutsPerWeek &&
          data.goalSpeed
      );
    }

    if (step === 5) return data.painPoints.length > 0;
    if (step === 6) return Boolean(data.dietPreference && data.mealStructure);

    if (step === 7) {
      return Boolean(
        data.trainingLocation &&
          data.equipmentLevel &&
          data.availableDays.length > 0
      );
    }

    if (step === 8) {
      return Boolean(
        data.sleepQuality &&
          data.stressLevel &&
          data.aiTone &&
          data.unitSystem &&
          data.limitations.length > 0
      );
    }

    if (step === 9) {
      if (!data.startMode) return false;
      if (data.startMode === "template") return Boolean(data.selectedTemplate);
      return true;
    }

    return true;
  };

  const buildPayload = () => {
    return {
      currentWeightKg: data.currentWeightKg
        ? Number(data.currentWeightKg)
        : null,
      targetWeightKg: data.targetWeightKg ? Number(data.targetWeightKg) : null,
      heightCm: data.heightCm ? Number(data.heightCm) : null,
      birthDate: isoFromParts(data.birthDay, data.birthMonth, data.birthYear),
      gender: data.gender,

      primaryGoal: data.primaryGoal,
      reason: data.reason,
      eventType: data.eventType,
      eventDate:
        data.reason === "event" && data.eventType && data.eventType !== "none"
          ? isoFromParts(data.eventDay, data.eventMonth, data.eventYear)
          : null,

      workLifestyle: data.workLifestyle,
      activityLevel: data.activityLevel,
      experienceLevel: data.experienceLevel,
      workoutsPerWeek: data.workoutsPerWeek,
      goalSpeed: data.goalSpeed,

      painPoints: data.painPoints,
      dietPreference: data.dietPreference,
      mealStructure: data.mealStructure,

      trainingLocation: data.trainingLocation,
      equipmentLevel: data.equipmentLevel,
      availableDays: data.availableDays,

      sleepQuality: data.sleepQuality,
      stressLevel: data.stressLevel,
      aiTone: data.aiTone,
      unitSystem: data.unitSystem,
      limitations: data.limitations,
      notes: data.notes.trim(),

      startMode: data.startMode,
      selectedTemplate: data.selectedTemplate,
    };
  };

  const handleContinue = async () => {
    setServerError("");

    if (step < totalSteps - 1) {
      setStep((prev) => prev + 1);
      return;
    }

    try {
      setSubmitting(true);

      await api.post("/athlete/onboarding", buildPayload());

      localStorage.setItem(COMPLETED_KEY, "true");
      localStorage.removeItem(STORAGE_KEY);

      if (user) {
        const token = localStorage.getItem("token");
        if (token) {
          const updatedUser: AuthUser = {
            ...(user as AuthUser),
            onboardingCompleted: true,
          };
          login(token, updatedUser);
        }
      }

      navigate("/athlete", { replace: true });
    } catch (error: any) {
      console.error("Failed to complete onboarding", error);
      setServerError(
        error?.response?.data?.error ??
          error?.message ??
          "Onboarding konnte nicht gespeichert werden."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (submitting) return;
    if (step > 0) setStep((prev) => prev - 1);
  };

  return (
    <div className="min-h-screen bg-app">
      <header className="border-b border-subtle px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo imageClassName="h-9 w-auto" />

            <div>
              <p className="font-medium text-primary">SPAQ</p>
              <p className="text-xs text-muted">Smart onboarding</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-muted">
                Step {step + 1} of {totalSteps}
              </p>
              <p className="text-sm font-medium text-primary">
                {stepTitle(step)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <div className="h-2 overflow-hidden rounded-full border border-subtle bg-surface">
            <div
              className="h-full bg-[#FFD300] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {serverError && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {serverError}
          </div>
        )}

        {step === 0 && (
          <StepShell
            eyebrow="Ziel"
            title="Was ist dein Hauptziel?"
            subtitle="Wir richten dein Dashboard und spätere KI-Empfehlungen passend dazu aus."
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
            subtitle="Der Grund hilft später bei Zielen, Texten, Tipps und dem Ton deiner KI."
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
            subtitle="Optional. Hilfreich, wenn du auf ein klares Datum hinarbeitest."
          >
            {data.reason !== "event" ? (
              <div className="rounded-2xl border border-subtle bg-surface p-5">
                <p className="text-white font-medium">Kein Event nötig</p>
                <p className="text-slate-400 text-sm mt-2">
                  Du hast kein zielgebundenes Event gewählt. Diesen Schritt
                  kannst du einfach weitergehen.
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
                        className="w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-primary placeholder:text-muted focus:outline-none focus:border-[#FFD300]/50"
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
                        className="w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-primary placeholder:text-muted focus:outline-none focus:border-[#FFD300]/50"
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
                        className="w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-primary placeholder:text-muted focus:outline-none focus:border-[#FFD300]/50"
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
            subtitle="Diese Daten helfen bei Fortschritt, Zielrichtung und einem sinnvollen KI-Kontext."
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
                        className="w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-primary placeholder:text-muted focus:outline-none focus:border-[#FFD300]/50"
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
                        className="w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-primary placeholder:text-muted focus:outline-none focus:border-[#FFD300]/50"
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
                      className="w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-primary placeholder:text-muted focus:outline-none focus:border-[#FFD300]/50"
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
                      className="w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-primary placeholder:text-muted focus:outline-none focus:border-[#FFD300]/50"
                    />
                    <input
                      value={data.birthMonth}
                      onChange={(e) => patch({ birthMonth: e.target.value })}
                      type="number"
                      placeholder="Monat"
                      className="w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-primary placeholder:text-muted focus:outline-none focus:border-[#FFD300]/50"
                    />
                    <input
                      value={data.birthYear}
                      onChange={(e) => patch({ birthYear: e.target.value })}
                      type="number"
                      placeholder="Jahr"
                      className="w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-primary placeholder:text-muted focus:outline-none focus:border-[#FFD300]/50"
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

                <InfoCard
                  title="Daten automatisch statt manuell tracken"
                  text="Wenn du Werte aus Smartwatch, Google Fit, Health Connect oder unserer Mobile App übernehmen willst, kannst du das später verbinden. So bekommt auch SPAQ regelmäßigere und genauere Daten."
                />
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
                  {weightDelta !== null && (
                    <p className="text-slate-500 text-xs mt-1">
                      Veränderung: {weightDelta > 0 ? "+" : ""}
                      {weightDelta} kg
                    </p>
                  )}
                </div>
              </div>
            </div>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell
            eyebrow="Aktivität"
            title="Wie sieht dein Alltag aktuell aus?"
            subtitle="So versteht SPAQ deinen echten Startpunkt und kann realistischer planen."
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

              <div>
                <p className="text-sm text-slate-300 mb-3">
                  Wie schnell möchtest du vorgehen?
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  {GOAL_SPEED_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.value}
                      selected={data.goalSpeed === option.value}
                      title={option.title}
                      subtitle={option.subtitle}
                      onClick={() => patch({ goalSpeed: option.value })}
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
            subtitle="Diese Infos machen Tipps, Reminder und Coach-Hinweise deutlich relevanter."
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
            subtitle="Kein perfektes Food-Tracking nötig. Es geht um alltagstauglichen Kontext."
          >
            <div className="space-y-6">
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

              <div>
                <p className="text-sm text-slate-300 mb-3">
                  Wie strukturiert sind deine Mahlzeiten?
                </p>
                <div className="flex flex-wrap gap-2">
                  {MEAL_STRUCTURE_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option.value}
                      active={data.mealStructure === option.value}
                      label={option.title}
                      onClick={() => patch({ mealStructure: option.value })}
                    />
                  ))}
                </div>
              </div>
            </div>
          </StepShell>
        )}

        {step === 7 && (
          <StepShell
            eyebrow="Training Setup"
            title="Wie trainierst du realistisch?"
            subtitle="Damit dein Start-Setup wirklich zu deinem Alltag passt."
          >
            <div className="space-y-7">
              <div>
                <p className="text-sm text-slate-300 mb-3">Trainingsort</p>
                <div className="grid md:grid-cols-2 gap-4">
                  {TRAINING_LOCATION_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.value}
                      selected={data.trainingLocation === option.value}
                      title={option.title}
                      subtitle={option.subtitle}
                      onClick={() => patch({ trainingLocation: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-300 mb-3">Equipment</p>
                <div className="grid md:grid-cols-3 gap-4">
                  {EQUIPMENT_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.value}
                      selected={data.equipmentLevel === option.value}
                      title={option.title}
                      subtitle={option.subtitle}
                      onClick={() => patch({ equipmentLevel: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-300 mb-3">
                  An welchen Tagen ist Training realistisch?
                </p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((day) => (
                    <ChoiceChip
                      key={day.value}
                      active={data.availableDays.includes(day.value)}
                      label={day.label}
                      onClick={() => toggleDay(day.value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </StepShell>
        )}

        {step === 8 && (
          <StepShell
            eyebrow="Recovery & KI"
            title="Wie soll SPAQ mit dir arbeiten?"
            subtitle="So werden Ton, Empfehlungen und AI-Antworten passender."
          >
            <div className="space-y-7">
              <div>
                <p className="text-sm text-slate-300 mb-3">Schlafqualität</p>
                <div className="flex flex-wrap gap-2">
                  {SLEEP_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option.value}
                      active={data.sleepQuality === option.value}
                      label={option.title}
                      onClick={() => patch({ sleepQuality: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-300 mb-3">Stresslevel</p>
                <div className="flex flex-wrap gap-2">
                  {STRESS_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option.value}
                      active={data.stressLevel === option.value}
                      label={option.title}
                      onClick={() => patch({ stressLevel: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-300 mb-3">KI-Ton</p>
                <div className="grid md:grid-cols-3 gap-4">
                  {AI_TONE_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.value}
                      selected={data.aiTone === option.value}
                      title={option.title}
                      subtitle={option.subtitle}
                      onClick={() => patch({ aiTone: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-300 mb-3">Einheitensystem</p>
                <div className="flex flex-wrap gap-2">
                  {UNIT_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option.value}
                      active={data.unitSystem === option.value}
                      label={option.title}
                      onClick={() => patch({ unitSystem: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-300 mb-3">Einschränkungen</p>
                <div className="grid md:grid-cols-2 gap-3">
                  {LIMITATION_OPTIONS.map((option) => (
                    <MultiSelectCard
                      key={option.value}
                      active={data.limitations.includes(option.value)}
                      label={option.title}
                      onClick={() => toggleLimitation(option.value)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Noch etwas, das SPAQ oder ein Coach wissen sollte?
                </label>
                <textarea
                  value={data.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                  rows={5}
                  placeholder="Optional: z.B. Alltag, Schichtarbeit, frühere Verletzung, konkrete Ziele..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD300]/50 resize-none"
                />
              </div>
            </div>
          </StepShell>
        )}

        {step === 9 && (
          <StepShell
            eyebrow="Startmodus"
            title="Wie möchtest du starten?"
            subtitle="Wir speichern jetzt dein Profil und können direkt ein sinnvolles Setup vorbereiten."
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

            <div className="mt-6 space-y-6">
              <InfoCard
                title="Health Connect, Google Fit oder Smartwatch später verbinden"
                text="Wenn du deine Daten lieber automatisch übernehmen willst, kannst du sie später über unsere Mobile App oder Android Health/Health Connect anbinden. Dann landen Schritte, Schlaf und weitere Werte nicht nur manuell im System."
                accent="yellow"
              />

              <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6">
                <div className="rounded-2xl border border-subtle bg-surface p-5">
                  <p className="text-white font-medium">
                    Was als Nächstes passiert
                  </p>
                  <p className="text-slate-400 text-sm mt-2">
                    Nach dem Abschluss kann SPAQ mit einem passenden Profil,
                    einem besseren AI-Kontext und einem sinnvollen Dashboard
                    starten.
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

                <div className="rounded-2xl border border-[#FFD300]/20 bg-[#FFD300]/5 p-5">
                  <p className="text-[#FFD300] text-xs uppercase tracking-[0.18em] font-semibold">
                    Review
                  </p>
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="text-white">
                      Ziel:{" "}
                      <span className="text-slate-300">
                        {data.primaryGoal || "—"}
                      </span>
                    </p>
                    <p className="text-white">
                      Warum:{" "}
                      <span className="text-slate-300">
                        {data.reason || "—"}
                      </span>
                    </p>
                    <p className="text-white">
                      Training:{" "}
                      <span className="text-slate-300">
                        {data.trainingLocation || "—"} ·{" "}
                        {data.equipmentLevel || "—"}
                      </span>
                    </p>
                    <p className="text-white">
                      KI-Ton:{" "}
                      <span className="text-slate-300">
                        {data.aiTone || "—"}
                      </span>
                    </p>
                    <p className="text-white">
                      Verfügbare Tage:{" "}
                      <span className="text-slate-300">
                        {data.availableDays.length > 0
                          ? data.availableDays.join(", ")
                          : "—"}
                      </span>
                    </p>
                    <p className="text-white">
                      Hürden:{" "}
                      <span className="text-slate-300">
                        {data.painPoints.length > 0
                          ? data.painPoints.join(", ")
                          : "—"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </StepShell>
        )}

        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0 || submitting}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue() || submitting}
            className="px-5 py-2.5 rounded-xl bg-[#FFD300] hover:bg-[#e6be00] disabled:opacity-40 text-[#0f0f13] font-medium transition-colors"
          >
            {submitting
              ? "Wird gespeichert..."
              : step === totalSteps - 1
              ? "Finish setup"
              : "Continue"}
          </button>
        </div>
      </main>
    </div>
  );
}
