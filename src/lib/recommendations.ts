import "server-only";
import { prisma } from "./db";
import { convert, type RateTable } from "./money";
import { annualFundingCapacity } from "./costs";
import {
  DEFAULT_WEIGHTS,
  scoreCandidate,
  type CandidateInput,
  type EnvironmentCode,
  type LanguageTestCode,
  type ScoreResult,
  type StudentInput,
  type Weights,
} from "./decision";
import { coveragePercentOfCost, matchScholarship, type ScholarshipInput } from "./scholarships";

export async function getRateTable(): Promise<RateTable> {
  const rows = await prisma.exchangeRate.findMany({ where: { baseCurrency: "USD" } });
  const rates: Record<string, number> = { USD: 1 };
  let fetchedAt = new Date(0);
  for (const row of rows) {
    rates[row.quoteCurrency] = row.rate;
    if (row.fetchedAt > fetchedAt) fetchedAt = row.fetchedAt;
  }
  return { rates, fetchedAt };
}

export type StudentContext = {
  student: StudentInput;
  currency: string;
  weights: Weights;
  nationalityCode?: string | null;
  degreeLevel?: string | null;
  profileComplete: boolean;
};

/** Falls back to a neutral browsing profile for signed-out visitors. */
export async function getStudentContext(userId?: string | null): Promise<StudentContext> {
  const empty: StudentContext = {
    currency: "USD",
    weights: DEFAULT_WEIGHTS,
    profileComplete: false,
    student: {
      preferredCountries: [],
      preferredEnvironment: "NO_PREFERENCE",
      annualFundingCapacity: 0,
      languages: [],
      scholarshipRequired: false,
      willingToWorkPartTime: false,
    },
  };
  if (!userId) return empty;

  const [profile, preference, user] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId },
      include: { languageQualifications: true, desiredMajor: { include: { field: true } } },
    }),
    prisma.decisionPreference.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { preferredCurrency: true } }),
  ]);
  if (!profile) return { ...empty, currency: user?.preferredCurrency ?? "USD" };

  const weights: Weights = preference
    ? {
        financial: preference.costImportance,
        academic: preference.academicImportance,
        language: preference.languageImportance,
        location: preference.locationImportance,
        scholarship: preference.scholarshipImportance,
        career: preference.careerImportance,
        ranking: preference.rankingImportance,
      }
    : DEFAULT_WEIGHTS;

  return {
    currency: user?.preferredCurrency ?? profile.budgetCurrency,
    weights,
    nationalityCode: profile.nationalityCode,
    degreeLevel: profile.desiredDegree,
    profileComplete: profile.completedOnboarding,
    student: {
      gpa: profile.gpa,
      gpaScale: profile.gpaScale,
      educationLevel: profile.currentEducationLevel,
      desiredMajorId: profile.desiredMajorId,
      desiredFieldName: profile.desiredMajor?.field.name ?? null,
      preferredCountries: profile.preferredCountries,
      preferredEnvironment: profile.preferredEnvironment as EnvironmentCode,
      annualFundingCapacity: annualFundingCapacity(profile),
      maxTuitionPerYear: profile.maxTuitionPerYear,
      maxLivingCostPerYear: profile.maxLivingCostPerYear,
      languages: profile.languageQualifications.map((q) => ({
        test: q.test as LanguageTestCode,
        score: q.score,
        band: q.band,
      })),
      scholarshipRequired: profile.scholarshipRequired,
      minScholarshipPercent: profile.minScholarshipPercent,
      willingToWorkPartTime: profile.willingToWorkPartTime,
      careerGoal: profile.careerGoal,
    },
  };
}

export type UniversityFilters = {
  query?: string;
  slugs?: string[];
  countryCodes?: string[];
  degreeLevel?: string;
  majorId?: string;
  maxTotalCost?: number;
  universityType?: string;
  language?: string;
  scholarshipsOnly?: boolean;
  housingOnly?: boolean;
  partTimeOnly?: boolean;
};

export type Candidate = {
  input: CandidateInput;
  score: ScoreResult;
  slug: string;
  cityName: string;
  campusImageUrl: string | null;
  universityType: string;
  scholarshipCount: number;
  lastVerifiedAt: Date | null;
  durationYears: number;
};

const HOUSING_PREFERENCE = ["SHARED_OFF_CAMPUS", "ON_CAMPUS", "PRIVATE_OFF_CAMPUS"] as const;

export async function buildCandidates(
  context: StudentContext,
  filters: UniversityFilters = {},
): Promise<Candidate[]> {
  const rates = await getRateTable();

  const universities = await prisma.university.findMany({
    where: {
      ...(filters.slugs?.length ? { slug: { in: filters.slugs } } : {}),
      ...(filters.countryCodes?.length ? { countryCode: { in: filters.countryCodes } } : {}),
      ...(filters.universityType ? { type: filters.universityType as never } : {}),
      ...(filters.housingOnly ? { housingAvailable: true } : {}),
      ...(filters.partTimeOnly ? { partTimeFriendly: true } : {}),
      ...(filters.query
        ? {
            OR: [
              { name: { contains: filters.query, mode: "insensitive" as const } },
              { city: { name: { contains: filters.query, mode: "insensitive" as const } } },
              { country: { name: { contains: filters.query, mode: "insensitive" as const } } },
            ],
          }
        : {}),
      programs: {
        some: {
          ...(filters.degreeLevel ? { degreeLevel: filters.degreeLevel as never } : {}),
          ...(filters.majorId ? { majorId: filters.majorId } : {}),
          ...(filters.language ? { languageOfInstruction: filters.language } : {}),
        },
      },
    },
    include: {
      country: true,
      city: true,
      programs: {
        include: {
          major: { include: { field: true } },
          admissionRequirement: true,
          languageRequirements: true,
          tuitionRecords: true,
        },
      },
      tuitionRecords: true,
      livingCostRecords: true,
      scholarships: { include: { requirements: true } },
    },
  });

  const candidates: Candidate[] = [];

  for (const university of universities) {
    const programs = university.programs.filter((program) => {
      if (filters.degreeLevel && program.degreeLevel !== filters.degreeLevel) return false;
      if (filters.majorId && program.majorId !== filters.majorId) return false;
      if (filters.language && program.languageOfInstruction !== filters.language) return false;
      return true;
    });
    if (programs.length === 0) continue;

    // Pick the program the student is most likely to care about.
    const program =
      programs.find((p) => p.majorId === context.student.desiredMajorId) ??
      programs.find((p) => p.degreeLevel === context.degreeLevel) ??
      programs[0];

    const living =
      HOUSING_PREFERENCE.map((type) =>
        university.livingCostRecords.find((record) => record.housingType === type),
      ).find(Boolean) ?? null;

    const tuitionRecord =
      university.tuitionRecords.find((record) => record.programId === program.id) ??
      university.tuitionRecords.find((record) => record.programId === null) ??
      university.tuitionRecords[0];
    if (!tuitionRecord || !living) continue;

    const toStudent = (amount: number, from: string) =>
      convert(amount, from, context.currency, rates);

    const tuition = toStudent(tuitionRecord.tuitionPerYear, tuitionRecord.currency);
    const fees = toStudent(
      tuitionRecord.otherAcademicFees + tuitionRecord.admissionFee / program.durationYears,
      tuitionRecord.currency,
    );
    const livingAnnual = toStudent(
      (living.housingPerMonth +
        living.foodPerMonth +
        living.transportPerMonth +
        living.insurancePerMonth +
        living.personalPerMonth) *
        12 +
        living.booksPerYear +
        living.visaFeesPerYear,
      living.currency,
    );
    const total = tuition + fees + livingAnnual;

    if (filters.maxTotalCost && total > filters.maxTotalCost) continue;
    if (filters.scholarshipsOnly && university.scholarships.length === 0) continue;

    const scholarships = university.scholarships.map((scholarship) => {
      const input: ScholarshipInput = {
        id: scholarship.id,
        name: scholarship.name,
        tuitionPercent: scholarship.tuitionPercent,
        livingStipendPerYear: toStudent(scholarship.livingStipendPerYear, scholarship.currency),
        housingCovered: scholarship.housingCovered,
        travelCovered: scholarship.travelCovered,
        insuranceCovered: scholarship.insuranceCovered,
        requirements: scholarship.requirements.map((requirement) => ({
          kind: requirement.kind,
          description: requirement.description,
          numericValue: requirement.numericValue,
          textValue: requirement.textValue,
          listValue: requirement.listValue,
          mandatory: requirement.mandatory,
        })),
      };
      const match = matchScholarship(input, {
        ...context.student,
        nationalityCode: context.nationalityCode,
        degreeLevel: context.degreeLevel,
      }, total);
      return {
        name: scholarship.name,
        eligibility: match.state,
        coveragePercent: coveragePercentOfCost(input, tuition, total),
      };
    });

    const input: CandidateInput = {
      universityId: university.id,
      universityName: university.name,
      countryCode: university.countryCode,
      countryName: university.country.name,
      cityEnvironment: university.city.environment as EnvironmentCode,
      globalRanking: university.globalRanking,
      partTimeFriendly: university.partTimeFriendly,
      workHoursPerWeek: university.country.workHoursPerWeek,
      program: {
        id: program.id,
        name: program.name,
        majorId: program.majorId,
        majorName: program.major.name,
        fieldName: program.major.field.name,
        languageOfInstruction: program.languageOfInstruction,
        durationYears: program.durationYears,
      },
      requirement: program.admissionRequirement
        ? {
            minGpa: program.admissionRequirement.minGpa,
            gpaScale: program.admissionRequirement.gpaScale,
            minEducationLevel: program.admissionRequirement.minEducationLevel,
            interviewRequired: program.admissionRequirement.interviewRequired,
            portfolioRequired: program.admissionRequirement.portfolioRequired,
          }
        : null,
      languageRequirements: program.languageRequirements.map((requirement) => ({
        test: requirement.test as LanguageTestCode,
        minScore: requirement.minScore,
        minBand: requirement.minBand,
        waivable: requirement.waivable,
      })),
      annualCost: { tuition, fees, living: livingAnnual, total },
      scholarships,
    };

    candidates.push({
      input,
      score: scoreCandidate(context.student, input, context.weights),
      slug: university.slug,
      cityName: university.city.name,
      campusImageUrl: university.campusImageUrl,
      universityType: university.type,
      scholarshipCount: university.scholarships.length,
      lastVerifiedAt: tuitionRecord.lastVerifiedAt,
      durationYears: program.durationYears,
    });
  }

  return candidates.sort((a, b) => b.score.overall - a.score.overall);
}

export type SortKey =
  | "best_match"
  | "lowest_total_cost"
  | "lowest_tuition"
  | "scholarship"
  | "academic"
  | "budget";

export function sortCandidates(candidates: Candidate[], key: SortKey): Candidate[] {
  const copy = [...candidates];
  switch (key) {
    case "lowest_total_cost":
      return copy.sort((a, b) => a.input.annualCost.total - b.input.annualCost.total);
    case "lowest_tuition":
      return copy.sort((a, b) => a.input.annualCost.tuition - b.input.annualCost.tuition);
    case "scholarship":
      return copy.sort((a, b) => b.score.dimensions.scholarship.score - a.score.dimensions.scholarship.score);
    case "academic":
      return copy.sort((a, b) => b.score.dimensions.academic.score - a.score.dimensions.academic.score);
    case "budget":
      return copy.sort((a, b) => b.score.dimensions.financial.score - a.score.dimensions.financial.score);
    default:
      return copy.sort((a, b) => b.score.overall - a.score.overall);
  }
}

export type ScenarioOption = {
  universityId: string;
  slug: string;
  name: string;
  countryName: string;
  cityName: string;
  currency: string;
  durationYears: number;
  programId: string;
  programName: string;
  tuitionPerYear: number;
  admissionFee: number;
  otherAcademicFees: number;
  housing: Record<
    "ON_CAMPUS" | "SHARED_OFF_CAMPUS" | "PRIVATE_OFF_CAMPUS",
    {
      housingPerMonth: number;
      foodPerMonth: number;
      transportPerMonth: number;
      insurancePerMonth: number;
      personalPerMonth: number;
      booksPerYear: number;
      visaFeesPerYear: number;
    } | null
  >;
  work: { permittedHoursPerWeek: number; hourlyWage: number; weeksPerYear: number };
  scholarships: { id: string; name: string; tuitionPercent: number; stipend: number }[];
};

/** Everything the Decision Lab needs, already converted into the student's currency. */
export async function buildScenarioOptions(context: StudentContext): Promise<ScenarioOption[]> {
  const rates = await getRateTable();
  const universities = await prisma.university.findMany({
    include: {
      country: true,
      city: true,
      programs: { orderBy: { name: "asc" } },
      tuitionRecords: true,
      livingCostRecords: true,
      scholarships: true,
    },
    orderBy: { name: "asc" },
  });

  const options: ScenarioOption[] = [];

  for (const university of universities) {
    const program = university.programs[0];
    const tuition =
      university.tuitionRecords.find((record) => record.programId === program?.id) ??
      university.tuitionRecords[0];
    if (!program || !tuition) continue;

    const to = (amount: number, from: string) => convert(amount, from, context.currency, rates);

    const housing = {
      ON_CAMPUS: null,
      SHARED_OFF_CAMPUS: null,
      PRIVATE_OFF_CAMPUS: null,
    } as ScenarioOption["housing"];

    for (const record of university.livingCostRecords) {
      housing[record.housingType] = {
        housingPerMonth: to(record.housingPerMonth, record.currency),
        foodPerMonth: to(record.foodPerMonth, record.currency),
        transportPerMonth: to(record.transportPerMonth, record.currency),
        insurancePerMonth: to(record.insurancePerMonth, record.currency),
        personalPerMonth: to(record.personalPerMonth, record.currency),
        booksPerYear: to(record.booksPerYear, record.currency),
        visaFeesPerYear: to(record.visaFeesPerYear, record.currency),
      };
    }

    options.push({
      universityId: university.id,
      slug: university.slug,
      name: university.name,
      countryName: university.country.name,
      cityName: university.city.name,
      currency: context.currency,
      durationYears: program.durationYears,
      programId: program.id,
      programName: program.name,
      tuitionPerYear: to(tuition.tuitionPerYear, tuition.currency),
      admissionFee: to(tuition.admissionFee, tuition.currency),
      otherAcademicFees: to(tuition.otherAcademicFees, tuition.currency),
      housing,
      work: {
        permittedHoursPerWeek: university.country.workHoursPerWeek ?? 0,
        hourlyWage: to(university.country.typicalStudentWage ?? 0, university.country.currency),
        weeksPerYear: university.country.workWeeksPerYear ?? 40,
      },
      scholarships: university.scholarships.map((scholarship) => ({
        id: scholarship.id,
        name: scholarship.name,
        tuitionPercent: scholarship.tuitionPercent,
        stipend: to(scholarship.livingStipendPerYear, scholarship.currency),
      })),
    });
  }

  return options;
}
