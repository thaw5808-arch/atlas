import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getStudentContext, getRateTable } from "@/lib/recommendations";
import { convert, formatMoney } from "@/lib/money";
import { formatDate, titleCase } from "@/lib/format";
import { coverageSummary, matchScholarship, type ScholarshipInput } from "@/lib/scholarships";
import { DataNotice, EmptyState, SectionHeading, VerificationBadge } from "@/components/ui";

const STATE_ORDER = { ELIGIBLE: 0, POSSIBLE: 1, NOT_ELIGIBLE: 2 } as const;
const STATE_LABEL = {
  ELIGIBLE: "Eligible",
  POSSIBLE: "Possibly eligible",
  NOT_ELIGIBLE: "Not currently eligible",
} as const;
const STATE_COLOR = {
  ELIGIBLE: "var(--color-viridian)",
  POSSIBLE: "var(--color-brass)",
  NOT_ELIGIBLE: "var(--color-rust)",
} as const;

export default async function ScholarshipsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; degree?: string; state?: string }>;
}) {
  const filters = await searchParams;
  const user = await getCurrentUser();
  const context = await getStudentContext(user?.id);
  const rates = await getRateTable();

  const scholarships = await prisma.scholarship.findMany({
    where: {
      ...(filters.country ? { countryCode: filters.country } : {}),
      ...(filters.degree ? { degreeLevels: { has: filters.degree as never } } : {}),
    },
    include: {
      requirements: true,
      university: { include: { tuitionRecords: true } },
      country: true,
      major: true,
      dataSource: true,
    },
    orderBy: { name: "asc" },
  });

  const countries = await prisma.country.findMany({ orderBy: { name: "asc" }, select: { code: true, name: true } });

  const matched = scholarships
    .map((scholarship) => {
      const input: ScholarshipInput = {
        id: scholarship.id,
        name: scholarship.name,
        tuitionPercent: scholarship.tuitionPercent,
        livingStipendPerYear: scholarship.livingStipendPerYear,
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
      const match = matchScholarship(
        input,
        { ...context.student, nationalityCode: context.nationalityCode, degreeLevel: context.degreeLevel },
        0,
      );

      const tuitionRecord =
        scholarship.university?.tuitionRecords.find((record) => record.programId === null) ??
        scholarship.university?.tuitionRecords[0];
      const tuitionShare =
        tuitionRecord && scholarship.tuitionPercent > 0
          ? convert(tuitionRecord.tuitionPerYear, tuitionRecord.currency, context.currency, rates) *
            (scholarship.tuitionPercent / 100)
          : null;

      return { scholarship, input, match, tuitionShare };
    })
    .filter((entry) => !filters.state || entry.match.state === filters.state)
    .sort((a, b) => STATE_ORDER[a.match.state] - STATE_ORDER[b.match.state]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl">Scholarships</h1>
        <p className="mt-2 max-w-prose text-sm text-slate">
          Every award is checked against the details on your profile, and each check tells you which
          criterion decided the answer.
        </p>
      </header>

      <div className="glass flex flex-wrap items-center gap-2 rounded-[22px] p-4">
        <Link
          href="/scholarships"
          aria-current={!filters.state ? "true" : undefined}
          className={!filters.state ? "chip chip-selected" : "chip"}
        >
          All
        </Link>
        {(Object.keys(STATE_LABEL) as (keyof typeof STATE_LABEL)[]).map((state) => (
          <Link
            key={state}
            href={`/scholarships?state=${state}`}
            aria-current={filters.state === state ? "true" : undefined}
            className={filters.state === state ? "chip chip-selected" : "chip"}
          >
            {STATE_LABEL[state]}
          </Link>
        ))}
        <span className="mx-1 h-5 w-px bg-line" />
        {countries.map((country) => (
          <Link
            key={country.code}
            href={`/scholarships?country=${country.code}`}
            aria-current={filters.country === country.code ? "true" : undefined}
            className={filters.country === country.code ? "chip chip-selected" : "chip"}
          >
            {country.name}
          </Link>
        ))}
      </div>

      {matched.length === 0 ? (
        <EmptyState title="No awards match those filters" body="Try clearing the filter or widening the country." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {matched.map(({ scholarship, input, match, tuitionShare }) => (
            <article key={scholarship.id} id={scholarship.id} className="panel p-5 scroll-mt-24">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base leading-snug">{scholarship.name}</h2>
                  <p className="mt-1 text-xs text-slate">
                    {titleCase(scholarship.provider)}
                    {scholarship.university ? ` · ${scholarship.university.name}` : ""}
                    {scholarship.country ? ` · ${scholarship.country.name}` : ""}
                  </p>
                </div>
                <span className="chip" style={{ color: STATE_COLOR[match.state] }}>
                  {STATE_LABEL[match.state]}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate">{scholarship.summary}</p>

              <p className="mt-3 text-sm">
                {coverageSummary(input)}
                {scholarship.tuitionPercent > 0 && tuitionShare != null && (
                  <span className="tabular text-slate">
                    {" "}
                    (≈ {formatMoney(tuitionShare, context.currency)} per year)
                  </span>
                )}
                {scholarship.livingStipendPerYear > 0 && (
                  <span className="tabular text-slate">
                    {" "}
                    ·{" "}
                    {formatMoney(
                      convert(scholarship.livingStipendPerYear, scholarship.currency, context.currency, rates),
                      context.currency,
                    )}{" "}
                    per year
                  </span>
                )}
              </p>

              <ul className="mt-4 space-y-1.5">
                {match.checks.map((check, index) => (
                  <li key={index} className="flex gap-2 text-xs">
                    <span
                      className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background:
                          check.state === "met"
                            ? "var(--color-viridian)"
                            : check.state === "unmet"
                              ? "var(--color-rust)"
                              : "var(--color-mist)",
                      }}
                    />
                    <span className="text-slate">
                      {check.description} — {check.detail}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-mist">
                  {scholarship.deadline ? `Closes ${formatDate(scholarship.deadline)}` : "Deadline not published"}
                </span>
                <VerificationBadge status={scholarship.verification} lastVerifiedAt={scholarship.lastVerifiedAt} />
              </div>
            </article>
          ))}
        </div>
      )}

      <DataNotice>
        Eligibility shown here reflects only the criteria recorded in ATLAS. Awarding decisions
        always rest with the provider, and most awards weigh things no database captures.
      </DataNotice>
    </div>
  );
}
