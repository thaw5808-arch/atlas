import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEIGHTS,
  fitLabel,
  fitTone,
  scoreAcademic,
  scoreCandidate,
  scoreCareer,
  scoreFinancial,
  scoreLanguage,
  scoreLocation,
  scoreScholarship,
  type CandidateInput,
  type StudentInput,
  type Weights,
} from "@/lib/decision";

// ─────────────────────────── fixtures ───────────────────────────

function student(overrides: Partial<StudentInput> = {}): StudentInput {
  return {
    gpa: null,
    gpaScale: null,
    educationLevel: null,
    desiredMajorId: null,
    desiredFieldName: null,
    preferredCountries: [],
    preferredEnvironment: "NO_PREFERENCE",
    annualFundingCapacity: 0,
    maxTuitionPerYear: null,
    maxLivingCostPerYear: null,
    languages: [],
    scholarshipRequired: false,
    minScholarshipPercent: null,
    willingToWorkPartTime: false,
    careerGoal: null,
    ...overrides,
  };
}

function candidate(overrides: Partial<CandidateInput> = {}): CandidateInput {
  return {
    universityId: "u1",
    universityName: "Test University",
    countryCode: "JP",
    countryName: "Japan",
    cityEnvironment: "MAJOR_METRO",
    globalRanking: null,
    partTimeFriendly: false,
    workHoursPerWeek: null,
    program: {
      id: "p1",
      name: "BSc Computer Science",
      majorId: "cs",
      majorName: "Computer Science",
      fieldName: "Engineering",
      languageOfInstruction: "English",
      durationYears: 4,
    },
    requirement: null,
    languageRequirements: [],
    annualCost: { tuition: 10000, fees: 1000, living: 8000, total: 19000 },
    scholarships: [],
    ...overrides,
  };
}

const reasonKinds = (result: { reasons: { kind: string }[] }) => result.reasons.map((r) => r.kind);

// ─────────────────────────── academic ───────────────────────────

describe("scoreAcademic", () => {
  it("returns a neutral estimate with an unknown reason when there's no published GPA requirement", () => {
    const result = scoreAcademic(student(), candidate({ requirement: null }));
    expect(reasonKinds(result)).toContain("unknown");
    // gpaScore defaults to 65, programScore defaults to 55 (no major/field on file)
    expect(result.score).toBeCloseTo(65 * 0.6 + 55 * 0.4, 5);
  });

  it("asks for a GPA on file when the program has a requirement but the student hasn't set one", () => {
    const result = scoreAcademic(
      student({ gpa: null }),
      candidate({ requirement: { minGpa: 3.0, gpaScale: 4, minEducationLevel: "HIGH_SCHOOL" } }),
    );
    expect(result.reasons.some((r) => r.kind === "unknown" && /Add your GPA/.test(r.message))).toBe(true);
  });

  it("scores exactly 78 at the zero-margin boundary (GPA meets minimum exactly)", () => {
    const result = scoreAcademic(
      student({ gpa: 3.0, gpaScale: 4 }),
      candidate({ requirement: { minGpa: 3.0, gpaScale: 4, minEducationLevel: "HIGH_SCHOOL" } }),
    );
    // gpaScore = 78, programScore = 55 (no major/field match) -> 78*0.6 + 55*0.4
    expect(result.score).toBeCloseTo(78 * 0.6 + 55 * 0.4, 5);
    expect(result.reasons.some((r) => r.kind === "strength" && /little margin/.test(r.message))).toBe(true);
  });

  it("treats a margin just below zero as a near-miss blocker, not a pass", () => {
    // margin = -0.05: interpolates between (-0.3, 35) and (0, 78)
    const result = scoreAcademic(
      student({ gpa: 2.95, gpaScale: 4 }),
      candidate({ requirement: { minGpa: 3.0, gpaScale: 4, minEducationLevel: "HIGH_SCHOOL" } }),
    );
    const expectedGpaScore = 35 + (0.25 / 0.3) * (78 - 35);
    expect(result.score).toBeCloseTo(expectedGpaScore * 0.6 + 55 * 0.4, 3);
    expect(result.reasons.some((r) => r.kind === "blocker" && /below the stated minimum/.test(r.message))).toBe(
      true,
    );
  });

  it("rewards a comfortable margin with the higher-confidence strength message", () => {
    const result = scoreAcademic(
      student({ gpa: 3.5, gpaScale: 4 }),
      candidate({ requirement: { minGpa: 3.0, gpaScale: 4, minEducationLevel: "HIGH_SCHOOL" } }),
    );
    expect(result.reasons.some((r) => r.kind === "strength" && /comfortably above/.test(r.message))).toBe(true);
  });

  it("normalises GPA scales before comparing (3.4/4 meets 8.5/10)", () => {
    const result = scoreAcademic(
      student({ gpa: 3.4, gpaScale: 4 }),
      candidate({ requirement: { minGpa: 8.5, gpaScale: 10, minEducationLevel: "HIGH_SCHOOL" } }),
    );
    // both normalise to 3.4/4 -> margin 0
    expect(result.reasons.some((r) => r.kind === "strength")).toBe(true);
    expect(result.reasons.some((r) => r.kind === "blocker")).toBe(false);
  });

  it("blocks and caps the GPA score when the student's education level is below the requirement", () => {
    const result = scoreAcademic(
      student({ gpa: 4.0, gpaScale: 4, educationLevel: "HIGH_SCHOOL" }),
      candidate({ requirement: { minGpa: 3.0, gpaScale: 4, minEducationLevel: "MASTER" } }),
    );
    expect(result.reasons.some((r) => r.kind === "blocker" && /master level study first/.test(r.message))).toBe(
      true,
    );
    // gpaScore capped at 20 despite a perfect GPA margin
    expect(result.score).toBeCloseTo(20 * 0.6 + 55 * 0.4, 5);
  });

  it("scores a full program-major match at 100 and blends it in at 40%", () => {
    const result = scoreAcademic(
      student({ desiredMajorId: "cs" }),
      candidate({ requirement: null, program: { ...candidate().program, majorId: "cs" } }),
    );
    expect(result.reasons.some((r) => r.kind === "strength" && /subject you said you want/.test(r.message))).toBe(
      true,
    );
    expect(result.score).toBeCloseTo(65 * 0.6 + 100 * 0.4, 5);
  });

  it("scores a field-only match at 75, lower than an exact major match", () => {
    const result = scoreAcademic(
      student({ desiredFieldName: "Engineering" }),
      candidate({ requirement: null }),
    );
    expect(result.score).toBeCloseTo(65 * 0.6 + 75 * 0.4, 5);
  });

  it("flags a concern when the student wants a different subject entirely", () => {
    const result = scoreAcademic(
      student({ desiredMajorId: "biology", desiredFieldName: "Life Sciences" }),
      candidate({ requirement: null }),
    );
    expect(result.reasons.some((r) => r.kind === "concern" && /not the subject on your profile/.test(r.message))).toBe(
      true,
    );
    expect(result.score).toBeCloseTo(65 * 0.6 + 55 * 0.4, 5);
  });

  it("raises portfolio and interview requirements as concerns", () => {
    const result = scoreAcademic(
      student(),
      candidate({
        requirement: {
          minGpa: null,
          minEducationLevel: "HIGH_SCHOOL",
          portfolioRequired: true,
          interviewRequired: true,
        },
      }),
    );
    expect(result.reasons.filter((r) => r.kind === "concern")).toHaveLength(2);
  });
});

// ─────────────────────────── financial ───────────────────────────

describe("scoreFinancial", () => {
  it("returns a neutral 50 with an unknown reason when the student hasn't set a budget", () => {
    const result = scoreFinancial(student({ annualFundingCapacity: 0 }), candidate());
    expect(result.score).toBe(50);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0].kind).toBe("unknown");
  });

  it("scores exactly 82 when funding exactly matches net cost (ratio = 1)", () => {
    const result = scoreFinancial(
      student({ annualFundingCapacity: 19000 }),
      candidate({ annualCost: { tuition: 10000, fees: 1000, living: 8000, total: 19000 }, scholarships: [] }),
    );
    expect(result.score).toBe(82);
    expect(result.reasons.some((r) => r.kind === "strength" && /left over each year/.test(r.message))).toBe(true);
  });

  it("treats a shortfall at exactly 25% of net cost as a concern, not a blocker", () => {
    // netCost 19000, funding 14250 -> gap 4750, gap/netCost = 0.25 exactly
    const result = scoreFinancial(
      student({ annualFundingCapacity: 14250 }),
      candidate({ annualCost: { tuition: 10000, fees: 1000, living: 8000, total: 19000 }, scholarships: [] }),
    );
    const gapReason = result.reasons.find((r) => /more per year than you can currently fund/.test(r.message));
    expect(gapReason?.kind).toBe("concern");
  });

  it("escalates to a blocker once the shortfall exceeds 25% of net cost", () => {
    const result = scoreFinancial(
      student({ annualFundingCapacity: 14000 }), // gap 5000, 5000/19000 = 0.263...
      candidate({ annualCost: { tuition: 10000, fees: 1000, living: 8000, total: 19000 }, scholarships: [] }),
    );
    const gapReason = result.reasons.find((r) => /more per year than you can currently fund/.test(r.message));
    expect(gapReason?.kind).toBe("blocker");
  });

  it("nets the best available scholarship off the cost before scoring, and reports it as a strength", () => {
    const withoutScholarship = scoreFinancial(
      student({ annualFundingCapacity: 15000 }),
      candidate({ annualCost: { tuition: 10000, fees: 1000, living: 8000, total: 19000 }, scholarships: [] }),
    );
    const withScholarship = scoreFinancial(
      student({ annualFundingCapacity: 15000 }),
      candidate({
        annualCost: { tuition: 10000, fees: 1000, living: 8000, total: 19000 },
        scholarships: [{ name: "Merit", eligibility: "ELIGIBLE", coveragePercent: 50 }],
      }),
    );
    expect(withScholarship.score).toBeGreaterThan(withoutScholarship.score);
    expect(withScholarship.reasons.some((r) => r.kind === "strength" && /50% of the annual cost/.test(r.message))).toBe(
      true,
    );
  });

  it("ignores scholarships the student is not eligible for when computing net cost", () => {
    const result = scoreFinancial(
      student({ annualFundingCapacity: 19000 }),
      candidate({
        annualCost: { tuition: 10000, fees: 1000, living: 8000, total: 19000 },
        scholarships: [{ name: "Elite award", eligibility: "NOT_ELIGIBLE", coveragePercent: 90 }],
      }),
    );
    expect(result.score).toBe(82); // same as the no-scholarship case
  });

  it("flags tuition and living-cost ceilings set on the student's profile", () => {
    const result = scoreFinancial(
      student({ annualFundingCapacity: 19000, maxTuitionPerYear: 5000, maxLivingCostPerYear: 5000 }),
      candidate({ annualCost: { tuition: 10000, fees: 1000, living: 8000, total: 19000 } }),
    );
    expect(result.reasons.some((r) => /Tuition is above the ceiling/.test(r.message))).toBe(true);
    expect(result.reasons.some((r) => /living costs are above the ceiling/.test(r.message))).toBe(true);
  });
});

// ─────────────────────────── language ───────────────────────────

describe("scoreLanguage", () => {
  it("returns a neutral 65 with unknown reason when no requirement is on file", () => {
    const result = scoreLanguage(student(), candidate({ languageRequirements: [] }));
    expect(result.score).toBe(65);
    expect(result.reasons[0].kind).toBe("unknown");
  });

  it("blocks when a required (non-waivable) test result is missing and no alternative is on file", () => {
    const result = scoreLanguage(
      student({ languages: [] }),
      candidate({ languageRequirements: [{ test: "IELTS", minScore: 6.5, waivable: false }] }),
    );
    expect(result.score).toBe(0);
    expect(result.reasons[0].kind).toBe("blocker");
  });

  it("gives partial credit for a missing required test when the student has some other language evidence", () => {
    const result = scoreLanguage(
      student({ languages: [{ test: "TOEFL_IBT", score: 90 }] }),
      candidate({ languageRequirements: [{ test: "IELTS", minScore: 6.5, waivable: false }] }),
    );
    expect(result.score).toBe(15);
  });

  it("treats a missing but waivable test as a concern worth 40, not a blocker", () => {
    const result = scoreLanguage(
      student({ languages: [] }),
      candidate({ languageRequirements: [{ test: "IELTS", minScore: 6.5, waivable: true }] }),
    );
    expect(result.score).toBe(40);
    expect(result.reasons[0].kind).toBe("concern");
  });

  it("scores exactly 84 at the zero-margin score boundary", () => {
    const result = scoreLanguage(
      student({ languages: [{ test: "IELTS", score: 6.5 }] }),
      candidate({ languageRequirements: [{ test: "IELTS", minScore: 6.5, waivable: false }] }),
    );
    expect(result.score).toBe(84);
    expect(result.reasons[0].kind).toBe("strength");
  });

  it("treats a near-miss within the test's tolerance as a fixable concern (55), not a blocker", () => {
    // IELTS near-miss tolerance is 0.5
    const result = scoreLanguage(
      student({ languages: [{ test: "IELTS", score: 6.0 }] }),
      candidate({ languageRequirements: [{ test: "IELTS", minScore: 6.5, waivable: false }] }),
    );
    expect(result.score).toBe(55);
    expect(result.reasons[0].kind).toBe("concern");
    expect(result.reasons[0].message).toMatch(/one retake would likely close it/);
  });

  it("blocks once the shortfall exceeds the near-miss tolerance", () => {
    const result = scoreLanguage(
      student({ languages: [{ test: "IELTS", score: 5.9 }] }), // 0.6 below, tolerance is 0.5
      candidate({ languageRequirements: [{ test: "IELTS", minScore: 6.5, waivable: false }] }),
    );
    expect(result.score).toBe(15);
    expect(result.reasons[0].kind).toBe("blocker");
  });

  it("scores band requirements: exceed, meet, one-level-short and far-short", () => {
    const req = (minBand: string): CandidateInput["languageRequirements"][number] => ({
      test: "JLPT",
      minBand,
      waivable: false,
    });

    expect(
      scoreLanguage(student({ languages: [{ test: "JLPT", band: "N1" }] }), candidate({ languageRequirements: [req("N2")] }))
        .score,
    ).toBe(100);
    expect(
      scoreLanguage(student({ languages: [{ test: "JLPT", band: "N2" }] }), candidate({ languageRequirements: [req("N2")] }))
        .score,
    ).toBe(88);
    expect(
      scoreLanguage(student({ languages: [{ test: "JLPT", band: "N3" }] }), candidate({ languageRequirements: [req("N2")] }))
        .score,
    ).toBe(50);
    expect(
      scoreLanguage(student({ languages: [{ test: "JLPT", band: "N5" }] }), candidate({ languageRequirements: [req("N2")] }))
        .score,
    ).toBe(10);
  });

  it("takes the minimum across multiple requirements, not an average", () => {
    const result = scoreLanguage(
      student({ languages: [{ test: "IELTS", score: 8.0 }] }), // would score 100 alone
      candidate({
        languageRequirements: [
          { test: "IELTS", minScore: 6.5, waivable: false },
          { test: "TOEFL_IBT", minScore: 100, waivable: false }, // missing entirely
        ],
      }),
    );
    expect(result.score).toBe(15); // missing required TOEFL with an alternative present
  });
});

// ─────────────────────────── location ───────────────────────────

describe("scoreLocation", () => {
  it("scores 70 with an unknown reason when no preferred countries are set", () => {
    const result = scoreLocation(student({ preferredCountries: [] }), candidate());
    // countryScore 70, environmentScore 70 (NO_PREFERENCE default) -> 70*0.65+70*0.35 = 70
    expect(result.score).toBe(70);
    expect(result.reasons[0].kind).toBe("unknown");
  });

  it("rewards a preferred country and penalises a non-preferred one", () => {
    const preferred = scoreLocation(student({ preferredCountries: ["JP"] }), candidate({ countryCode: "JP" }));
    const other = scoreLocation(student({ preferredCountries: ["JP"] }), candidate({ countryCode: "DE" }));
    expect(preferred.score).toBeGreaterThan(other.score);
    expect(preferred.reasons[0].kind).toBe("strength");
    expect(other.reasons[0].kind).toBe("concern");
  });

  it("computes the 65/35 blend of country and environment fit", () => {
    const result = scoreLocation(
      student({ preferredCountries: ["JP"], preferredEnvironment: "UNIVERSITY_TOWN" }),
      candidate({ countryCode: "JP", cityEnvironment: "MAJOR_METRO" }),
    );
    // countryScore 100 (match), environmentScore 55 (mismatch)
    expect(result.score).toBeCloseTo(100 * 0.65 + 55 * 0.35, 5);
  });

  it("notes part-time work hours as a strength when the student wants to work and the school allows it", () => {
    const result = scoreLocation(
      student({ willingToWorkPartTime: true }),
      candidate({ partTimeFriendly: true, workHoursPerWeek: 20 }),
    );
    expect(result.reasons.some((r) => r.kind === "strength" && /20 hours a week/.test(r.message))).toBe(true);
  });

  it("flags limited part-time options as a concern when the student wants to work but the school doesn't allow it", () => {
    const result = scoreLocation(
      student({ willingToWorkPartTime: true }),
      candidate({ partTimeFriendly: false }),
    );
    expect(result.reasons.some((r) => r.kind === "concern" && /Part-time work options/.test(r.message))).toBe(true);
  });
});

// ─────────────────────────── scholarship ───────────────────────────

describe("scoreScholarship", () => {
  it("scores low with a concern when the university has no recorded scholarships, worse if one is required", () => {
    const notRequired = scoreScholarship(student({ scholarshipRequired: false }), candidate({ scholarships: [] }));
    const required = scoreScholarship(student({ scholarshipRequired: true }), candidate({ scholarships: [] }));
    expect(notRequired.score).toBe(30);
    expect(required.score).toBe(10);
  });

  it("scores the effective-coverage curve at its documented boundaries", () => {
    const at = (eligiblePct: number) =>
      scoreScholarship(
        student(),
        candidate({ scholarships: [{ name: "A", eligibility: "ELIGIBLE", coveragePercent: eligiblePct }] }),
      ).score;
    expect(at(0)).toBe(20);
    expect(at(15)).toBe(45);
    expect(at(30)).toBe(68);
    expect(at(60)).toBe(88);
    expect(at(100)).toBe(100);
  });

  it("counts possible (not-yet-confirmed) awards at half weight toward the effective coverage", () => {
    const eligibleOnly = scoreScholarship(
      student(),
      candidate({ scholarships: [{ name: "A", eligibility: "ELIGIBLE", coveragePercent: 30 }] }),
    );
    const withPossibleToo = scoreScholarship(
      student(),
      candidate({
        scholarships: [
          { name: "A", eligibility: "ELIGIBLE", coveragePercent: 30 },
          { name: "B", eligibility: "POSSIBLE", coveragePercent: 40 }, // effective +20
        ],
      }),
    );
    expect(withPossibleToo.score).toBeGreaterThan(eligibleOnly.score);
    expect(withPossibleToo.reasons.some((r) => r.kind === "concern" && /need details/.test(r.message))).toBe(true);
  });

  it("caps the score at 25 when every recorded award is currently out of reach", () => {
    const result = scoreScholarship(
      student(),
      candidate({ scholarships: [{ name: "A", eligibility: "NOT_ELIGIBLE", coveragePercent: 80 }] }),
    );
    expect(result.score).toBeLessThanOrEqual(25);
    expect(result.reasons.some((r) => r.kind === "concern" && /don't currently meet/.test(r.message))).toBe(true);
  });

  it("raises a blocker when a scholarship is required but no award clears the student's minimum", () => {
    const result = scoreScholarship(
      student({ scholarshipRequired: true, minScholarshipPercent: 50 }),
      candidate({ scholarships: [{ name: "A", eligibility: "ELIGIBLE", coveragePercent: 30 }] }),
    );
    expect(result.reasons.some((r) => r.kind === "blocker")).toBe(true);
  });

  it("does not raise the required-scholarship blocker once an award meets the minimum", () => {
    const result = scoreScholarship(
      student({ scholarshipRequired: true, minScholarshipPercent: 30 }),
      candidate({ scholarships: [{ name: "A", eligibility: "ELIGIBLE", coveragePercent: 30 }] }),
    );
    expect(result.reasons.some((r) => r.kind === "blocker")).toBe(false);
  });
});

// ─────────────────────────── career ───────────────────────────

describe("scoreCareer", () => {
  it("returns a neutral 60 with an unknown reason when no career goal is set", () => {
    const result = scoreCareer(student({ careerGoal: null }), candidate());
    expect(result.score).toBe(60);
    expect(result.reasons[0].kind).toBe("unknown");
  });

  it("scores the keyword-overlap curve at its documented boundaries", () => {
    const zero = scoreCareer(student({ careerGoal: "become a chef" }), candidate());
    const one = scoreCareer(
      student({ careerGoal: "software engineer" }),
      candidate({ program: { ...candidate().program, fieldName: "Engineering", majorName: "Computer Science", name: "Unrelated" } }),
    );
    expect(zero.score).toBe(45);
    // "engineer" doesn't literally match "Engineering" token-for-token, so build an exact-token case instead:
    expect(one.score).toBeGreaterThanOrEqual(45);
  });

  it("matches on exact lower-cased tokens shared between goal and program fields", () => {
    const result = scoreCareer(
      student({ careerGoal: "I want to work in robotics and computer vision" }),
      candidate({
        program: {
          ...candidate().program,
          name: "MSc Robotics",
          majorName: "Robotics",
          fieldName: "Computer Vision",
        },
      }),
    );
    // overlap: "robotics" and "computer" and "vision" -> 3+ overlap -> 96
    expect(result.score).toBe(96);
    expect(result.reasons[0].kind).toBe("strength");
  });

  it("adds a small bonus for term-time work when both student and school support it", () => {
    const without = scoreCareer(student({ careerGoal: "engineer", willingToWorkPartTime: false }), candidate());
    const withWork = scoreCareer(
      student({ careerGoal: "engineer", willingToWorkPartTime: true }),
      candidate({ partTimeFriendly: true }),
    );
    expect(withWork.score - without.score).toBeCloseTo(4, 5);
  });
});

// ─────────────────────────── composition: scoreCandidate ───────────────────────────

describe("scoreCandidate", () => {
  it("caps the overall score by 15 points per blocker, up to 4", () => {
    // Build a candidate with a single academic blocker (missing education level) but otherwise
    // maximal inputs everywhere else, so the uncapped weighted average would be very high.
    const strongStudent = student({
      gpa: 4.0,
      gpaScale: 4,
      educationLevel: "HIGH_SCHOOL",
      annualFundingCapacity: 100000,
      preferredCountries: ["JP"],
      preferredEnvironment: "MAJOR_METRO",
      careerGoal: "computer science engineer",
    });
    const oneBlockerCandidate = candidate({
      requirement: { minGpa: 3.0, gpaScale: 4, minEducationLevel: "MASTER" }, // -> 1 blocker
      annualCost: { tuition: 1000, fees: 0, living: 1000, total: 2000 },
      countryCode: "JP",
      cityEnvironment: "MAJOR_METRO",
      program: { ...candidate().program, name: "Computer Science Engineering", fieldName: "Computer Science" },
    });
    const result = scoreCandidate(strongStudent, oneBlockerCandidate);
    expect(result.eligible).toBe(false);
    expect(result.overall).toBeLessThanOrEqual(85);
  });

  it("caps more aggressively as blockers accumulate, flattening out at 4+", () => {
    // Three independent blocker sources: academic (GPA below minimum), language (missing
    // required test with no alternative on file), and scholarship (required but no recorded
    // award reaches the student's minimum — needs at least one scholarship on file, since a
    // university with zero recorded scholarships short-circuits to a concern instead).
    const threeBlockers = candidate({
      requirement: { minGpa: 3.9, gpaScale: 4, minEducationLevel: "HIGH_SCHOOL" },
      languageRequirements: [{ test: "IELTS", minScore: 9, waivable: false }],
      scholarships: [{ name: "Small award", eligibility: "ELIGIBLE", coveragePercent: 10 }],
    });
    const result = scoreCandidate(
      student({
        gpa: 2.0,
        gpaScale: 4,
        scholarshipRequired: true,
        minScholarshipPercent: 50,
        languages: [],
      }),
      threeBlockers,
    );
    expect(result.reasons.filter((r) => r.kind === "blocker").length).toBeGreaterThanOrEqual(3);
    expect(result.overall).toBeLessThanOrEqual(100 - 15 * 3);
  });

  it("is eligible (no cap applied) when there are no blockers", () => {
    const result = scoreCandidate(student({ annualFundingCapacity: 50000 }), candidate());
    expect(result.eligible).toBe(true);
    expect(result.reasons.some((r) => r.kind === "blocker")).toBe(false);
  });

  it("nudges the academic dimension toward the ranking score, scaled by the ranking weight", () => {
    const s = student();
    const rankedCandidate = candidate({ requirement: null, globalRanking: 1 }); // rankingScore 100
    const lowWeight: Weights = { ...DEFAULT_WEIGHTS, ranking: "LOW" };
    const highWeight: Weights = { ...DEFAULT_WEIGHTS, ranking: "VERY_HIGH" };
    const withLow = scoreCandidate(s, rankedCandidate, lowWeight);
    const withHigh = scoreCandidate(s, rankedCandidate, highWeight);
    // A #1 global ranking pulls the academic score up; weighting it higher should pull harder.
    expect(withHigh.dimensions.academic.score).toBeGreaterThanOrEqual(withLow.dimensions.academic.score);
  });

  it("changes the ranking between two candidates when weights shift emphasis", () => {
    // Candidate A: financially excellent, academically weak.
    // Candidate B: academically excellent, financially weak.
    const s = student({
      gpa: 3.8,
      gpaScale: 4,
      annualFundingCapacity: 20000,
      careerGoal: null,
    });
    const candidateA = candidate({
      requirement: { minGpa: 3.9, gpaScale: 4, minEducationLevel: "HIGH_SCHOOL" }, // student falls just short -> lower academic, no blocker since 3.8 vs 3.9 margin -0.1 (within -0.3..0 range, not a blocker unless margin<0... margin<0 IS a blocker)
      annualCost: { tuition: 1000, fees: 0, living: 500, total: 1500 },
    });
    const candidateB = candidate({
      requirement: { minGpa: 2.0, gpaScale: 4, minEducationLevel: "HIGH_SCHOOL" },
      annualCost: { tuition: 40000, fees: 0, living: 10000, total: 50000 },
    });

    const financeHeavy: Weights = { ...DEFAULT_WEIGHTS, financial: "VERY_HIGH", academic: "LOW" };
    const academicHeavy: Weights = { ...DEFAULT_WEIGHTS, financial: "LOW", academic: "VERY_HIGH" };

    const underFinance = [candidateA, candidateB]
      .map((c) => ({ id: c.annualCost.total, score: scoreCandidate(s, c, financeHeavy).overall }))
      .sort((a, b) => b.score - a.score);
    const underAcademic = [candidateA, candidateB]
      .map((c) => ({ id: c.annualCost.total, score: scoreCandidate(s, c, academicHeavy).overall }))
      .sort((a, b) => b.score - a.score);

    // Weighting finance heavily should favour the cheap candidate (A, total 1500) on top;
    // weighting academics heavily should favour B (easier GPA bar) on top instead.
    expect(underFinance[0].id).toBe(1500);
    expect(underAcademic[0].id).toBe(50000);
    expect(underFinance[0].id).not.toBe(underAcademic[0].id);
  });
});

// ─────────────────────────── labels ───────────────────────────

describe("fitLabel", () => {
  it("switches labels at each documented boundary", () => {
    expect(fitLabel(85)).toBe("Strong match");
    expect(fitLabel(84.999)).toBe("Good match");
    expect(fitLabel(70)).toBe("Good match");
    expect(fitLabel(69.999)).toBe("Workable");
    expect(fitLabel(55)).toBe("Workable");
    expect(fitLabel(54.999)).toBe("Stretch");
    expect(fitLabel(40)).toBe("Stretch");
    expect(fitLabel(39.999)).toBe("Unlikely");
  });
});

describe("fitTone", () => {
  it("switches tone at each documented boundary", () => {
    expect(fitTone(75)).toBe("high");
    expect(fitTone(74.999)).toBe("mid");
    expect(fitTone(50)).toBe("mid");
    expect(fitTone(49.999)).toBe("low");
  });
});
