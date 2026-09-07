import { Suspense } from "react";
import Link from "next/link";
import { ComparePicker } from "@/components/compare-picker";
import { EmptyState, FitRing, SectionHeading } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { buildCandidates, getStudentContext, type Candidate } from "@/lib/recommendations";
import { formatMoney } from "@/lib/money";
import { titleCase } from "@/lib/format";

type Row = {
  label: string;
  value: (candidate: Candidate) => string;
  best?: (candidates: Candidate[]) => string | null;
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const user = await getCurrentUser();
  const context = await getStudentContext(user?.id);

  const universities = await prisma.university.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true, country: { select: { name: true } } },
  });

  const slugs = ids?.split(",").filter(Boolean) ?? [];
  const candidates = slugs.length ? await buildCandidates(context, { slugs }) : [];
  const currency = context.currency;

  const lowestCost = candidates.length
    ? candidates.reduce((best, c) => (c.input.annualCost.total < best.input.annualCost.total ? c : best))
    : null;
  const bestAcademic = candidates.length
    ? candidates.reduce((best, c) =>
        c.score.dimensions.academic.score > best.score.dimensions.academic.score ? c : best,
      )
    : null;
  const bestFinancial = candidates.length
    ? candidates.reduce((best, c) =>
        c.score.dimensions.financial.score > best.score.dimensions.financial.score ? c : best,
      )
    : null;
  const bestOverall = candidates.length
    ? candidates.reduce((best, c) => (c.score.overall > best.score.overall ? c : best))
    : null;

  const rows: Row[] = [
    { label: "Country", value: (c) => `${c.cityName}, ${c.input.countryName}` },
    { label: "Type", value: (c) => titleCase(c.universityType) },
    { label: "Program", value: (c) => c.input.program.name },
    { label: "Taught in", value: (c) => c.input.program.languageOfInstruction },
    { label: "Duration", value: (c) => `${c.durationYears} years` },
    { label: "Tuition per year", value: (c) => formatMoney(c.input.annualCost.tuition, currency) },
    { label: "Living costs per year", value: (c) => formatMoney(c.input.annualCost.living, currency) },
    { label: "Total per year", value: (c) => formatMoney(c.input.annualCost.total, currency) },
    {
      label: "Total degree cost",
      value: (c) => formatMoney(c.input.annualCost.total * c.durationYears, currency),
    },
    {
      label: "Minimum GPA",
      value: (c) =>
        c.input.requirement?.minGpa
          ? `${c.input.requirement.minGpa} / ${c.input.requirement.gpaScale ?? 4}`
          : "Not published",
    },
    {
      label: "Language requirement",
      value: (c) =>
        c.input.languageRequirements.length === 0
          ? "Not recorded"
          : c.input.languageRequirements
              .map((r) => `${r.test.replace("_", " ")} ${r.minScore ?? r.minBand ?? ""}`)
              .join(", "),
    },
    {
      label: "Scholarships you qualify for",
      value: (c) => `${c.input.scholarships.filter((s) => s.eligibility === "ELIGIBLE").length} of ${c.scholarshipCount}`,
    },
    { label: "Work rules", value: (c) => (c.input.partTimeFriendly ? `Up to ~${c.input.workHoursPerWeek ?? "?"} hrs/week` : "Limited or not recorded") },
    { label: "Decision score", value: (c) => `${c.score.overall}%` },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl">Compare</h1>
        <p className="mt-2 max-w-prose text-sm text-slate">
          Side by side on the figures that decide it. There is no overall winner here — the
          highlights below are relative to your profile.
        </p>
      </header>

      <Suspense fallback={<div className="glass h-24 rounded-[22px]" />}>
        <ComparePicker
          universities={universities.map((university) => ({
            slug: university.slug,
            name: university.name,
            countryName: university.country.name,
          }))}
        />
      </Suspense>

      {candidates.length < 2 ? (
        <EmptyState
          title="Choose at least two universities"
          body="Pick from the list above, or open a university profile and press Compare."
          action={
            <Link href="/universities" className="btn btn-sm">
              Browse universities
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Best overall match", bestOverall],
              ["Best financial fit", bestFinancial],
              ["Lowest total cost", lowestCost],
              ["Best academic match", bestAcademic],
            ].map(([label, candidate]) => (
              <div key={label as string} className="panel p-4">
                <p className="text-xs text-slate">{label as string}</p>
                <p className="mt-1 text-sm">{(candidate as Candidate)?.input.universityName ?? "—"}</p>
              </div>
            ))}
          </div>

          <div className="panel hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="w-48 px-5 py-4 text-left text-xs font-medium text-slate">Field</th>
                  {candidates.map((candidate) => (
                    <th key={candidate.slug} scope="col" className="px-4 py-4 text-left align-bottom">
                      <FitRing score={candidate.score.overall} size={44} />
                      <Link href={`/universities/${candidate.slug}`} className="mt-2 block text-sm font-medium hover:underline">
                        {candidate.input.universityName}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-line last:border-0">
                    <th scope="row" className="px-5 py-3 text-left text-xs font-medium text-slate">{row.label}</th>
                    {candidates.map((candidate) => (
                      <td key={candidate.slug} className="px-4 py-3">
                        {row.value(candidate)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* On small screens the same data becomes one block per university. */}
          <div className="space-y-4 md:hidden">
            {candidates.map((candidate) => (
              <div key={candidate.slug} className="panel p-4">
                <div className="flex items-center gap-3">
                  <FitRing score={candidate.score.overall} size={48} />
                  <Link href={`/universities/${candidate.slug}`} className="text-base hover:underline">
                    {candidate.input.universityName}
                  </Link>
                </div>
                <dl className="mt-3 divide-y divide-[color:var(--color-line)]">
                  {rows.map((row) => (
                    <div key={row.label} className="flex justify-between gap-4 py-2 text-sm">
                      <dt className="text-slate">{row.label}</dt>
                      <dd className="text-right">{row.value(candidate)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
