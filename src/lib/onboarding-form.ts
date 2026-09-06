import type { OnboardingPayload } from "@/lib/actions/profile";
import type { Importance } from "@/lib/decision";

// The onboarding wizard and the profile edit form both need to hold numeric
// fields as raw text while the student is typing — an <input> can only ever
// show a string, and a half-typed value like "" or "3." is not a valid
// number yet. Coercing on every keystroke (the old `Number(value)` approach)
// turns those in-progress values into NaN, which then gets written back into
// state and rendered as the literal text "NaN". Instead we keep these fields
// as strings in form state and only parse them once, at submit time.

export type LanguageFormEntry = {
  test: string;
  score: string;
  band: string | null;
};

export type OnboardingFormState = {
  currentCountryCode: string | null;
  nationalityCode: string | null;
  currentEducationLevel: string | null;
  currentInstitution: string | null;
  desiredDegree: string | null;
  desiredMajorId: string | null;
  preferredCountries: string[];
  preferredIntake: string | null;
  preferredEnvironment: string;
  gpa: string;
  gpaScale: string;
  languages: LanguageFormEntry[];
  budgetCurrency: string;
  annualFamilyBudget: string;
  availableSavings: string;
  expectedSupport: string;
  maxTuitionPerYear: string;
  maxLivingCostPerYear: string;
  scholarshipRequired: boolean;
  minScholarshipPercent: string;
  willingToWorkPartTime: boolean;
  careerGoal: string | null;
  weights?: {
    financial: Importance;
    academic: Importance;
    language: Importance;
    location: Importance;
    scholarship: Importance;
    career: Importance;
    ranking: Importance;
  };
};

const DEFAULT_STATE: OnboardingFormState = {
  currentCountryCode: null,
  nationalityCode: null,
  currentEducationLevel: null,
  currentInstitution: null,
  desiredDegree: null,
  desiredMajorId: null,
  preferredCountries: [],
  preferredIntake: null,
  preferredEnvironment: "NO_PREFERENCE",
  gpa: "",
  gpaScale: "4",
  languages: [],
  budgetCurrency: "USD",
  annualFamilyBudget: "",
  availableSavings: "",
  expectedSupport: "",
  maxTuitionPerYear: "",
  maxLivingCostPerYear: "",
  scholarshipRequired: false,
  minScholarshipPercent: "",
  willingToWorkPartTime: false,
  careerGoal: null,
};

function toText(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

/** Empty or unparseable text becomes null — never NaN. */
export function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

export function buildFormState(initial: Partial<OnboardingPayload>): OnboardingFormState {
  return {
    ...DEFAULT_STATE,
    ...initial,
    gpa: toText(initial.gpa),
    gpaScale: initial.gpaScale != null ? toText(initial.gpaScale) : DEFAULT_STATE.gpaScale,
    annualFamilyBudget: toText(initial.annualFamilyBudget),
    availableSavings: toText(initial.availableSavings),
    expectedSupport: toText(initial.expectedSupport),
    maxTuitionPerYear: toText(initial.maxTuitionPerYear),
    maxLivingCostPerYear: toText(initial.maxLivingCostPerYear),
    minScholarshipPercent: toText(initial.minScholarshipPercent),
    languages: (initial.languages ?? []).map((entry) => ({
      test: entry.test,
      score: toText(entry.score),
      band: entry.band ?? null,
    })),
  };
}

export function toPayload(form: OnboardingFormState): OnboardingPayload {
  return {
    ...form,
    gpa: toNumberOrNull(form.gpa),
    gpaScale: toNumberOrNull(form.gpaScale),
    annualFamilyBudget: toNumberOrNull(form.annualFamilyBudget),
    availableSavings: toNumberOrNull(form.availableSavings),
    expectedSupport: toNumberOrNull(form.expectedSupport),
    maxTuitionPerYear: toNumberOrNull(form.maxTuitionPerYear),
    maxLivingCostPerYear: toNumberOrNull(form.maxLivingCostPerYear),
    minScholarshipPercent: toNumberOrNull(form.minScholarshipPercent),
    languages: form.languages
      .map((entry) => ({ test: entry.test, score: toNumberOrNull(entry.score), band: entry.band }))
      .filter((entry) => entry.score != null || (entry.band ?? "").trim().length > 0),
  } as OnboardingPayload;
}
