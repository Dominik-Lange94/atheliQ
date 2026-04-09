import mongoose, { Schema, Document } from "mongoose";

export interface IAthleteProfile extends Document {
  athleteId: mongoose.Types.ObjectId;

  currentWeightKg?: number | null;
  targetWeightKg?: number | null;
  heightCm?: number | null;
  birthDate?: Date | null;
  gender?: "female" | "male" | "other" | "prefer_not_to_say" | null;

  primaryGoal?:
    | "lose_fat"
    | "maintain"
    | "gain_weight"
    | "build_muscle"
    | "fitness"
    | "health"
    | "custom"
    | null;

  reason?:
    | "confidence"
    | "health"
    | "fitness"
    | "event"
    | "feel_better"
    | "other"
    | null;

  eventType?:
    | "vacation"
    | "wedding"
    | "competition"
    | "summer"
    | "reunion"
    | "other"
    | "none"
    | null;

  eventDate?: Date | null;

  workLifestyle?: "sitting" | "standing" | "walking" | "physical" | null;
  activityLevel?: "low" | "moderate" | "high" | null;
  experienceLevel?: "beginner" | "intermediate" | "advanced" | null;
  workoutsPerWeek?: "0" | "1_2" | "3_4" | "5_plus" | null;

  painPoints?: string[];
  dietPreference?:
    | "classic"
    | "vegetarian"
    | "vegan"
    | "pescetarian"
    | "high_protein"
    | "flexible"
    | "none"
    | null;

  goalSpeed?: "gentle" | "balanced" | "aggressive" | null;
  trainingLocation?: "gym" | "home" | "outdoor" | "mixed" | null;
  equipmentLevel?: "none" | "basic" | "full_gym" | null;
  sleepQuality?: "poor" | "okay" | "good" | null;
  stressLevel?: "low" | "moderate" | "high" | null;
  mealStructure?: "unstructured" | "somewhat_structured" | "structured" | null;
  aiTone?: "supportive" | "direct" | "coach_like" | null;
  unitSystem?: "metric" | "imperial" | null;

  availableDays?: string[];
  limitations?: string[];
  notes?: string;

  startMode?: "smart" | "template" | "blank" | null;
  selectedTemplate?:
    | "weight_loss_starter"
    | "muscle_gain_starter"
    | "general_health_starter"
    | "cardio_starter"
    | "coach_ready_starter"
    | "minimal_tracker"
    | null;

  generatedCardIds?: mongoose.Types.ObjectId[];

  onboardingCompleted: boolean;
  completedAt?: Date | null;
  profileVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const AthleteProfileSchema = new Schema<IAthleteProfile>(
  {
    athleteId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    currentWeightKg: { type: Number, default: null },
    targetWeightKg: { type: Number, default: null },
    heightCm: { type: Number, default: null },
    birthDate: { type: Date, default: null },
    gender: {
      type: String,
      enum: ["female", "male", "other", "prefer_not_to_say", null],
      default: null,
    },

    primaryGoal: {
      type: String,
      enum: [
        "lose_fat",
        "maintain",
        "gain_weight",
        "build_muscle",
        "fitness",
        "health",
        "custom",
        null,
      ],
      default: null,
    },

    reason: {
      type: String,
      enum: [
        "confidence",
        "health",
        "fitness",
        "event",
        "feel_better",
        "other",
        null,
      ],
      default: null,
    },

    eventType: {
      type: String,
      enum: [
        "vacation",
        "wedding",
        "competition",
        "summer",
        "reunion",
        "other",
        "none",
        null,
      ],
      default: null,
    },

    eventDate: { type: Date, default: null },

    workLifestyle: {
      type: String,
      enum: ["sitting", "standing", "walking", "physical", null],
      default: null,
    },

    activityLevel: {
      type: String,
      enum: ["low", "moderate", "high", null],
      default: null,
    },

    experienceLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", null],
      default: null,
    },

    workoutsPerWeek: {
      type: String,
      enum: ["0", "1_2", "3_4", "5_plus", null],
      default: null,
    },

    painPoints: { type: [String], default: [] },

    dietPreference: {
      type: String,
      enum: [
        "classic",
        "vegetarian",
        "vegan",
        "pescetarian",
        "high_protein",
        "flexible",
        "none",
        null,
      ],
      default: null,
    },

    goalSpeed: {
      type: String,
      enum: ["gentle", "balanced", "aggressive", null],
      default: null,
    },

    trainingLocation: {
      type: String,
      enum: ["gym", "home", "outdoor", "mixed", null],
      default: null,
    },

    equipmentLevel: {
      type: String,
      enum: ["none", "basic", "full_gym", null],
      default: null,
    },

    sleepQuality: {
      type: String,
      enum: ["poor", "okay", "good", null],
      default: null,
    },

    stressLevel: {
      type: String,
      enum: ["low", "moderate", "high", null],
      default: null,
    },

    mealStructure: {
      type: String,
      enum: ["unstructured", "somewhat_structured", "structured", null],
      default: null,
    },

    aiTone: {
      type: String,
      enum: ["supportive", "direct", "coach_like", null],
      default: null,
    },

    unitSystem: {
      type: String,
      enum: ["metric", "imperial", null],
      default: "metric",
    },

    availableDays: { type: [String], default: [] },
    limitations: { type: [String], default: [] },
    notes: { type: String, default: "" },

    startMode: {
      type: String,
      enum: ["smart", "template", "blank", null],
      default: null,
    },

    selectedTemplate: {
      type: String,
      enum: [
        "weight_loss_starter",
        "muscle_gain_starter",
        "general_health_starter",
        "cardio_starter",
        "coach_ready_starter",
        "minimal_tracker",
        null,
      ],
      default: null,
    },

    generatedCardIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "StatCard" }],
      default: [],
    },

    onboardingCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    completedAt: { type: Date, default: null },

    profileVersion: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IAthleteProfile>(
  "AthleteProfile",
  AthleteProfileSchema
);
