/**
 * ATLAS decision engine.
 *
 * Pure, dependency-free scoring so the same code runs on the server (to persist
 * DecisionScore rows) and in the browser (to recompute instantly when a student
 * changes their weights). Every dimension returns a score AND the reasons that
 * produced it — nothing in the UI shows a number this file cannot explain.
 */

export type Dimension =
  | "academic"
  | "financial"
  | "language"
  | "location"
  | "scholarship"
  | "career";

export const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: "academic", label: "Academic fit" },
  { key: "financial", label: "Financial fit" },
  { key: "language", label: "Language fit" },
  { key: "location", label: "Location fit" },
  { key: "scholarship", label: "Scholarship fit" },
  { key: "career", label: "Career fit" },
];

export type ReasonKind = "strength" | "concern" | "blocker" | "unknown";

export type Reason = {
  dimension: Dimension;
  kind: ReasonKind;
  message: string;
};

export type DimensionResult = {
  score: number;
  reasons: Reason[];
};

export type Importance = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export const IMPORTANCE_WEIGHT: Record<Importance, number> = {
  LOW: 0.5,
  MEDIUM: 1,
  HIGH: 1.75,
  VERY_HIGH: 2.5,
};

export type Weights = {
  financial: Importance;
  academic: Importance;
  language: Importance;
  location: Importance;
  scholarship: Importance;
  career: Importance;
  ranking: Importance;
};

export const DEFAULT_WEIGHTS: Weights = {
  financial: "VERY_HIGH",
  academic: "HIGH",
  language: "HIGH",
  location: "MEDIUM",
  scholarship: "HIGH",
  career: "MEDIUM",
  ranking: "LOW",
};

// ───────────────────────────── inputs ─────────────────────────────

export type LanguageTestCode =
  | "IELTS"
  | "TOEFL_IBT"
  | "DUOLINGO"
  | "JLPT"
  | "TOPIK"
  | "DELF"
  | "TESTDAF"
  | "OTHER";

export type EducationLevelCode =
  | "HIGH_SCHOOL"
  | "FOUNDATION"
  | "DIPLOMA"
  | "BACHELOR"
  | "MASTER"
  | "DOCTORATE";

export type EnvironmentCode =
  | "MAJOR_METRO"
  | "MID_SIZED_CITY"
  | "UNIVERSITY_TOWN"
  | "NO_PREFERENCE";

export type StudentInput = {
  gpa?: number | null;
  gpaScale?: number | null;
  educationLevel?: EducationLevelCode | null;
  desiredMajorId?: string | null;
  desiredFieldName?: string | null;
  preferredCountries: string[];
  preferredEnvironment: EnvironmentCode;
  /** Money the student can put toward one academic year, in their currency. */
  annualFundingCapacity: number;
  maxTuitionPerYear?: number | null;
  maxLivingCostPerYear?: number | null;
  languages: { test: LanguageTestCode; score?: number | null; band?: string | null }[];
  scholarshipRequired: boolean;
  minScholarshipPercent?: number | null;
  willingToWorkPartTime: boolean;
  careerGoal?: string | null;
};

export type ScholarshipEligibility = "ELIGIBLE" | "POSSIBLE" | "NOT_ELIGIBLE";

export type CandidateInput = {
  universityId: string;
  universityName: string;
  countryCode: string;
  countryName: string;
  cityEnvironment: EnvironmentCode;
  globalRanking?: number | null;
  partTimeFriendly: boolean;
  workHoursPerWeek?: number | null;
  program: {
    id: string;
    name: string;
    majorId: string;
    majorName: string;
    fieldName: string;
    languageOfInstruction: string;
    durationYears: number;
  };
  requirement?: {
    minGpa?: number | null;
    gpaScale?: number | null;
    minEducationLevel: EducationLevelCode;
    interviewRequired?: boolean;
    portfolioRequired?: boolean;
  } | null;
  languageRequirements: {
    test: LanguageTestCode;
    minScore?: number | null;
    minBand?: string | null;
    waivable: boolean;
  }[];
  /** All annual figures already converted into the student's currency. */
  annualCost: { tuition: number; fees: number; living: number; total: number };
  scholarships: {
    name: string;
    eligibility: ScholarshipEligibility;
    /** Share of the student's total annual cost this award would cover, 0–100. */
    coveragePercent: number;
  }[];
};

export type ScoreResult = {
  overall: number;
  eligible: boolean;
  dimensions: Record<Dimension, DimensionResult>;
  reasons: Reason[];
  strengths: Reason[];
  concerns: Reason[];
};

// ─────────────────────────── small helpers ───────────────────────────

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

/** Piecewise-linear map through a set of (input, score) anchor points. */
function curve(value: number, points: [number, number][]): number {
  if (value <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (value >= last[0]) return last[1];
  for (let i = 1; i < points.length; i += 1) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (value <= x1) {
      const t = (value - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return last[1];
}

const EDUCATION_ORDER: EducationLevelCode[] = [
  "HIGH_SCHOOL",
  "FOUNDATION",
  "DIPLOMA",
  "BACHELOR",
  "MASTER",
  "DOCTORATE",
];

const BAND_SCALES: Partial<Record<LanguageTestCode, string[]>> = {
  // ascending difficulty: N5 is the easiest level, N1 the hardest
  JLPT: ["N5", "N4", "N3", "N2", "N1"],
  TOPIK: ["1", "2", "3", "4", "5", "6"],
  DELF: ["A1", "A2", "B1", "B2", "C1", "C2"],
  TESTDAF: ["3", "4", "5"],
};

function bandRank(test: LanguageTestCode, band?: string | null): number | null {
  if (!band) return null;
  const scale = BAND_SCALES[test];
  if (!scale) return null;
  const index = scale.indexOf(band.toUpperCase());
  return index === -1 ? null : index + 1;
}

/** How close a near-miss can be and still count as "almost meets it". */
const NEAR_MISS: Partial<Record<LanguageTestCode, number>> = {
  IELTS: 0.5,
  TOEFL_IBT: 7,
  DUOLINGO: 10,
};

// ─────────────────────────── dimensions ───────────────────────────

export function scoreAcademic(student: StudentInput, candidate: CandidateInput): DimensionResult {
  const reasons: Reason[] = [];
  const push = (kind: ReasonKind, message: string) =>
    reasons.push({ dimension: "academic", kind, message });

  const requirement = candidate.requirement;
  let gpaScore = 65;

  if (!requirement || requirement.minGpa == null) {
    push("unknown", "No published GPA requirement on file for this program, so this is a neutral estimate");
  } else if (student.gpa == null) {
    push("unknown", "Add your GPA in your profile to score academic eligibility properly");
  } else {
    const scale = student.gpaScale || 4;
    const normalised = (student.gpa / scale) * 4;
    const requiredScale = requirement.gpaScale || 4;
    const required = (requirement.minGpa / requiredScale) * 4;
    const margin = normalised - required;
    gpaScore = curve(margin, [
      [-0.8, 0],
      [-0.3, 35],
      [0, 78],
      [0.4, 94],
      [0.8, 100],
    ]);
    if (margin >= 0.3) {
      push("strength", `Your GPA of ${student.gpa.toFixed(2)} is comfortably above the stated minimum of ${requirement.minGpa.toFixed(2)}`);
    } else if (margin >= 0) {
      push("strength", `Your GPA of ${student.gpa.toFixed(2)} meets the stated minimum of ${requirement.minGpa.toFixed(2)}, with little margin`);
    } else {
      push("blocker", `Your GPA of ${student.gpa.toFixed(2)} is below the stated minimum of ${requirement.minGpa.toFixed(2)}`);
    }
  }

  if (requirement && student.educationLevel) {
    const have = EDUCATION_ORDER.indexOf(student.educationLevel);
    const need = EDUCATION_ORDER.indexOf(requirement.minEducationLevel);
    if (have < need) {
      push("blocker", `Entry needs ${requirement.minEducationLevel.replace(/_/g, " ").toLowerCase()} level study first`);
      gpaScore = Math.min(gpaScore, 20);
    }
  }

  // program match
  let programScore = 55;
  if (student.desiredMajorId && student.desiredMajorId === candidate.program.majorId) {
    programScore = 100;
    push("strength", `${candidate.program.majorName} is the subject you said you want to study`);
  } else if (student.desiredFieldName && student.desiredFieldName === candidate.program.fieldName) {
    programScore = 75;
    push("strength", `${candidate.program.name} sits in ${candidate.program.fieldName}, the field you're aiming for`);
  } else if (student.desiredMajorId) {
    push("concern", `This program is in ${candidate.program.fieldName}, not the subject on your profile`);
  }

  let score = gpaScore * 0.6 + programScore * 0.4;

  if (requirement?.portfolioRequired) push("concern", "A portfolio is required as part of the application");
  if (requirement?.interviewRequired) push("concern", "An interview is part of the admissions process");

  return { score: clamp(score), reasons };
}

export function scoreFinancial(student: StudentInput, candidate: CandidateInput): DimensionResult {
  const reasons: Reason[] = [];
  const push = (kind: ReasonKind, message: string) =>
    reasons.push({ dimension: "financial", kind, message });

  const best = candidate.scholarships
    .filter((s) => s.eligibility !== "NOT_ELIGIBLE")
    .reduce((max, s) => Math.max(max, s.coveragePercent), 0);
  const netCost = candidate.annualCost.total * (1 - best / 100);

  if (student.annualFundingCapacity <= 0) {
    push("unknown", "Add your budget and savings to see whether this is affordable for you");
    return { score: 50, reasons };
  }

  const ratio = student.annualFundingCapacity / Math.max(netCost, 1);
  const score = curve(ratio, [
    [0.4, 0],
    [0.7, 30],
    [0.9, 60],
    [1, 82],
    [1.15, 94],
    [1.4, 100],
  ]);

  const gap = netCost - student.annualFundingCapacity;
  if (gap <= 0) {
    push("strength", `Estimated annual cost sits inside your funding capacity, with about ${Math.round(-gap).toLocaleString()} left over each year`);
  } else {
    push(
      gap / netCost > 0.25 ? "blocker" : "concern",
      `Estimated annual cost is about ${Math.round(gap).toLocaleString()} more per year than you can currently fund`,
    );
  }
  if (best > 0) {
    push("strength", `A scholarship you may qualify for would cover roughly ${Math.round(best)}% of the annual cost`);
  }

  if (student.maxTuitionPerYear != null && candidate.annualCost.tuition > student.maxTuitionPerYear) {
    push("concern", "Tuition is above the ceiling you set in your profile");
  }
  if (student.maxLivingCostPerYear != null && candidate.annualCost.living > student.maxLivingCostPerYear) {
    push("concern", "Estimated living costs are above the ceiling you set in your profile");
  }

  return { score: clamp(score), reasons };
}

export function scoreLanguage(student: StudentInput, candidate: CandidateInput): DimensionResult {
  const reasons: Reason[] = [];
  const push = (kind: ReasonKind, message: string) =>
    reasons.push({ dimension: "language", kind, message });

  if (candidate.languageRequirements.length === 0) {
    push("unknown", `No language requirement is on file for this program — confirm with the university's international office`);
    return { score: 65, reasons };
  }

  const perRequirement = candidate.languageRequirements.map((requirement) => {
    const held = student.languages.find((q) => q.test === requirement.test);
    const label = requirement.test.replace("_", " ");

    if (!held) {
      const alternative = student.languages.length > 0;
      push(
        requirement.waivable ? "concern" : "blocker",
        requirement.waivable
          ? `No ${label} result on file; the university lists this requirement as waivable in some cases`
          : `No ${label} result on file, and this program lists it as required`,
      );
      return requirement.waivable ? 40 : alternative ? 15 : 0;
    }

    if (requirement.minScore != null && held.score != null) {
      const margin = held.score - requirement.minScore;
      const near = NEAR_MISS[requirement.test] ?? 0;
      if (margin >= 0) {
        push("strength", `Your ${label} ${held.score} meets the listed minimum of ${requirement.minScore}`);
        return curve(margin, [
          [0, 84],
          [near, 94],
          [near * 3, 100],
        ]);
      }
      if (Math.abs(margin) <= near) {
        push("concern", `Your ${label} ${held.score} is just under the listed ${requirement.minScore} — one retake would likely close it`);
        return 55;
      }
      push("blocker", `Your ${label} ${held.score} is below the listed minimum of ${requirement.minScore}`);
      return 15;
    }

    if (requirement.minBand) {
      const have = bandRank(requirement.test, held.band);
      const need = bandRank(requirement.test, requirement.minBand);
      if (have == null || need == null) {
        push("unknown", `Could not compare your ${label} result with the listed requirement`);
        return 55;
      }
      if (have >= need) {
        push("strength", `Your ${label} ${held.band} meets the listed ${requirement.minBand} requirement`);
        return have > need ? 100 : 88;
      }
      if (need - have === 1) {
        push("concern", `Your ${label} ${held.band} is one level below the listed ${requirement.minBand}`);
        return 50;
      }
      push("blocker", `Your ${label} ${held.band} is below the listed ${requirement.minBand}`);
      return 10;
    }

    push("unknown", `${label} is listed as a requirement without a published minimum`);
    return 60;
  });

  return { score: clamp(Math.min(...perRequirement)), reasons };
}

export function scoreLocation(student: StudentInput, candidate: CandidateInput): DimensionResult {
  const reasons: Reason[] = [];
  const push = (kind: ReasonKind, message: string) =>
    reasons.push({ dimension: "location", kind, message });

  let countryScore = 55;
  if (student.preferredCountries.length === 0) {
    push("unknown", "You haven't set preferred countries, so every country scores neutrally");
    countryScore = 70;
  } else if (student.preferredCountries.includes(candidate.countryCode)) {
    countryScore = 100;
    push("strength", `${candidate.countryName} is on your preferred country list`);
  } else {
    push("concern", `${candidate.countryName} isn't on your preferred country list`);
  }

  let environmentScore = 70;
  if (student.preferredEnvironment !== "NO_PREFERENCE") {
    if (student.preferredEnvironment === candidate.cityEnvironment) {
      environmentScore = 100;
      push("strength", `Campus sits in the kind of city you prefer`);
    } else {
      environmentScore = 55;
      push("concern", `City type differs from the setting you said you prefer`);
    }
  }

  if (student.willingToWorkPartTime) {
    if (candidate.partTimeFriendly && candidate.workHoursPerWeek) {
      push("strength", `Student visa holders here may work up to about ${candidate.workHoursPerWeek} hours a week during term`);
    } else if (!candidate.partTimeFriendly) {
      push("concern", "Part-time work options for international students are limited here");
    }
  }

  return { score: clamp(countryScore * 0.65 + environmentScore * 0.35), reasons };
}

export function scoreScholarship(student: StudentInput, candidate: CandidateInput): DimensionResult {
  const reasons: Reason[] = [];
  const push = (kind: ReasonKind, message: string) =>
    reasons.push({ dimension: "scholarship", kind, message });

  const eligible = candidate.scholarships.filter((s) => s.eligibility === "ELIGIBLE");
  const possible = candidate.scholarships.filter((s) => s.eligibility === "POSSIBLE");
  const bestEligible = eligible.reduce((max, s) => Math.max(max, s.coveragePercent), 0);
  const bestPossible = possible.reduce((max, s) => Math.max(max, s.coveragePercent), 0);

  let score: number;

  if (candidate.scholarships.length === 0) {
    push("concern", "No scholarships for international students are recorded for this university yet");
    score = student.scholarshipRequired ? 10 : 30;
  } else {
    const effective = bestEligible + bestPossible * 0.5;

    score = curve(effective, [
      [0, 20],
      [15, 45],
      [30, 68],
      [60, 88],
      [100, 100],
    ]);

    if (eligible.length > 0) {
      push("strength", `You currently meet the listed criteria for ${eligible.length} award${eligible.length > 1 ? "s" : ""}, the largest covering about ${Math.round(bestEligible)}% of annual cost`);
    }
    if (possible.length > 0) {
      push("concern", `${possible.length} further award${possible.length > 1 ? "s" : ""} need details you haven't filled in yet`);
    }
    if (eligible.length === 0 && possible.length === 0) {
      push("concern", "You don't currently meet the listed criteria for any recorded award here");
      score = Math.min(score, 25);
    }
  }

  // A scholarship-dependent student is blocked whether the shortfall is because no award here
  // reaches their minimum, or because the university has no recorded awards at all — the latter
  // must not slip through just because the early return above never touched bestEligible.
  if (student.scholarshipRequired && bestEligible < (student.minScholarshipPercent ?? 1)) {
    push("blocker", `You marked a scholarship as essential, and no award here reaches the ${student.minScholarshipPercent ?? 0}% you need`);
  }

  return { score: clamp(score), reasons };
}

const STOPWORDS = new Set(["and", "in", "of", "the", "a", "to", "for", "with", "at", "as", "on", "my"]);

export function scoreCareer(student: StudentInput, candidate: CandidateInput): DimensionResult {
  const reasons: Reason[] = [];
  const push = (kind: ReasonKind, message: string) =>
    reasons.push({ dimension: "career", kind, message });

  if (!student.careerGoal || student.careerGoal.trim().length < 3) {
    push("unknown", "Describe your career goal in your profile to score this properly");
    return { score: 60, reasons };
  }

  const tokens = (value: string) =>
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word));

  const goal = new Set(tokens(student.careerGoal));
  const haystack = new Set([
    ...tokens(candidate.program.name),
    ...tokens(candidate.program.majorName),
    ...tokens(candidate.program.fieldName),
  ]);
  const overlap = [...goal].filter((word) => haystack.has(word));

  let score = curve(overlap.length, [
    [0, 45],
    [1, 72],
    [2, 88],
    [3, 96],
  ]);

  if (overlap.length > 0) {
    push("strength", `Program content lines up with your goal (${overlap.slice(0, 3).join(", ")})`);
  } else {
    push("concern", "Program subject doesn't obviously match the career goal on your profile");
  }

  if (student.willingToWorkPartTime && candidate.partTimeFriendly) {
    score += 4;
    push("strength", "Local rules allow term-time work, which helps build experience while studying");
  }

  return { score: clamp(score), reasons };
}

// ─────────────────────────── composition ───────────────────────────

export function scoreCandidate(
  student: StudentInput,
  candidate: CandidateInput,
  weights: Weights = DEFAULT_WEIGHTS,
): ScoreResult {
  const dimensions: Record<Dimension, DimensionResult> = {
    academic: scoreAcademic(student, candidate),
    financial: scoreFinancial(student, candidate),
    language: scoreLanguage(student, candidate),
    location: scoreLocation(student, candidate),
    scholarship: scoreScholarship(student, candidate),
    career: scoreCareer(student, candidate),
  };

  // Ranking is a preference, not a dimension students see — it nudges the
  // academic score by however much the student says rankings matter.
  if (candidate.globalRanking) {
    const rankingScore = curve(candidate.globalRanking, [
      [1, 100],
      [100, 88],
      [400, 70],
      [1000, 55],
    ]);
    const pull = IMPORTANCE_WEIGHT[weights.ranking] / IMPORTANCE_WEIGHT.VERY_HIGH; // 0.2 – 1
    dimensions.academic = {
      ...dimensions.academic,
      score: clamp(dimensions.academic.score * (1 - 0.3 * pull) + rankingScore * 0.3 * pull),
    };
  }

  const entries: [Dimension, number][] = [
    ["academic", IMPORTANCE_WEIGHT[weights.academic]],
    ["financial", IMPORTANCE_WEIGHT[weights.financial]],
    ["language", IMPORTANCE_WEIGHT[weights.language]],
    ["location", IMPORTANCE_WEIGHT[weights.location]],
    ["scholarship", IMPORTANCE_WEIGHT[weights.scholarship]],
    ["career", IMPORTANCE_WEIGHT[weights.career]],
  ];

  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const weighted = entries.reduce(
    (sum, [key, weight]) => sum + dimensions[key].score * weight,
    0,
  );

  const reasons = Object.values(dimensions).flatMap((d) => d.reasons);
  const blockers = reasons.filter((r) => r.kind === "blocker");
  let overall = weighted / totalWeight;

  // A hard eligibility problem must not be averaged away by strong scores
  // elsewhere: an ineligible option is capped and labelled, never hidden.
  if (blockers.length > 0) overall = Math.min(overall, 100 - 15 * Math.min(blockers.length, 4));

  return {
    overall: Math.round(clamp(overall)),
    eligible: blockers.length === 0,
    dimensions,
    reasons,
    strengths: reasons.filter((r) => r.kind === "strength"),
    concerns: reasons.filter((r) => r.kind !== "strength"),
  };
}

export function fitLabel(score: number): string {
  if (score >= 85) return "Strong match";
  if (score >= 70) return "Good match";
  if (score >= 55) return "Workable";
  if (score >= 40) return "Stretch";
  return "Unlikely";
}

export function fitTone(score: number): "high" | "mid" | "low" {
  if (score >= 75) return "high";
  if (score >= 50) return "mid";
  return "low";
}
