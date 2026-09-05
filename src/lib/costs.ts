/**
 * Cost, scenario and what-if engine.
 *
 * Every figure here is an estimate built from stored cost records and the
 * student's own assumptions. Work income is always a scenario, never counted
 * as guaranteed funding — see `workIncome` below.
 */

export type HousingTypeCode = "ON_CAMPUS" | "SHARED_OFF_CAMPUS" | "PRIVATE_OFF_CAMPUS";
export type WorkAssumptionCode = "NONE" | "CONSERVATIVE" | "PERMITTED_MAX";

export type CostCategory =
  | "tuition"
  | "admission"
  | "academic_fees"
  | "housing"
  | "food"
  | "transport"
  | "insurance"
  | "books"
  | "personal"
  | "visa"
  | "flights"
  | "emergency";

export type CostLine = {
  category: CostCategory;
  label: string;
  amountPerYear: number;
  note?: string;
};

export type FundingLine = {
  key: "scholarship" | "family" | "savings" | "support" | "work";
  label: string;
  amountPerYear: number;
  guaranteed: boolean;
  note?: string;
};

export type ScenarioInput = {
  currency: string;
  durationYears: number;
  tuitionPerYear: number;
  admissionFee: number;
  otherAcademicFees: number;
  living: {
    housingPerMonth: number;
    foodPerMonth: number;
    transportPerMonth: number;
    insurancePerMonth: number;
    personalPerMonth: number;
    booksPerYear: number;
    visaFeesPerYear: number;
  };
  flightsPerYear: number;
  flightCost: number;
  emergencyBufferMonths: number;
  /** Modifiers — 1 means "leave it as recorded". */
  rentMultiplier: number;
  tuitionMultiplier: number;
  fxMultiplier: number;
  roommateCount: number;
  scholarshipPercent: number; // 0–100 of tuition
  scholarshipStipendPerYear: number;
  workAssumption: WorkAssumptionCode;
  work: { permittedHoursPerWeek: number; hourlyWage: number; weeksPerYear: number };
  funding: { annualFamilyBudget: number; savings: number; expectedSupport: number };
};

export type ScenarioResult = {
  currency: string;
  costLines: CostLine[];
  fundingLines: FundingLine[];
  annualCost: number;
  monthlyCost: number;
  totalDegreeCost: number;
  annualFundingGuaranteed: number;
  annualFundingWithWork: number;
  annualGap: number;
  annualGapWithWork: number;
  totalGap: number;
  workIncome: number;
  breakdown: { tuitionAndFees: number; living: number; oneOff: number };
};

const round = (value: number) => Math.round(value * 100) / 100;

export function computeScenario(input: ScenarioInput): ScenarioResult {
  const fx = input.fxMultiplier || 1;
  const share = 1 / Math.max(1, 1 + Math.max(0, input.roommateCount));

  const tuition = input.tuitionPerYear * input.tuitionMultiplier * fx;
  const scholarshipOnTuition = tuition * (Math.min(100, Math.max(0, input.scholarshipPercent)) / 100);

  const housing = input.living.housingPerMonth * 12 * input.rentMultiplier * share * fx;
  const food = input.living.foodPerMonth * 12 * fx;
  const transport = input.living.transportPerMonth * 12 * fx;
  const insurance = input.living.insurancePerMonth * 12 * fx;
  const personal = input.living.personalPerMonth * 12 * fx;
  const books = input.living.booksPerYear * fx;
  const visa = input.living.visaFeesPerYear * fx;
  const flights = input.flightsPerYear * input.flightCost;

  const monthlyLiving = (housing + food + transport + insurance + personal) / 12;
  const emergency = monthlyLiving * input.emergencyBufferMonths;

  const costLines: CostLine[] = [
    { category: "tuition", label: "Tuition", amountPerYear: round(tuition) },
    {
      category: "admission",
      label: "Admission fee",
      amountPerYear: round(input.admissionFee * fx) / input.durationYears,
      note: "One-off fee, spread across the degree",
    },
    { category: "academic_fees", label: "Other academic fees", amountPerYear: round(input.otherAcademicFees * fx) },
    {
      category: "housing",
      label: "Housing",
      amountPerYear: round(housing),
      note: input.roommateCount > 0 ? `Split with ${input.roommateCount} roommate${input.roommateCount > 1 ? "s" : ""}` : undefined,
    },
    { category: "food", label: "Food", amountPerYear: round(food) },
    { category: "transport", label: "Transport", amountPerYear: round(transport) },
    { category: "insurance", label: "Insurance", amountPerYear: round(insurance) },
    { category: "books", label: "Books and materials", amountPerYear: round(books) },
    { category: "personal", label: "Personal spending", amountPerYear: round(personal) },
    { category: "visa", label: "Visa and residence fees", amountPerYear: round(visa) },
    { category: "flights", label: "Flights", amountPerYear: round(flights) },
    {
      category: "emergency",
      label: "Emergency reserve",
      amountPerYear: round(emergency),
      note: `${input.emergencyBufferMonths} months of living costs`,
    },
  ];

  const annualCost = costLines.reduce((sum, line) => sum + line.amountPerYear, 0);

  // Work income is modelled, labelled and kept out of guaranteed funding.
  const workRate =
    input.workAssumption === "PERMITTED_MAX" ? 1 : input.workAssumption === "CONSERVATIVE" ? 0.5 : 0;
  const workIncome =
    workRate * input.work.permittedHoursPerWeek * input.work.hourlyWage * input.work.weeksPerYear * fx;

  const fundingLines: FundingLine[] = [
    {
      key: "family",
      label: "Family budget",
      amountPerYear: round(input.funding.annualFamilyBudget),
      guaranteed: true,
    },
    {
      key: "savings",
      label: "Savings drawn down",
      amountPerYear: round(input.funding.savings / Math.max(1, input.durationYears)),
      guaranteed: true,
      note: "Spread evenly across the degree",
    },
    {
      key: "support",
      label: "Other expected support",
      amountPerYear: round(input.funding.expectedSupport),
      guaranteed: true,
    },
    {
      key: "scholarship",
      label: "Scholarship",
      amountPerYear: round(scholarshipOnTuition + input.scholarshipStipendPerYear * fx),
      guaranteed: false,
      note: "Counts only once an award is confirmed",
    },
    {
      key: "work",
      label: "Part-time work (estimate)",
      amountPerYear: round(workIncome),
      guaranteed: false,
      note:
        input.workAssumption === "NONE"
          ? "Not assumed in this scenario"
          : `Modelled at ${workRate * input.work.permittedHoursPerWeek} hrs/week for ${input.work.weeksPerYear} weeks — never guaranteed`,
    },
  ];

  const annualFundingGuaranteed = fundingLines
    .filter((line) => line.guaranteed || line.key === "scholarship")
    .reduce((sum, line) => sum + line.amountPerYear, 0);
  const annualFundingWithWork = annualFundingGuaranteed + workIncome;

  return {
    currency: input.currency,
    costLines,
    fundingLines,
    annualCost: round(annualCost),
    monthlyCost: round(annualCost / 12),
    totalDegreeCost: round(annualCost * input.durationYears),
    annualFundingGuaranteed: round(annualFundingGuaranteed),
    annualFundingWithWork: round(annualFundingWithWork),
    annualGap: round(annualCost - annualFundingGuaranteed),
    annualGapWithWork: round(annualCost - annualFundingWithWork),
    totalGap: round((annualCost - annualFundingGuaranteed) * input.durationYears),
    workIncome: round(workIncome),
    breakdown: {
      tuitionAndFees: round(
        costLines
          .filter((l) => ["tuition", "admission", "academic_fees"].includes(l.category))
          .reduce((sum, l) => sum + l.amountPerYear, 0),
      ),
      living: round(
        costLines
          .filter((l) => ["housing", "food", "transport", "insurance", "books", "personal"].includes(l.category))
          .reduce((sum, l) => sum + l.amountPerYear, 0),
      ),
      oneOff: round(
        costLines
          .filter((l) => ["visa", "flights", "emergency"].includes(l.category))
          .reduce((sum, l) => sum + l.amountPerYear, 0),
      ),
    },
  };
}

/** Annual money a student can actually commit, used by the decision engine. */
export function annualFundingCapacity(profile: {
  annualFamilyBudget?: number | null;
  availableSavings?: number | null;
  expectedSupport?: number | null;
}, durationYears = 4): number {
  return (
    (profile.annualFamilyBudget ?? 0) +
    (profile.expectedSupport ?? 0) +
    (profile.availableSavings ?? 0) / Math.max(1, durationYears)
  );
}

export const WHAT_IF_PRESETS: { id: string; label: string; apply: (input: ScenarioInput) => ScenarioInput }[] = [
  {
    id: "rent-up",
    label: "Rent increases 15%",
    apply: (input) => ({ ...input, rentMultiplier: input.rentMultiplier * 1.15 }),
  },
  {
    id: "scholarship-30",
    label: "I receive a 30% scholarship",
    apply: (input) => ({ ...input, scholarshipPercent: Math.max(input.scholarshipPercent, 30) }),
  },
  {
    id: "fx-up",
    label: "Exchange rate moves 10% against me",
    apply: (input) => ({ ...input, fxMultiplier: input.fxMultiplier * 1.1 }),
  },
  {
    id: "no-work",
    label: "I can't find part-time work",
    apply: (input) => ({ ...input, workAssumption: "NONE" }),
  },
  {
    id: "tuition-up",
    label: "Tuition rises 8%",
    apply: (input) => ({ ...input, tuitionMultiplier: input.tuitionMultiplier * 1.08 }),
  },
  {
    id: "roommate",
    label: "I live with one roommate",
    apply: (input) => ({ ...input, roommateCount: Math.max(1, input.roommateCount) }),
  },
];
