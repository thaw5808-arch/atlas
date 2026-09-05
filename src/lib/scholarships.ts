/**
 * Scholarship eligibility matching.
 *
 * Returns one of three states with the reason for each requirement, so the
 * student always sees which criterion put them in that state.
 */

import type { LanguageTestCode, StudentInput } from "./decision";

export type EligibilityState = "ELIGIBLE" | "POSSIBLE" | "NOT_ELIGIBLE";

export type RequirementInput = {
  kind:
    | "MIN_GPA"
    | "LANGUAGE_SCORE"
    | "NATIONALITY"
    | "FINANCIAL_NEED"
    | "DEGREE_LEVEL"
    | "MAJOR"
    | "ENROLMENT"
    | "OTHER";
  description: string;
  numericValue?: number | null;
  textValue?: string | null;
  listValue?: string[];
  mandatory: boolean;
};

export type ScholarshipInput = {
  id: string;
  name: string;
  tuitionPercent: number;
  livingStipendPerYear: number;
  housingCovered: boolean;
  travelCovered: boolean;
  insuranceCovered: boolean;
  requirements: RequirementInput[];
};

export type RequirementCheck = {
  description: string;
  state: "met" | "unmet" | "unknown";
  detail: string;
};

export type ScholarshipMatch = {
  scholarshipId: string;
  state: EligibilityState;
  checks: RequirementCheck[];
  /** Share of the given annual cost this award would cover, 0–100. */
  coveragePercent: number;
};

type MatchProfile = Pick<
  StudentInput,
  "gpa" | "gpaScale" | "languages" | "annualFundingCapacity" | "desiredMajorId"
> & {
  nationalityCode?: string | null;
  degreeLevel?: string | null;
  desiredMajorName?: string | null;
};

function checkRequirement(requirement: RequirementInput, profile: MatchProfile): RequirementCheck {
  const base = { description: requirement.description };

  switch (requirement.kind) {
    case "MIN_GPA": {
      if (profile.gpa == null) {
        return { ...base, state: "unknown", detail: "No GPA on your profile yet" };
      }
      const normalised = (profile.gpa / (profile.gpaScale || 4)) * 4;
      const required = requirement.numericValue ?? 0;
      return normalised >= required
        ? { ...base, state: "met", detail: `Your GPA of ${profile.gpa.toFixed(2)} clears ${required.toFixed(2)}` }
        : { ...base, state: "unmet", detail: `Needs ${required.toFixed(2)}, your profile shows ${profile.gpa.toFixed(2)}` };
    }
    case "LANGUAGE_SCORE": {
      const test = (requirement.textValue ?? "IELTS") as LanguageTestCode;
      const held = profile.languages.find((q) => q.test === test);
      if (!held?.score) {
        return { ...base, state: "unknown", detail: `No ${test.replace("_", " ")} result on your profile` };
      }
      const required = requirement.numericValue ?? 0;
      return held.score >= required
        ? { ...base, state: "met", detail: `Your ${test.replace("_", " ")} ${held.score} clears ${required}` }
        : { ...base, state: "unmet", detail: `Needs ${required}, your profile shows ${held.score}` };
    }
    case "NATIONALITY": {
      const list = requirement.listValue ?? [];
      if (!profile.nationalityCode) {
        return { ...base, state: "unknown", detail: "Add your nationality to check this" };
      }
      return list.includes(profile.nationalityCode)
        ? { ...base, state: "met", detail: "Your nationality is on the eligible list" }
        : { ...base, state: "unmet", detail: "Restricted to other nationalities" };
    }
    case "FINANCIAL_NEED": {
      const threshold = requirement.numericValue;
      if (threshold == null) return { ...base, state: "unknown", detail: "Assessed case by case" };
      return profile.annualFundingCapacity <= threshold
        ? { ...base, state: "met", detail: "Your stated funding is inside the need threshold" }
        : { ...base, state: "unmet", detail: "Your stated funding is above the need threshold" };
    }
    case "DEGREE_LEVEL": {
      if (!profile.degreeLevel) return { ...base, state: "unknown", detail: "Set your target degree level" };
      const list = requirement.listValue ?? [];
      return list.length === 0 || list.includes(profile.degreeLevel)
        ? { ...base, state: "met", detail: "Your target degree level qualifies" }
        : { ...base, state: "unmet", detail: `Open to ${list.join(", ").toLowerCase()} students only` };
    }
    case "MAJOR": {
      if (!profile.desiredMajorId) return { ...base, state: "unknown", detail: "Set your intended subject" };
      const list = requirement.listValue ?? [];
      return list.includes(profile.desiredMajorId)
        ? { ...base, state: "met", detail: "Your intended subject qualifies" }
        : { ...base, state: "unmet", detail: "Restricted to other subjects" };
    }
    default:
      return { ...base, state: "unknown", detail: requirement.description };
  }
}

export function matchScholarship(
  scholarship: ScholarshipInput,
  profile: MatchProfile,
  annualCost: number,
): ScholarshipMatch {
  const checks = scholarship.requirements.map((requirement) => checkRequirement(requirement, profile));
  const mandatoryChecks = checks.filter((_, index) => scholarship.requirements[index].mandatory);

  const state: EligibilityState = mandatoryChecks.some((c) => c.state === "unmet")
    ? "NOT_ELIGIBLE"
    : mandatoryChecks.some((c) => c.state === "unknown")
      ? "POSSIBLE"
      : "ELIGIBLE";

  return { scholarshipId: scholarship.id, state, checks, coveragePercent: 0 };
}

/** Coverage needs the tuition split, so it is computed separately. */
export function coveragePercentOfCost(
  scholarship: ScholarshipInput,
  tuitionPerYear: number,
  annualCost: number,
): number {
  if (annualCost <= 0) return 0;
  const value =
    tuitionPerYear * (scholarship.tuitionPercent / 100) + scholarship.livingStipendPerYear;
  return Math.min(100, Math.round((value / annualCost) * 100));
}

export function coverageSummary(scholarship: ScholarshipInput): string {
  const parts: string[] = [];
  if (scholarship.tuitionPercent >= 100) parts.push("Full tuition");
  else if (scholarship.tuitionPercent > 0) parts.push(`${scholarship.tuitionPercent}% of tuition`);
  if (scholarship.livingStipendPerYear > 0) parts.push("living stipend");
  if (scholarship.housingCovered) parts.push("housing");
  if (scholarship.travelCovered) parts.push("travel");
  if (scholarship.insuranceCovered) parts.push("insurance");
  return parts.length > 0 ? parts.join(" · ") : "Coverage not published";
}
