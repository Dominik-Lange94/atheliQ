import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

type EventType =
  | "vacation"
  | "wedding"
  | "competition"
  | "summer"
  | "reunion"
  | "other"
  | "none";

type GoalSpeed = "gentle" | "balanced" | "aggressive";
type TrainingLocation = "gym" | "home" | "outdoor" | "mixed";
type EquipmentLevel = "none" | "basic" | "full_gym";
type SleepQuality = "poor" | "okay" | "good";
type StressLevel = "low" | "moderate" | "high";
type MealStructure = "unstructured" | "somewhat_structured" | "structured";
type AiTone = "supportive" | "direct" | "coach_like";
type Limitation =
  | "none"
  | "back"
  | "knee"
  | "shoulder"
  | "low_energy"
  | "medical"
  | "other";
type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type AthleteProfileSettingsData = {
  targetWeightKg: string;

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
  goalSpeed: GoalSpeed | null;

  painPoints: PainPoint[];
  dietPreference: DietPreference | null;
  mealStructure: MealStructure | null;

  trainingLocation: TrainingLocation | null;
  equipmentLevel: EquipmentLevel | null;
  availableDays: Weekday[];

  sleepQuality: SleepQuality | null;
  stressLevel: StressLevel | null;
  aiTone: AiTone | null;
  limitations: Limitation[];
  notes: string;
};

type AthleteProfileResponse = {
  targetWeightKg?: number | null;

  primaryGoal?: PrimaryGoal | null;
  reason?: Reason | null;
  eventType?: EventType | null;
  eventDate?: string | null;

  workLifestyle?: WorkLifestyle | null;
  activityLevel?: ActivityLevel | null;
  experienceLevel?: ExperienceLevel | null;
  workoutsPerWeek?: WorkoutsPerWeek | null;
  goalSpeed?: GoalSpeed | null;

  painPoints?: PainPoint[];
  dietPreference?: DietPreference | null;
  mealStructure?: MealStructure | null;

  trainingLocation?: TrainingLocation | null;
  equipmentLevel?: EquipmentLevel | null;
  availableDays?: Weekday[];

  sleepQuality?: SleepQuality | null;
  stressLevel?: StressLevel | null;
  aiTone?: AiTone | null;
  limitations?: Limitation[];
  notes?: string;
};

const INITIAL_DATA: AthleteProfileSettingsData = {
  targetWeightKg: "",

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
  goalSpeed: null,

  painPoints: [],
  dietPreference: null,
  mealStructure: null,

  trainingLocation: null,
  equipmentLevel: null,
  availableDays: [],

  sleepQuality: null,
  stressLevel: null,
  aiTone: null,
  limitations: [],
  notes: "",
};

function isoFromParts(day: string, month: string, year: string): string | null {
  if (!day || !month || !year) return null;
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const yyyy = String(year);
  return `${yyyy}-${mm}-${dd}`;
}

function splitIsoDate(value?: string | null) {
  if (!value) return { day: "", month: "", year: "" };
  const [year = "", month = "", day = ""] = value.split("-");
  return { day, month, year };
}

function mapApiProfileToForm(
  profile?: AthleteProfileResponse | null
): AthleteProfileSettingsData {
  const eventParts = splitIsoDate(profile?.eventDate);

  return {
    targetWeightKg:
      profile?.targetWeightKg !== null && profile?.targetWeightKg !== undefined
        ? String(profile.targetWeightKg)
        : "",

    primaryGoal: profile?.primaryGoal ?? null,
    reason: profile?.reason ?? null,
    eventType: profile?.eventType ?? null,
    eventDay: eventParts.day,
    eventMonth: eventParts.month,
    eventYear: eventParts.year,

    workLifestyle: profile?.workLifestyle ?? null,
    activityLevel: profile?.activityLevel ?? null,
    experienceLevel: profile?.experienceLevel ?? null,
    workoutsPerWeek: profile?.workoutsPerWeek ?? null,
    goalSpeed: profile?.goalSpeed ?? null,

    painPoints: profile?.painPoints ?? [],
    dietPreference: profile?.dietPreference ?? null,
    mealStructure: profile?.mealStructure ?? null,

    trainingLocation: profile?.trainingLocation ?? null,
    equipmentLevel: profile?.equipmentLevel ?? null,
    availableDays: profile?.availableDays ?? [],

    sleepQuality: profile?.sleepQuality ?? null,
    stressLevel: profile?.stressLevel ?? null,
    aiTone: profile?.aiTone ?? null,
    limitations: profile?.limitations ?? [],
    notes: profile?.notes ?? "",
  };
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

const MEAL_STRUCTURE_OPTIONS: { value: MealStructure; title: string }[] = [
  { value: "unstructured", title: "Eher ungeordnet" },
  { value: "somewhat_structured", title: "Teils strukturiert" },
  { value: "structured", title: "Klar strukturiert" },
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

const WEEKDAY_OPTIONS: { value: Weekday; label: string }[] = [
  { value: "mon", label: "Mo" },
  { value: "tue", label: "Di" },
  { value: "wed", label: "Mi" },
  { value: "thu", label: "Do" },
  { value: "fri", label: "Fr" },
  { value: "sat", label: "Sa" },
  { value: "sun", label: "So" },
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

const LIMITATION_OPTIONS: { value: Limitation; title: string }[] = [
  { value: "none", title: "Keine Einschränkung" },
  { value: "back", title: "Rücken" },
  { value: "knee", title: "Knie" },
  { value: "shoulder", title: "Schulter" },
  { value: "low_energy", title: "Wenig Energie / Erschöpfung" },
  { value: "medical", title: "Medizinische Einschränkung" },
  { value: "other", title: "Etwas anderes" },
];

function SectionCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-subtle bg-surface p-6 sm:p-7">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FFD300]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-primary sm:text-2xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm text-muted">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
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
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        selected
          ? "border-[#FFD300]/50 bg-[#FFD300]/10"
          : "border-subtle bg-surface-2 hover:border-strong hover:bg-surface-3"
      }`}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-subtle bg-surface-3 text-xl">
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
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
        active
          ? "border-[#FFD300] bg-[#FFD300] text-[#0f0f13]"
          : "border-subtle bg-surface-2 text-secondary hover:border-strong hover:text-primary"
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
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all ${
        active
          ? "border-[#FFD300]/50 bg-[#FFD300]/10"
          : "border-subtle bg-surface-2 hover:border-strong hover:bg-surface-3"
      }`}
    >
      <span className="text-primary">{label}</span>
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-md border ${
          active
            ? "border-[#FFD300] bg-[#FFD300]"
            : "border-subtle bg-transparent"
        }`}
      >
        {active ? (
          <svg
            className="h-3 w-3 text-[#0f0f13]"
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

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
      <p className="font-medium text-cyan-500 dark:text-cyan-300">{title}</p>
      <p className="mt-2 text-sm leading-6 text-secondary">{text}</p>
    </div>
  );
}

function buildPayload(data: AthleteProfileSettingsData) {
  return {
    targetWeightKg: data.targetWeightKg ? Number(data.targetWeightKg) : null,

    primaryGoal: data.primaryGoal,
    reason: data.reason,
    eventType: data.reason === "event" ? data.eventType : null,
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
    limitations: data.limitations,
    notes: data.notes.trim(),
  };
}

function useAthleteProfile() {
  return useQuery({
    queryKey: ["athlete-profile"],
    queryFn: async () => {
      const { data } = await api.get("/athlete/profile");
      return (data.data ?? null) as AthleteProfileResponse | null;
    },
  });
}

function useUpdateAthleteProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReturnType<typeof buildPayload>) => {
      const { data } = await api.patch("/athlete/profile", payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["athlete-profile"] });
    },
  });
}

export default function AthleteProfileSettingsPage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useAthleteProfile();
  const updateProfile = useUpdateAthleteProfile();

  const [form, setForm] = useState<AthleteProfileSettingsData>(INITIAL_DATA);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (!isLoading && !hasInitialized) {
      setForm(mapApiProfileToForm(profile));
      setHasInitialized(true);
    }
  }, [isLoading, hasInitialized, profile]);

  useEffect(() => {
    if (!saveMessage) return;
    const timeout = window.setTimeout(() => setSaveMessage(""), 2500);
    return () => window.clearTimeout(timeout);
  }, [saveMessage]);

  const patch = (next: Partial<AthleteProfileSettingsData>) => {
    setForm((prev) => ({ ...prev, ...next }));
  };

  const togglePainPoint = (value: PainPoint) => {
    setForm((prev) => {
      const exists = prev.painPoints.includes(value);
      return {
        ...prev,
        painPoints: exists
          ? prev.painPoints.filter((p) => p !== value)
          : [...prev.painPoints, value],
      };
    });
  };

  const toggleDay = (value: Weekday) => {
    setForm((prev) => {
      const exists = prev.availableDays.includes(value);
      return {
        ...prev,
        availableDays: exists
          ? prev.availableDays.filter((d) => d !== value)
          : [...prev.availableDays, value],
      };
    });
  };

  const toggleLimitation = (value: Limitation) => {
    setForm((prev) => {
      if (value === "none") {
        return {
          ...prev,
          limitations: prev.limitations.includes("none") ? [] : ["none"],
        };
      }

      const next = prev.limitations.filter((item) => item !== "none");
      const exists = next.includes(value);

      return {
        ...prev,
        limitations: exists
          ? next.filter((item) => item !== value)
          : [...next, value],
      };
    });
  };

  const canSave = useMemo(() => {
    if (!form.primaryGoal) return false;
    if (!form.reason) return false;
    if (
      form.reason === "event" &&
      !(
        form.eventType &&
        (form.eventType === "none" ||
          (form.eventDay && form.eventMonth && form.eventYear))
      )
    ) {
      return false;
    }

    if (!form.workLifestyle) return false;
    if (!form.activityLevel) return false;
    if (!form.experienceLevel) return false;
    if (!form.workoutsPerWeek) return false;
    if (!form.goalSpeed) return false;

    if (!form.dietPreference) return false;
    if (!form.mealStructure) return false;

    if (!form.trainingLocation) return false;
    if (!form.equipmentLevel) return false;
    if (form.availableDays.length === 0) return false;

    if (!form.sleepQuality) return false;
    if (!form.stressLevel) return false;
    if (!form.aiTone) return false;
    if (form.limitations.length === 0) return false;

    return true;
  }, [form]);

  const handleSave = async () => {
    if (!canSave || updateProfile.isPending) return;

    setServerError("");
    setSaveMessage("");

    try {
      await updateProfile.mutateAsync(buildPayload(form));
      setSaveMessage("Änderungen gespeichert.");
    } catch (error: any) {
      console.error("Failed to update athlete profile", error);
      setServerError(
        error?.response?.data?.error ??
          error?.message ??
          "Profil konnte nicht gespeichert werden."
      );
    }
  };

  if (isLoading && !hasInitialized) {
    return (
      <div className="min-h-screen bg-app">
        <div className="flex h-screen items-center justify-center text-muted">
          Profil wird geladen…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app">
      <header className="sticky top-0 z-40 border-b border-subtle bg-app/55 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center gap-3">
            <Link
              to="/athlete"
              className="shrink-0 rounded-xl transition-opacity hover:opacity-85"
              title="Zum Dashboard"
            >
              <BrandLogo imageClassName="h-8 w-auto" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/athlete"
              className="rounded-xl border border-subtle bg-surface px-4 py-2 text-sm text-secondary transition-colors hover:border-strong hover:text-primary"
            >
              Zurück zum Dashboard
            </Link>

            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || updateProfile.isPending}
              className="rounded-xl bg-[#FFD300] px-4 py-2 text-sm font-medium text-[#0f0f13] transition-colors hover:bg-[#e6be00] disabled:opacity-40"
            >
              {updateProfile.isPending ? "Speichert..." : "Speichern"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-3xl border border-subtle bg-surface p-6">
            <p className="text-sm text-muted">
              Passe hier die variablen Teile deines Athlete-Profils an. Dinge
              wie Ziele, Alltag, Training, Recovery und AI-Ton können sich mit
              der Zeit ändern und sollen genau hier gepflegt werden.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-xl border border-[#FFD300]/20 bg-[#FFD300]/10 px-3 py-1.5 text-sm text-[#FFD300]">
                {user?.name ?? "Athlet"}
              </span>

              {form.primaryGoal ? (
                <span className="rounded-xl border border-subtle bg-surface-2 px-3 py-1.5 text-sm text-secondary">
                  Ziel: {form.primaryGoal}
                </span>
              ) : null}

              {form.aiTone ? (
                <span className="rounded-xl border border-subtle bg-surface-2 px-3 py-1.5 text-sm text-secondary">
                  KI-Ton: {form.aiTone}
                </span>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-[#FFD300]/20 bg-[#FFD300]/5 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FFD300]">
              Hinweis
            </p>
            <p className="mt-3 text-sm leading-6 text-secondary">
              Diese Änderungen sollten direkt Einfluss auf Motivation Bot,
              spätere Coach-Texte und AI-Empfehlungen haben. Stammdaten wie
              Geburtsdatum oder Gender bleiben bewusst außerhalb dieses Flows.
            </p>
          </div>
        </div>

        {serverError ? (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {serverError}
          </div>
        ) : null}

        {saveMessage ? (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {saveMessage}
          </div>
        ) : null}

        <div className="space-y-6">
          <SectionCard
            eyebrow="Goals"
            title="Ziele & Motivation"
            subtitle="Was du erreichen willst und warum du gerade daran arbeitest."
          >
            <div className="space-y-7">
              <div>
                <p className="mb-3 text-sm text-secondary">Hauptziel</p>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {GOAL_OPTIONS.map((goal) => (
                    <OptionCard
                      key={goal.value}
                      selected={form.primaryGoal === goal.value}
                      title={goal.title}
                      subtitle={goal.subtitle}
                      icon={goal.icon}
                      onClick={() => patch({ primaryGoal: goal.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm text-secondary">Warum</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {REASON_OPTIONS.map((reason) => (
                    <OptionCard
                      key={reason.value}
                      selected={form.reason === reason.value}
                      title={reason.title}
                      onClick={() =>
                        patch({
                          reason: reason.value,
                          eventType:
                            reason.value === "event" ? form.eventType : null,
                          eventDay:
                            reason.value === "event" ? form.eventDay : "",
                          eventMonth:
                            reason.value === "event" ? form.eventMonth : "",
                          eventYear:
                            reason.value === "event" ? form.eventYear : "",
                        })
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div>
                  <p className="mb-3 text-sm text-secondary">Zielgewicht</p>
                  <div className="max-w-xs">
                    <div className="relative">
                      <input
                        value={form.targetWeightKg}
                        onChange={(e) =>
                          patch({ targetWeightKg: e.target.value })
                        }
                        type="number"
                        placeholder="72"
                        className="w-full rounded-xl border border-subtle bg-surface-2 px-4 py-3 text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">
                        kg
                      </span>
                    </div>
                  </div>
                </div>

                <InfoCard
                  title="Profilziel statt Tageswert"
                  text="Das Zielgewicht gehört ins Profil. Das aktuelle Gewicht sollte später eher aus deinen echten Einträgen oder Metriken kommen."
                />
              </div>

              {form.reason === "event" && (
                <div className="rounded-2xl border border-subtle bg-surface-2 p-5">
                  <p className="mb-3 text-sm text-secondary">Event</p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {EVENT_OPTIONS.map((event) => (
                      <OptionCard
                        key={event.value}
                        selected={form.eventType === event.value}
                        title={event.title}
                        onClick={() => patch({ eventType: event.value })}
                      />
                    ))}
                  </div>

                  {form.eventType && form.eventType !== "none" ? (
                    <div className="mt-5 grid max-w-3xl gap-4 sm:grid-cols-3">
                      <div>
                        <label className="mb-1.5 block text-sm text-secondary">
                          Tag
                        </label>
                        <input
                          value={form.eventDay}
                          onChange={(e) => patch({ eventDay: e.target.value })}
                          type="number"
                          placeholder="12"
                          className="w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm text-secondary">
                          Monat
                        </label>
                        <input
                          value={form.eventMonth}
                          onChange={(e) =>
                            patch({ eventMonth: e.target.value })
                          }
                          type="number"
                          placeholder="08"
                          className="w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm text-secondary">
                          Jahr
                        </label>
                        <input
                          value={form.eventYear}
                          onChange={(e) => patch({ eventYear: e.target.value })}
                          type="number"
                          placeholder="2026"
                          className="w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Lifestyle"
            title="Alltag & Aktivität"
            subtitle="Dein echter Alltag, dein Bewegungslevel und dein realistisches Tempo."
          >
            <div className="space-y-7">
              <div>
                <p className="mb-3 text-sm text-secondary">Alltag</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {LIFESTYLE_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.value}
                      selected={form.workLifestyle === option.value}
                      title={option.title}
                      subtitle={option.subtitle}
                      onClick={() => patch({ workLifestyle: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm text-secondary">Aktivitätsniveau</p>
                <div className="grid gap-4 md:grid-cols-3">
                  {ACTIVITY_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.value}
                      selected={form.activityLevel === option.value}
                      title={option.title}
                      subtitle={option.subtitle}
                      onClick={() => patch({ activityLevel: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm text-secondary">
                  Trainingserfahrung
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option.value}
                      active={form.experienceLevel === option.value}
                      label={option.title}
                      onClick={() => patch({ experienceLevel: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm text-secondary">
                  Trainingshäufigkeit
                </p>
                <div className="flex flex-wrap gap-2">
                  {WORKOUT_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option.value}
                      active={form.workoutsPerWeek === option.value}
                      label={option.title}
                      onClick={() => patch({ workoutsPerWeek: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm text-secondary">Zieltempo</p>
                <div className="grid gap-4 md:grid-cols-3">
                  {GOAL_SPEED_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.value}
                      selected={form.goalSpeed === option.value}
                      title={option.title}
                      subtitle={option.subtitle}
                      onClick={() => patch({ goalSpeed: option.value })}
                    />
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Nutrition"
            title="Ernährung & Hürden"
            subtitle="Worauf du dich grob ausrichtest und was dich im Alltag ausbremst."
          >
            <div className="space-y-7">
              <div>
                <p className="mb-3 text-sm text-secondary">Ernährungsstil</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {DIET_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.value}
                      selected={form.dietPreference === option.value}
                      title={option.title}
                      onClick={() => patch({ dietPreference: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm text-secondary">
                  Mahlzeitenstruktur
                </p>
                <div className="flex flex-wrap gap-2">
                  {MEAL_STRUCTURE_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option.value}
                      active={form.mealStructure === option.value}
                      label={option.title}
                      onClick={() => patch({ mealStructure: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm text-secondary">
                  Aktuelle größte Hürden
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {PAIN_OPTIONS.map((option) => (
                    <MultiSelectCard
                      key={option.value}
                      active={form.painPoints.includes(option.value)}
                      label={option.title}
                      onClick={() => togglePainPoint(option.value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Training"
            title="Training Setup"
            subtitle="Wo und wie du realistisch trainierst und welche Tage für dich funktionieren."
          >
            <div className="space-y-7">
              <div>
                <p className="mb-3 text-sm text-secondary">Trainingsort</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {TRAINING_LOCATION_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.value}
                      selected={form.trainingLocation === option.value}
                      title={option.title}
                      subtitle={option.subtitle}
                      onClick={() => patch({ trainingLocation: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm text-secondary">Equipment</p>
                <div className="grid gap-4 md:grid-cols-3">
                  {EQUIPMENT_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.value}
                      selected={form.equipmentLevel === option.value}
                      title={option.title}
                      subtitle={option.subtitle}
                      onClick={() => patch({ equipmentLevel: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm text-secondary">
                  Verfügbare Trainingstage
                </p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((day) => (
                    <ChoiceChip
                      key={day.value}
                      active={form.availableDays.includes(day.value)}
                      label={day.label}
                      onClick={() => toggleDay(day.value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Recovery & AI"
            title="Recovery, Einschränkungen & KI-Ton"
            subtitle="Wie SPAQ mit dir sprechen und Empfehlungen an deinen Zustand anpassen soll."
          >
            <div className="space-y-7">
              <div>
                <p className="mb-3 text-sm text-secondary">Schlafqualität</p>
                <div className="flex flex-wrap gap-2">
                  {SLEEP_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option.value}
                      active={form.sleepQuality === option.value}
                      label={option.title}
                      onClick={() => patch({ sleepQuality: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm text-secondary">Stresslevel</p>
                <div className="flex flex-wrap gap-2">
                  {STRESS_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option.value}
                      active={form.stressLevel === option.value}
                      label={option.title}
                      onClick={() => patch({ stressLevel: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm text-secondary">KI-Ton</p>
                <div className="grid gap-4 md:grid-cols-3">
                  {AI_TONE_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.value}
                      selected={form.aiTone === option.value}
                      title={option.title}
                      subtitle={option.subtitle}
                      onClick={() => patch({ aiTone: option.value })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm text-secondary">Einschränkungen</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {LIMITATION_OPTIONS.map((option) => (
                    <MultiSelectCard
                      key={option.value}
                      active={form.limitations.includes(option.value)}
                      label={option.title}
                      onClick={() => toggleLimitation(option.value)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-secondary">
                  Zusätzliche Notizen
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                  rows={5}
                  placeholder="Optional: z.B. Schichtarbeit, spezielle Ziele, frühere Verletzung, Alltag, Coaches sollen dies beachten..."
                  className="w-full resize-none rounded-2xl border border-subtle bg-surface-2 px-4 py-3 text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none"
                />
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="sticky bottom-4 mt-8">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-subtle bg-surface/95 px-4 py-4 shadow-2xl backdrop-blur">
            <div>
              <p className="text-sm font-medium text-primary">
                Athlete-Profil speichern
              </p>
              <p className="text-xs text-muted">
                Änderungen an Zielen, Alltag, Training und AI-Ton werden hier
                gesammelt gespeichert.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || updateProfile.isPending}
              className="rounded-xl bg-[#FFD300] px-5 py-2.5 text-sm font-medium text-[#0f0f13] transition-colors hover:bg-[#e6be00] disabled:opacity-40"
            >
              {updateProfile.isPending
                ? "Speichert..."
                : "Änderungen speichern"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
