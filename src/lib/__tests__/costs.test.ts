import { describe, expect, it } from "vitest";
import { annualFundingCapacity, computeScenario, WHAT_IF_PRESETS, type ScenarioInput } from "@/lib/costs";

// Mirrors the rounding rule computeScenario uses internally (round to the cent). Used to state
// "reconciles exactly with X * duration" expectations without tripping over raw floating-point
// multiplication noise that a plain `toBe` on the unrounded product would surface spuriously.
const round = (value: number) => Math.round(value * 100) / 100;

// ─────────────────────────── fixtures ───────────────────────────

function baseInput(overrides: Partial<ScenarioInput> = {}): ScenarioInput {
  return {
    currency: "USD",
    durationYears: 4,
    tuitionPerYear: 10000,
    admissionFee: 800,
    otherAcademicFees: 500,
    living: {
      housingPerMonth: 600,
      foodPerMonth: 300,
      transportPerMonth: 100,
      insurancePerMonth: 50,
      personalPerMonth: 150,
      booksPerYear: 400,
      visaFeesPerYear: 100,
    },
    flightsPerYear: 2,
    flightCost: 500,
    emergencyBufferMonths: 2,
    rentMultiplier: 1,
    tuitionMultiplier: 1,
    fxMultiplier: 1,
    roommateCount: 0,
    scholarshipPercent: 0,
    scholarshipStipendPerYear: 0,
    workAssumption: "NONE",
    work: { permittedHoursPerWeek: 20, hourlyWage: 15, weeksPerYear: 40 },
    funding: { annualFamilyBudget: 5000, savings: 4000, expectedSupport: 1000 },
    ...overrides,
  };
}

const line = (result: ReturnType<typeof computeScenario>, category: string) =>
  result.costLines.find((l) => l.category === category)!;
const funding = (result: ReturnType<typeof computeScenario>, key: string) =>
  result.fundingLines.find((f) => f.key === key)!;

// ─────────────────────────── annual / total-degree arithmetic ───────────────────────────

describe("computeScenario — annual and total-degree arithmetic", () => {
  it("sums every cost line into the annual cost, spreading the admission fee across the degree", () => {
    const result = computeScenario(baseInput());

    expect(line(result, "tuition").amountPerYear).toBe(10000);
    expect(line(result, "admission").amountPerYear).toBe(200); // 800 / 4 years
    expect(line(result, "academic_fees").amountPerYear).toBe(500);
    expect(line(result, "housing").amountPerYear).toBe(7200); // 600 * 12
    expect(line(result, "food").amountPerYear).toBe(3600);
    expect(line(result, "transport").amountPerYear).toBe(1200);
    expect(line(result, "insurance").amountPerYear).toBe(600);
    expect(line(result, "books").amountPerYear).toBe(400);
    expect(line(result, "personal").amountPerYear).toBe(1800);
    expect(line(result, "visa").amountPerYear).toBe(100);
    expect(line(result, "flights").amountPerYear).toBe(1000); // 2 * 500
    expect(line(result, "emergency").amountPerYear).toBe(2400); // 2 months of the 1200/mo living cost

    expect(result.annualCost).toBe(29000);
  });

  it("derives monthly cost and total degree cost from the annual figure", () => {
    const result = computeScenario(baseInput());
    expect(result.monthlyCost).toBe(2416.67);
    expect(result.totalDegreeCost).toBe(round(29000 * 4));
  });

  it("scales total degree cost with duration, reconciling exactly with the reported annual cost", () => {
    const twoYear = computeScenario(baseInput({ durationYears: 2 }));
    const sixYear = computeScenario(baseInput({ durationYears: 6 }));
    // totalDegreeCost is derived from the already-rounded annualCost, so it must reconcile
    // exactly (to the cent) with annualCost * duration — not merely land close to it. The
    // expected side is put through the same cent-rounding the source applies, since raw
    // floating-point multiplication alone carries sub-cent noise.
    expect(twoYear.totalDegreeCost).toBe(round(twoYear.annualCost * 2));
    expect(sixYear.totalDegreeCost).toBe(round(sixYear.annualCost * 6));
  });

  it("splits housing (and only housing) by roommate count", () => {
    const solo = computeScenario(baseInput({ roommateCount: 0 }));
    const oneRoommate = computeScenario(baseInput({ roommateCount: 1 }));
    const twoRoommates = computeScenario(baseInput({ roommateCount: 2 }));

    expect(line(oneRoommate, "housing").amountPerYear).toBe(line(solo, "housing").amountPerYear / 2);
    expect(line(twoRoommates, "housing").amountPerYear).toBe(line(solo, "housing").amountPerYear / 3);
    // nothing else moves
    expect(line(oneRoommate, "food").amountPerYear).toBe(line(solo, "food").amountPerYear);
    expect(line(oneRoommate, "housing").note).toMatch(/1 roommate$/);
    expect(line(twoRoommates, "housing").note).toMatch(/2 roommates$/);
  });

  it("applies rentMultiplier only to housing", () => {
    const base = computeScenario(baseInput());
    const higherRent = computeScenario(baseInput({ rentMultiplier: 1.5 }));
    expect(line(higherRent, "housing").amountPerYear).toBeCloseTo(line(base, "housing").amountPerYear * 1.5, 5);
    expect(line(higherRent, "food").amountPerYear).toBe(line(base, "food").amountPerYear);
    expect(line(higherRent, "tuition").amountPerYear).toBe(line(base, "tuition").amountPerYear);
  });

  it("applies tuitionMultiplier only to tuition", () => {
    const base = computeScenario(baseInput());
    const higherTuition = computeScenario(baseInput({ tuitionMultiplier: 1.08 }));
    expect(line(higherTuition, "tuition").amountPerYear).toBeCloseTo(line(base, "tuition").amountPerYear * 1.08, 5);
    expect(line(higherTuition, "housing").amountPerYear).toBe(line(base, "housing").amountPerYear);
  });

  it("applies fxMultiplier across tuition and living costs, but not to flights", () => {
    const base = computeScenario(baseInput());
    const fx = computeScenario(baseInput({ fxMultiplier: 2 }));
    expect(line(fx, "tuition").amountPerYear).toBe(line(base, "tuition").amountPerYear * 2);
    expect(line(fx, "housing").amountPerYear).toBe(line(base, "housing").amountPerYear * 2);
    expect(line(fx, "food").amountPerYear).toBe(line(base, "food").amountPerYear * 2);
    expect(line(fx, "admission").amountPerYear).toBe(line(base, "admission").amountPerYear * 2);
    // Flights are booked in the destination's currency terms already fixed by flightCost,
    // and the model does not run them through the fx multiplier.
    expect(line(fx, "flights").amountPerYear).toBe(line(base, "flights").amountPerYear);
  });

  it("computes the breakdown buckets so they sum back to the annual cost", () => {
    const result = computeScenario(baseInput());
    expect(result.breakdown.tuitionAndFees).toBe(10700); // tuition + admission + academic fees
    expect(result.breakdown.living).toBe(14800); // housing+food+transport+insurance+books+personal
    expect(result.breakdown.oneOff).toBe(3500); // visa + flights + emergency
    expect(result.breakdown.tuitionAndFees + result.breakdown.living + result.breakdown.oneOff).toBeCloseTo(
      result.annualCost,
      2,
    );
  });
});

// ─────────────────────────── scholarships & work as funding, not cost reduction ───────────────────────────

describe("computeScenario — scholarships and part-time work enter as funding, not cost reduction", () => {
  it("leaves annual cost unchanged when a scholarship is applied", () => {
    const withoutScholarship = computeScenario(baseInput({ scholarshipPercent: 0 }));
    const withScholarship = computeScenario(baseInput({ scholarshipPercent: 50, scholarshipStipendPerYear: 200 }));
    expect(withScholarship.annualCost).toBe(withoutScholarship.annualCost);
    expect(line(withScholarship, "tuition").amountPerYear).toBe(line(withoutScholarship, "tuition").amountPerYear);
  });

  it("adds the scholarship as a funding line covering tuition share plus any stipend", () => {
    const result = computeScenario(baseInput({ scholarshipPercent: 50, scholarshipStipendPerYear: 200 }));
    // tuition is 10000, 50% coverage = 5000, plus 200 stipend
    expect(funding(result, "scholarship").amountPerYear).toBe(5200);
    expect(funding(result, "scholarship").guaranteed).toBe(false);
  });

  it("counts the scholarship toward guaranteed funding even though it is flagged unguaranteed", () => {
    const base = computeScenario(baseInput({ scholarshipPercent: 0 }));
    const withScholarship = computeScenario(baseInput({ scholarshipPercent: 50, scholarshipStipendPerYear: 200 }));
    expect(withScholarship.annualFundingGuaranteed).toBe(base.annualFundingGuaranteed + 5200);
  });

  it("leaves annual cost unchanged regardless of the part-time work assumption", () => {
    const none = computeScenario(baseInput({ workAssumption: "NONE" }));
    const conservative = computeScenario(baseInput({ workAssumption: "CONSERVATIVE" }));
    const max = computeScenario(baseInput({ workAssumption: "PERMITTED_MAX" }));
    expect(conservative.annualCost).toBe(none.annualCost);
    expect(max.annualCost).toBe(none.annualCost);
  });

  it("computes work income at half rate for CONSERVATIVE and full rate for PERMITTED_MAX", () => {
    // work: 20 hrs/week * $15/hr * 40 weeks = 12000 at full rate
    const none = computeScenario(baseInput({ workAssumption: "NONE" }));
    const conservative = computeScenario(baseInput({ workAssumption: "CONSERVATIVE" }));
    const max = computeScenario(baseInput({ workAssumption: "PERMITTED_MAX" }));
    expect(none.workIncome).toBe(0);
    expect(conservative.workIncome).toBe(6000);
    expect(max.workIncome).toBe(12000);
  });

  it("keeps work income out of guaranteed funding, only adding it to the with-work figure", () => {
    const result = computeScenario(baseInput({ workAssumption: "PERMITTED_MAX" }));
    expect(funding(result, "work").guaranteed).toBe(false);
    expect(result.annualFundingWithWork).toBe(result.annualFundingGuaranteed + result.workIncome);
    // guaranteed funding must not itself include the work estimate
    const withoutWork = computeScenario(baseInput({ workAssumption: "NONE" }));
    expect(result.annualFundingGuaranteed).toBe(withoutWork.annualFundingGuaranteed);
  });
});

// ─────────────────────────── gap calculation ───────────────────────────

describe("computeScenario — gap calculation", () => {
  it("computes the annual gap as cost minus guaranteed funding (family + savings + support + scholarship)", () => {
    const result = computeScenario(baseInput());
    // family 5000 + savings 4000/4=1000 + support 1000 + scholarship 0 = 7000
    expect(result.annualFundingGuaranteed).toBe(7000);
    expect(result.annualGap).toBe(result.annualCost - 7000);
  });

  it("spreads savings evenly across the degree when computing guaranteed funding", () => {
    const twoYear = computeScenario(baseInput({ durationYears: 2, funding: { annualFamilyBudget: 0, savings: 4000, expectedSupport: 0 } }));
    const fourYear = computeScenario(baseInput({ durationYears: 4, funding: { annualFamilyBudget: 0, savings: 4000, expectedSupport: 0 } }));
    expect(funding(twoYear, "savings").amountPerYear).toBe(2000);
    expect(funding(fourYear, "savings").amountPerYear).toBe(1000);
  });

  it("reduces the gap once work income is factored in, without changing the guaranteed-funding gap", () => {
    const result = computeScenario(baseInput({ workAssumption: "PERMITTED_MAX" }));
    expect(result.annualGapWithWork).toBe(result.annualGap - result.workIncome);
    expect(result.annualGapWithWork).toBeLessThan(result.annualGap);
  });

  it("computes total gap as annualGap * durationYears exactly", () => {
    // totalGap is derived from the already-rounded annualGap, so it must reconcile exactly
    // (to the cent) with annualGap * duration — modulo the same cent-rounding the source
    // applies, since raw floating-point multiplication alone carries sub-cent noise.
    const input = baseInput({ durationYears: 3 });
    const result = computeScenario(input);
    expect(result.totalGap).toBe(round(result.annualGap * 3));
  });

  it("can report a negative gap (surplus) when guaranteed funding exceeds cost", () => {
    const result = computeScenario(
      baseInput({ funding: { annualFamilyBudget: 100000, savings: 0, expectedSupport: 0 } }),
    );
    expect(result.annualGap).toBeLessThan(0);
  });
});

// ─────────────────────────── annualFundingCapacity ───────────────────────────

describe("annualFundingCapacity", () => {
  it("adds family budget and expected support to savings spread across the degree", () => {
    const result = annualFundingCapacity(
      { annualFamilyBudget: 5000, expectedSupport: 1000, availableSavings: 4000 },
      4,
    );
    expect(result).toBe(5000 + 1000 + 4000 / 4);
  });

  it("defaults duration to 4 years when not specified", () => {
    const result = annualFundingCapacity({ annualFamilyBudget: 0, expectedSupport: 0, availableSavings: 4000 });
    expect(result).toBe(1000);
  });

  it("treats missing fields as zero", () => {
    expect(annualFundingCapacity({})).toBe(0);
  });

  it("spreads savings over a different duration correctly", () => {
    const result = annualFundingCapacity({ availableSavings: 9000 }, 3);
    expect(result).toBe(3000);
  });
});

// ─────────────────────────── what-if presets ───────────────────────────

describe("WHAT_IF_PRESETS", () => {
  const preset = (id: string) => WHAT_IF_PRESETS.find((p) => p.id === id)!;

  it("rent-up increases only rentMultiplier", () => {
    const input = baseInput({ rentMultiplier: 1 });
    const result = preset("rent-up").apply(input);
    expect(result.rentMultiplier).toBeCloseTo(1.15, 10);
    expect({ ...result, rentMultiplier: input.rentMultiplier }).toEqual(input);
  });

  it("scholarship-30 raises scholarshipPercent to at least 30, never lowering an existing higher award", () => {
    const raised = preset("scholarship-30").apply(baseInput({ scholarshipPercent: 10 }));
    expect(raised.scholarshipPercent).toBe(30);

    const untouched = preset("scholarship-30").apply(baseInput({ scholarshipPercent: 50 }));
    expect(untouched.scholarshipPercent).toBe(50);

    const input = baseInput({ scholarshipPercent: 10 });
    const result = preset("scholarship-30").apply(input);
    expect({ ...result, scholarshipPercent: input.scholarshipPercent }).toEqual(input);
  });

  it("fx-up increases only fxMultiplier", () => {
    const input = baseInput({ fxMultiplier: 1 });
    const result = preset("fx-up").apply(input);
    expect(result.fxMultiplier).toBeCloseTo(1.1, 10);
    expect({ ...result, fxMultiplier: input.fxMultiplier }).toEqual(input);
  });

  it("no-work sets workAssumption to NONE without touching the work hours/wage inputs", () => {
    const input = baseInput({ workAssumption: "PERMITTED_MAX" });
    const result = preset("no-work").apply(input);
    expect(result.workAssumption).toBe("NONE");
    expect(result.work).toEqual(input.work);
    expect({ ...result, workAssumption: input.workAssumption }).toEqual(input);
  });

  it("tuition-up increases only tuitionMultiplier", () => {
    const input = baseInput({ tuitionMultiplier: 1 });
    const result = preset("tuition-up").apply(input);
    expect(result.tuitionMultiplier).toBeCloseTo(1.08, 10);
    expect({ ...result, tuitionMultiplier: input.tuitionMultiplier }).toEqual(input);
  });

  it("roommate sets roommateCount to at least 1, never lowering an existing higher count", () => {
    const raised = preset("roommate").apply(baseInput({ roommateCount: 0 }));
    expect(raised.roommateCount).toBe(1);

    const untouched = preset("roommate").apply(baseInput({ roommateCount: 2 }));
    expect(untouched.roommateCount).toBe(2);

    const input = baseInput({ roommateCount: 0 });
    const result = preset("roommate").apply(input);
    expect({ ...result, roommateCount: input.roommateCount }).toEqual(input);
  });

  it("each preset id is unique", () => {
    const ids = WHAT_IF_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
