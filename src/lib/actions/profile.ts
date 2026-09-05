"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "../db";
import { requireUser } from "../session";

const importance = z.enum(["LOW", "MEDIUM", "HIGH", "VERY_HIGH"]);

const onboardingSchema = z.object({
  currentCountryCode: z.string().length(2).nullable().optional(),
  nationalityCode: z.string().length(2).nullable().optional(),
  currentEducationLevel: z
    .enum(["HIGH_SCHOOL", "FOUNDATION", "DIPLOMA", "BACHELOR", "MASTER", "DOCTORATE"])
    .nullable()
    .optional(),
  currentInstitution: z.string().max(160).nullable().optional(),
  desiredDegree: z
    .enum(["FOUNDATION", "DIPLOMA", "BACHELOR", "MASTER", "DOCTORATE"])
    .nullable()
    .optional(),
  desiredMajorId: z.string().nullable().optional(),
  preferredCountries: z.array(z.string().length(2)).max(20).default([]),
  preferredIntake: z.enum(["SPRING", "SUMMER", "AUTUMN", "WINTER", "ROLLING"]).nullable().optional(),
  preferredEnvironment: z
    .enum(["MAJOR_METRO", "MID_SIZED_CITY", "UNIVERSITY_TOWN", "NO_PREFERENCE"])
    .default("NO_PREFERENCE"),
  gpa: z.number().min(0).max(100).nullable().optional(),
  gpaScale: z.number().min(1).max(100).nullable().optional(),
  languages: z
    .array(
      z.object({
        test: z.enum(["IELTS", "TOEFL_IBT", "DUOLINGO", "JLPT", "TOPIK", "DELF", "TESTDAF", "OTHER"]),
        score: z.number().min(0).max(200).nullable().optional(),
        band: z.string().max(8).nullable().optional(),
      }),
    )
    .max(8)
    .default([]),
  budgetCurrency: z.string().length(3).default("USD"),
  annualFamilyBudget: z.number().min(0).nullable().optional(),
  availableSavings: z.number().min(0).nullable().optional(),
  expectedSupport: z.number().min(0).nullable().optional(),
  maxTuitionPerYear: z.number().min(0).nullable().optional(),
  maxLivingCostPerYear: z.number().min(0).nullable().optional(),
  scholarshipRequired: z.boolean().default(false),
  minScholarshipPercent: z.number().min(0).max(100).nullable().optional(),
  willingToWorkPartTime: z.boolean().default(false),
  careerGoal: z.string().max(400).nullable().optional(),
  weights: z
    .object({
      financial: importance,
      academic: importance,
      language: importance,
      location: importance,
      scholarship: importance,
      career: importance,
      ranking: importance,
    })
    .optional(),
});

export type OnboardingPayload = z.input<typeof onboardingSchema>;

export async function saveOnboarding(payload: OnboardingPayload): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { languages, weights, ...profile } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const saved = await tx.studentProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...profile, completedOnboarding: true, onboardingStep: 6 },
      update: { ...profile, completedOnboarding: true, onboardingStep: 6 },
    });

    await tx.languageQualification.deleteMany({ where: { profileId: saved.id } });
    if (languages.length > 0) {
      await tx.languageQualification.createMany({
        data: languages.map((language) => ({
          profileId: saved.id,
          test: language.test,
          score: language.score ?? null,
          band: language.band ?? null,
        })),
      });
    }

    if (weights) {
      await tx.decisionPreference.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          costImportance: weights.financial,
          academicImportance: weights.academic,
          languageImportance: weights.language,
          locationImportance: weights.location,
          scholarshipImportance: weights.scholarship,
          careerImportance: weights.career,
          rankingImportance: weights.ranking,
        },
        update: {
          costImportance: weights.financial,
          academicImportance: weights.academic,
          languageImportance: weights.language,
          locationImportance: weights.location,
          scholarshipImportance: weights.scholarship,
          careerImportance: weights.career,
          rankingImportance: weights.ranking,
        },
      });
    }

    await tx.user.update({
      where: { id: user.id },
      data: { preferredCurrency: profile.budgetCurrency },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/universities");
  return {};
}

export async function saveWeights(weights: {
  financial: string;
  academic: string;
  language: string;
  location: string;
  scholarship: string;
  career: string;
  ranking: string;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = z
    .object({
      financial: importance,
      academic: importance,
      language: importance,
      location: importance,
      scholarship: importance,
      career: importance,
      ranking: importance,
    })
    .safeParse(weights);
  if (!parsed.success) return { error: "Those priorities aren't valid" };

  await prisma.decisionPreference.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      costImportance: parsed.data.financial,
      academicImportance: parsed.data.academic,
      languageImportance: parsed.data.language,
      locationImportance: parsed.data.location,
      scholarshipImportance: parsed.data.scholarship,
      careerImportance: parsed.data.career,
      rankingImportance: parsed.data.ranking,
    },
    update: {
      costImportance: parsed.data.financial,
      academicImportance: parsed.data.academic,
      languageImportance: parsed.data.language,
      locationImportance: parsed.data.location,
      scholarshipImportance: parsed.data.scholarship,
      careerImportance: parsed.data.career,
      rankingImportance: parsed.data.ranking,
    },
  });

  revalidatePath("/universities");
  revalidatePath("/dashboard");
  return {};
}

export async function setPreferredCurrency(currency: string): Promise<void> {
  const user = await requireUser();
  if (!/^[A-Z]{3}$/.test(currency)) return;
  await prisma.user.update({ where: { id: user.id }, data: { preferredCurrency: currency } });
  revalidatePath("/", "layout");
}
