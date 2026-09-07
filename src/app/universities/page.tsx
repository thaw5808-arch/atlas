import { Suspense } from "react";
import { UniversityFilters } from "@/components/university-filters";
import { UniversityCard } from "@/components/university-card";
import { DataNotice, EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { buildCandidates, getStudentContext, sortCandidates, type SortKey } from "@/lib/recommendations";

export default async function UniversitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const context = await getStudentContext(user?.id);

  const [countries, majors, languageRows] = await Promise.all([
    prisma.country.findMany({ orderBy: { name: "asc" }, select: { code: true, name: true } }),
    prisma.major.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.program.findMany({ distinct: ["languageOfInstruction"], select: { languageOfInstruction: true } }),
  ]);

  const candidates = await buildCandidates(context, {
    query: params.q,
    countryCodes: params.countries?.split(",").filter(Boolean),
    degreeLevel: params.degree,
    majorId: params.major,
    language: params.language,
    universityType: params.type,
    maxTotalCost: params.maxCost ? Number(params.maxCost) : undefined,
    scholarshipsOnly: params.scholarships === "1",
    housingOnly: params.housing === "1",
    partTimeOnly: params.partTime === "1",
  });

  const sorted = sortCandidates(candidates, (params.sort as SortKey) ?? "best_match");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl">Universities</h1>
        <p className="mt-2 max-w-prose text-sm text-slate">
          {context.profileComplete
            ? "Scored against your profile, budget and language results."
            : "Scored with a neutral profile. Complete onboarding to see figures against your own budget."}
        </p>
      </header>

      <Suspense fallback={<div className="glass h-20 rounded-[22px]" />}>
        <UniversityFilters
          countries={countries}
          majors={majors}
          languages={languageRows.map((row) => row.languageOfInstruction)}
          currency={context.currency}
        />
      </Suspense>

      {/* Visually hidden: the count line above already reads as the section's intro, but the
          cards below render an h3 each, so a heading has to sit between it and the page's h1
          or those h3s skip a level. */}
      <h2 className="sr-only">Search results</h2>
      <p className="text-sm text-slate">
        <span className="tabular font-medium text-ink">{sorted.length}</span> programs match these
        filters
      </p>

      {sorted.length === 0 ? (
        <EmptyState
          title="Nothing matches those filters yet"
          body="Widen the cost ceiling or clear a filter to see more options."
        />
      ) : (
        <div className="space-y-4">
          {sorted.map((candidate) => (
            <UniversityCard
              key={`${candidate.input.universityId}-${candidate.input.program.id}`}
              candidate={candidate}
              currency={context.currency}
            />
          ))}
        </div>
      )}

      <DataNotice>
        Costs are converted estimates that move with exchange rates. Always confirm tuition and
        requirements against the university's own admissions page before applying.
      </DataNotice>
    </div>
  );
}
