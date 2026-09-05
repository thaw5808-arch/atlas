import { CountryExplorer, type CountryEntry } from "@/components/country-explorer";
import { DataNotice } from "@/components/ui";
import { prisma } from "@/lib/db";

export default async function CountriesPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const countries = await prisma.country.findMany({
    orderBy: { name: "asc" },
    include: { cities: true, _count: { select: { universities: true } } },
  });

  const entries: CountryEntry[] = countries.map((country) => ({
    code: country.code,
    name: country.name,
    region: country.region,
    currency: country.currency,
    languages: country.languages,
    visaOverview: country.visaOverview,
    workRuleSummary: country.workRuleSummary,
    workHoursPerWeek: country.workHoursPerWeek,
    academicCalendar: country.academicCalendar,
    housingNotes: country.housingNotes,
    insuranceNotes: country.insuranceNotes,
    transportNotes: country.transportNotes,
    typicalTuitionMin: country.typicalTuitionMin,
    typicalTuitionMax: country.typicalTuitionMax,
    typicalLivingMin: country.typicalLivingMin,
    typicalLivingMax: country.typicalLivingMax,
    latitude: country.latitude,
    longitude: country.longitude,
    universityCount: country._count.universities,
    cities: country.cities.map((city) => city.name),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl">Countries</h1>
        <p className="mt-2 max-w-prose text-sm text-slate">
          Cost ranges, visa and work rules, and the academic calendar for every country in the
          dataset. Select one to open its profile without leaving the map.
        </p>
      </header>

      <CountryExplorer countries={entries} initialCode={code} />

      <DataNotice>
        Visa and work rules change often and vary by nationality. Treat these summaries as a starting
        point and check the relevant immigration authority before making plans.
      </DataNotice>
    </div>
  );
}
