import { useMemo, useState } from "react";

type PrimaryGoal =
  | "lose_fat"
  | "maintain"
  | "build_muscle"
  | "fitness"
  | "health";

type ActivityLevel = "low" | "moderate" | "high";
type ExperienceLevel = "beginner" | "intermediate" | "advanced";
type WorkoutsPerWeek = "1_2" | "3_4" | "5_plus";

type Motivation =
  | "energy"
  | "appearance"
  | "routine"
  | "strength"
  | "health"
  | "confidence";

type OnboardingData = {
  heightCm: string;
  weightKg: string;
  age: string;
  primaryGoal: PrimaryGoal | null;
  targetWeightKg: string;
  activityLevel: ActivityLevel | null;
  experienceLevel: ExperienceLevel | null;
  workoutsPerWeek: WorkoutsPerWeek | null;
  motivations: Motivation[];
  motivationNote: string;
};

const STORAGE_KEY = "fittrack_onboarding_draft";

const GOAL_OPTIONS: {
  value: PrimaryGoal;
  title: string;
  subtitle: string;
  icon: string;
}[] = [
  {
    value: "lose_fat",
    title: "Lose fat",
    subtitle: "Reduce body fat and get leaner",
    icon: "🔥",
  },
  {
    value: "maintain",
    title: "Maintain",
    subtitle: "Keep your current shape and routine",
    icon: "⚖️",
  },
  {
    value: "build_muscle",
    title: "Build muscle",
    subtitle: "Gain strength and muscle mass",
    icon: "💪",
  },
  {
    value: "fitness",
    title: "Get fitter",
    subtitle: "Improve endurance and performance",
    icon: "🏃",
  },
  {
    value: "health",
    title: "Health first",
    subtitle: "Build a healthier everyday lifestyle",
    icon: "❤️",
  },
];

const ACTIVITY_OPTIONS: {
  value: ActivityLevel;
  title: string;
  subtitle: string;
}[] = [
  {
    value: "low",
    title: "Low activity",
    subtitle: "Mostly sitting, little movement",
  },
  {
    value: "moderate",
    title: "Moderate",
    subtitle: "Regular movement and some exercise",
  },
  {
    value: "high",
    title: "High activity",
    subtitle: "Very active days or frequent training",
  },
];

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; title: string }[] = [
  { value: "beginner", title: "Beginner" },
  { value: "intermediate", title: "Intermediate" },
  { value: "advanced", title: "Advanced" },
];

const WORKOUT_OPTIONS: { value: WorkoutsPerWeek; title: string }[] = [
  { value: "1_2", title: "1–2x / week" },
  { value: "3_4", title: "3–4x / week" },
  { value: "5_plus", title: "5x+ / week" },
];

const MOTIVATION_OPTIONS: { value: Motivation; label: string }[] = [
  { value: "energy", label: "More energy" },
  { value: "appearance", label: "Better shape" },
  { value: "routine", label: "Build routine" },
  { value: "strength", label: "Get stronger" },
  { value: "health", label: "Better health" },
  { value: "confidence", label: "More confidence" },
];

const INITIAL_DATA: OnboardingData = {
  heightCm: "",
  weightKg: "",
  age: "",
  primaryGoal: null,
  targetWeightKg: "",
  activityLevel: null,
  experienceLevel: null,
  workoutsPerWeek: null,
  motivations: [],
  motivationNote: "",
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

function calculateBmi(heightCm: string, weightKg: string): number | null {
  const h = Number(heightCm);
  const w = Number(weightKg);
  if (!h || !w || h <= 0 || w <= 0) return null;
  const heightM = h / 100;
  return Number((w / (heightM * heightM)).toFixed(1));
}

function getBmiCategory(bmi: number | null): string {
  if (bmi === null) return "Enter your height and weight";
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal range";
  if (bmi < 30) return "Overweight";
  return "Obesity range";
}

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

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(() => loadDraft());

  const bmi = useMemo(
    () => calculateBmi(data.heightCm, data.weightKg),
    [data.heightCm, data.weightKg]
  );
  const totalSteps = 5;
  const progress = ((step + 1) / totalSteps) * 100;

  const patch = (next: Partial<OnboardingData>) => {
    setData((prev) => {
      const updated = { ...prev, ...next };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const toggleMotivation = (value: Motivation) => {
    const exists = data.motivations.includes(value);
    patch({
      motivations: exists
        ? data.motivations.filter((m) => m !== value)
        : [...data.motivations, value],
    });
  };

  const canContinue = () => {
    if (step === 0) return true;
    if (step === 1) return Boolean(data.heightCm && data.weightKg);
    if (step === 2) return Boolean(data.primaryGoal);
    if (step === 3)
      return Boolean(
        data.activityLevel && data.experienceLevel && data.workoutsPerWeek
      );
    if (step === 4) return data.motivations.length > 0;
    return true;
  };

  const handleContinue = () => {
    if (step < totalSteps - 1) setStep((prev) => prev + 1);
    else {
      localStorage.setItem("fittrack_onboarding_completed", "true");
      console.log("Onboarding complete", data);
    }
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
              <p className="text-slate-500 text-xs">Onboarding</p>
            </div>
          </div>

          <div className="hidden sm:block text-right">
            <p className="text-slate-400 text-xs">
              Step {step + 1} of {totalSteps}
            </p>
            <p className="text-white text-sm font-medium">
              {step === 0 && "Welcome"}
              {step === 1 && "Body basics"}
              {step === 2 && "Your goal"}
              {step === 3 && "Activity"}
              {step === 4 && "Motivation"}
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
            eyebrow="Start"
            title="Let’s build your starting point"
            subtitle="We’ll set up your baseline, goals and motivation so the app can feel more personal from day one."
          >
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-white font-medium">What you’ll set up</p>
                  <div className="grid sm:grid-cols-2 gap-3 mt-4">
                    <div className="rounded-xl border border-white/10 bg-[#0f0f13] p-4">
                      <p className="text-sm text-white font-medium">
                        Body basics
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Height, weight and your starting point
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#0f0f13] p-4">
                      <p className="text-sm text-white font-medium">
                        Goal direction
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Lose fat, build muscle or stay consistent
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#0f0f13] p-4">
                      <p className="text-sm text-white font-medium">
                        Activity level
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        So the app matches your real lifestyle
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#0f0f13] p-4">
                      <p className="text-sm text-white font-medium">
                        Motivation
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        What actually matters to you personally
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#FFD300]/20 bg-[#FFD300]/5 p-5">
                <p className="text-[#FFD300] text-sm font-medium">
                  Why this matters
                </p>
                <p className="text-white text-lg font-medium mt-2">
                  A better starting point means better tracking later.
                </p>
                <p className="text-slate-300 text-sm mt-3 leading-6">
                  Even if you only use local draft data for now, this gives you
                  a clean base for BMI, weight progress, goals, motivation and
                  future recommendations.
                </p>
              </div>
            </div>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell
            eyebrow="Body basics"
            title="Set your first body metrics"
            subtitle="These values give you a real baseline for weight progress and simple health indicators like BMI."
          >
            <div className="grid lg:grid-cols-[1fr_0.8fr] gap-6">
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1.5">
                      Height
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
                      Current weight
                    </label>
                    <div className="relative">
                      <input
                        value={data.weightKg}
                        onChange={(e) => patch({ weightKg: e.target.value })}
                        placeholder="78"
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
                    Age <span className="text-slate-500">(optional)</span>
                  </label>
                  <input
                    value={data.age}
                    onChange={(e) => patch({ age: e.target.value })}
                    placeholder="28"
                    type="number"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD300]/50 transition-all"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-slate-400 text-sm">Quick preview</p>
                <div className="mt-4 rounded-2xl border border-[#FFD300]/20 bg-[#FFD300]/5 p-5">
                  <p className="text-[#FFD300] text-xs uppercase tracking-[0.18em] font-semibold">
                    BMI
                  </p>
                  <p className="text-4xl font-semibold text-white mt-2">
                    {bmi ?? "—"}
                  </p>
                  <p className="text-slate-300 text-sm mt-2">
                    {getBmiCategory(bmi)}
                  </p>
                  <p className="text-slate-500 text-xs mt-4">
                    This is only a first orientation value, not the full
                    picture.
                  </p>
                </div>
              </div>
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell
            eyebrow="Goal"
            title="What do you want to achieve most?"
            subtitle="Pick your main direction first. You can refine the details later."
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

            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">
                  Target weight{" "}
                  <span className="text-slate-500">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    value={data.targetWeightKg}
                    onChange={(e) => patch({ targetWeightKg: e.target.value })}
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
          </StepShell>
        )}

        {step === 3 && (
          <StepShell
            eyebrow="Activity"
            title="How active is your current lifestyle?"
            subtitle="This helps the app understand where you are starting from, not where you wish you already were."
          >
            <div className="space-y-6">
              <div>
                <p className="text-sm text-slate-300 mb-3">Activity level</p>
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
                  Training experience
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
                  How often do you want to train?
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

        {step === 4 && (
          <StepShell
            eyebrow="Motivation"
            title="What drives you personally?"
            subtitle="Choose the reasons that matter most. This can later shape reminders, copy and coaching tone."
          >
            <div className="flex flex-wrap gap-2">
              {MOTIVATION_OPTIONS.map((motivation) => (
                <ChoiceChip
                  key={motivation.value}
                  active={data.motivations.includes(motivation.value)}
                  label={motivation.label}
                  onClick={() => toggleMotivation(motivation.value)}
                />
              ))}
            </div>

            <div className="mt-6">
              <label className="block text-sm text-slate-300 mb-1.5">
                Anything else that motivates you?{" "}
                <span className="text-slate-500">(optional)</span>
              </label>
              <textarea
                value={data.motivationNote}
                onChange={(e) => patch({ motivationNote: e.target.value })}
                placeholder="e.g. I want more structure, more confidence and better energy during work days."
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD300]/50 transition-all resize-none"
              />
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-white font-medium">Summary preview</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl bg-[#0f0f13] border border-white/10 p-4">
                  <p className="text-slate-500 text-xs">Current stats</p>
                  <p className="text-white text-sm mt-1">
                    {data.heightCm || "—"} cm · {data.weightKg || "—"} kg
                  </p>
                </div>
                <div className="rounded-xl bg-[#0f0f13] border border-white/10 p-4">
                  <p className="text-slate-500 text-xs">Primary goal</p>
                  <p className="text-white text-sm mt-1">
                    {GOAL_OPTIONS.find((g) => g.value === data.primaryGoal)
                      ?.title ?? "—"}
                  </p>
                </div>
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
