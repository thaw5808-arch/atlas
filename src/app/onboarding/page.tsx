import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/onboarding");

  const [countries, majors, profile] = await Promise.all([
    prisma.country.findMany({ orderBy: { name: "asc" }, select: { code: true, name: true } }),
    prisma.major.findMany({ orderBy: { name: "asc" }, include: { field: true } }),
    prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: { languageQualifications: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl py-6">
      <OnboardingWizard
        countries={countries}
        majors={majors.map((major) => ({ id: major.id, name: major.name, field: major.field.name }))}
        initial={{
          currentCountryCode: profile?.currentCountryCode ?? null,
          nationalityCode: profile?.nationalityCode ?? null,
          currentEducationLevel: profile?.currentEducationLevel ?? null,
          currentInstitution: profile?.currentInstitution ?? null,
          desiredDegree: profile?.desiredDegree ?? null,
          desiredMajorId: profile?.desiredMajorId ?? null,
          preferredCountries: profile?.preferredCountries ?? [],
          preferredIntake: profile?.preferredIntake ?? null,
          preferredEnvironment: profile?.preferredEnvironment ?? "NO_PREFERENCE",
          gpa: profile?.gpa ?? null,
          gpaScale: profile?.gpaScale ?? 4,
          budgetCurrency: profile?.budgetCurrency ?? "USD",
          annualFamilyBudget: profile?.annualFamilyBudget ?? null,
          availableSavings: profile?.availableSavings ?? null,
          expectedSupport: profile?.expectedSupport ?? null,
          maxTuitionPerYear: profile?.maxTuitionPerYear ?? null,
          maxLivingCostPerYear: profile?.maxLivingCostPerYear ?? null,
          scholarshipRequired: profile?.scholarshipRequired ?? false,
          minScholarshipPercent: profile?.minScholarshipPercent ?? null,
          willingToWorkPartTime: profile?.willingToWorkPartTime ?? false,
          careerGoal: profile?.careerGoal ?? null,
          languages:
            profile?.languageQualifications.map((q) => ({
              test: q.test,
              score: q.score,
              band: q.band,
            })) ?? [],
        }}
      />
    </div>
  );
}
