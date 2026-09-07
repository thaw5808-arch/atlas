import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  CalendarDays,
  ExternalLink,
  Home,
  Mail,
  MapPin,
  Rows3,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { buildCandidates, getStudentContext, getRateTable } from "@/lib/recommendations";
import { convert, formatMoney } from "@/lib/money";
import { formatDate, titleCase } from "@/lib/format";
import { coverageSummary, matchScholarship, coveragePercentOfCost } from "@/lib/scholarships";
import { DimensionBars, FitRing, MatchBadge, SectionHeading, VerificationBadge, DataNotice } from "@/components/ui";
import { SaveActions } from "@/components/save-actions";

const HOUSING_LABEL: Record<string, string> = {
  ON_CAMPUS: "University housing",
  SHARED_OFF_CAMPUS: "Shared flat",
  PRIVATE_OFF_CAMPUS: "Private rental",
};

export default async function UniversityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const context = await getStudentContext(user?.id);
  const rates = await getRateTable();

  const university = await prisma.university.findUnique({
    where: { slug },
    include: {
      country: true,
      city: true,
      programs: {
        include: {
          major: { include: { field: true } },
          admissionRequirement: { include: { dataSource: true } },
          languageRequirements: { include: { dataSource: true } },
        },
        orderBy: { name: "asc" },
      },
      tuitionRecords: { include: { dataSource: true } },
      livingCostRecords: { include: { dataSource: true } },
      scholarships: { include: { requirements: true, dataSource: true } },
    },
  });
  if (!university) notFound();

  const [candidate] = await buildCandidates(context, { slugs: [slug] });

  const [saved, planned] = user
    ? await Promise.all([
        prisma.savedUniversity.findUnique({
          where: { userId_universityId: { userId: user.id, universityId: university.id } },
        }),
        prisma.application.findFirst({ where: { userId: user.id, universityId: university.id } }),
      ])
    : [null, null];

  const money = (amount: number, from: string) =>
    formatMoney(convert(amount, from, context.currency, rates), context.currency);

  return (
    <div className="space-y-10">
      <header className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate">
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} /> {university.city.name}, {university.country.name}
            </span>
            <span className="inline-flex items-center gap-1">
              <Building2 size={13} /> {titleCase(university.type)}
            </span>
            {university.studentCount && (
              <span className="inline-flex items-center gap-1">
                <Users size={13} /> {university.studentCount.toLocaleString()} students
              </span>
            )}
            {university.globalRanking && <span>World rank ~{university.globalRanking}</span>}
          </p>

          <h1 className="mt-2 text-4xl leading-tight">{university.name}</h1>
          {university.localName && <p className="mt-1 text-sm text-mist">{university.localName}</p>}
          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-slate">{university.overview}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <SaveActions
              universityId={university.id}
              programId={candidate?.input.program.id}
              saved={Boolean(saved)}
              planned={Boolean(planned)}
              signedIn={Boolean(user)}
            />
            <Link href={`/compare?ids=${university.slug}`} className="btn">
              <Rows3 size={15} /> Compare
            </Link>
            {university.websiteUrl && (
              <a href={university.websiteUrl} target="_blank" rel="noreferrer" className="btn">
                <ExternalLink size={15} /> Official site
              </a>
            )}
          </div>
        </div>

        {candidate && (
          <aside className="glass rounded-[26px] p-5">
            <div className="flex items-center gap-4">
              <FitRing score={candidate.score.overall} size={82} />
              <div>
                <MatchBadge score={candidate.score.overall} />
                <p className="mt-2 text-sm text-slate">
                  {context.profileComplete
                    ? "Scored against your profile"
                    : "Neutral profile — finish onboarding for your own figures"}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <DimensionBars dimensions={candidate.score.dimensions} />
            </div>
            <p className="tabular mt-5 border-t border-line pt-4 text-sm">
              {formatMoney(candidate.input.annualCost.total, context.currency)}
              <span className="text-xs text-mist"> estimated per year, all in</span>
            </p>
          </aside>
        )}
      </header>

      {candidate && (
        <section>
          <SectionHeading
            title="Why this ranking"
            description="Every point in the score above traces back to one of these checks."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="panel p-5">
              <h3 className="text-base">What works in your favour</h3>
              <ul className="mt-3 space-y-2.5">
                {candidate.score.strengths.length === 0 && (
                  <li className="text-sm text-slate">
                    Nothing scored as a clear strength yet — completing your profile usually changes
                    this.
                  </li>
                )}
                {candidate.score.strengths.map((reason, index) => (
                  <li key={index} className="flex gap-2.5 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-viridian" />
                    <span className="text-slate">{reason.message}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="panel p-5">
              <h3 className="text-base">What to watch</h3>
              <ul className="mt-3 space-y-2.5">
                {candidate.score.concerns.length === 0 && (
                  <li className="text-sm text-slate">No blocking issues found in our records.</li>
                )}
                {candidate.score.concerns.map((reason, index) => (
                  <li key={index} className="flex gap-2.5 text-sm">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background:
                          reason.kind === "blocker"
                            ? "var(--color-rust)"
                            : reason.kind === "unknown"
                              ? "var(--color-mist)"
                              : "var(--color-brass)",
                      }}
                    />
                    <span className="text-slate">{reason.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section>
        <SectionHeading title="What a year costs" description="Figures below are as recorded, converted into your currency." />
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-slate">
                <th scope="col" className="px-5 py-3 font-medium">Living arrangement</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Housing</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Food</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Transport</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Insurance</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Personal</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Per month</th>
              </tr>
            </thead>
            <tbody>
              {university.livingCostRecords.map((record) => {
                const monthly =
                  record.housingPerMonth +
                  record.foodPerMonth +
                  record.transportPerMonth +
                  record.insurancePerMonth +
                  record.personalPerMonth;
                return (
                  <tr key={record.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">{HOUSING_LABEL[record.housingType]}</td>
                    <td className="px-3 py-3 text-right">{money(record.housingPerMonth, record.currency)}</td>
                    <td className="px-3 py-3 text-right">{money(record.foodPerMonth, record.currency)}</td>
                    <td className="px-3 py-3 text-right">{money(record.transportPerMonth, record.currency)}</td>
                    <td className="px-3 py-3 text-right">{money(record.insurancePerMonth, record.currency)}</td>
                    <td className="px-3 py-3 text-right">{money(record.personalPerMonth, record.currency)}</td>
                    <td className="px-5 py-3 text-right font-medium">{money(monthly, record.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {university.tuitionRecords.slice(0, 1).map((record) => (
            <VerificationBadge
              key={record.id}
              status={record.verification}
              lastVerifiedAt={record.lastVerifiedAt}
            />
          ))}
          <Link href="/decision-lab" className="btn btn-sm">
            Model this in the Decision Lab
          </Link>
        </div>
      </section>

      <section>
        <SectionHeading title="Programs and entry requirements" />
        <div className="space-y-3">
          {university.programs.map((program) => {
            const tuition =
              university.tuitionRecords.find((record) => record.programId === program.id) ??
              university.tuitionRecords.find((record) => record.programId === null);
            return (
              <article key={program.id} className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base">{program.name}</h3>
                    <p className="mt-1 text-xs text-slate">
                      {titleCase(program.degreeLevel)} · {program.durationYears} years · taught in{" "}
                      {program.languageOfInstruction} · {program.major.field.name}
                    </p>
                  </div>
                  {tuition && (
                    <p className="tabular text-sm">
                      {money(tuition.tuitionPerYear, tuition.currency)}
                      <span className="text-xs text-mist"> tuition / year</span>
                    </p>
                  )}
                </div>

                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-mist">Academic</dt>
                    <dd className="mt-1 text-slate">
                      {program.admissionRequirement?.minGpa
                        ? `Minimum GPA ${program.admissionRequirement.minGpa} / ${program.admissionRequirement.gpaScale}`
                        : "No published minimum on file"}
                      {program.admissionRequirement?.interviewRequired && " · interview"}
                      {program.admissionRequirement?.portfolioRequired && " · portfolio"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-mist">Language</dt>
                    <dd className="mt-1 text-slate">
                      {program.languageRequirements.length === 0
                        ? "Not recorded — confirm with the university"
                        : program.languageRequirements
                            .map(
                              (requirement) =>
                                `${requirement.test.replace("_", " ")} ${requirement.minScore ?? requirement.minBand ?? ""}${requirement.waivable ? " (waivable)" : ""}`,
                            )
                            .join(" · ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-mist">Application window</dt>
                    <dd className="mt-1 inline-flex items-center gap-1.5 text-slate">
                      <CalendarDays size={13} />
                      {program.applicationOpens && program.applicationCloses
                        ? `${formatDate(program.applicationOpens)} – ${formatDate(program.applicationCloses)}`
                        : "Not published"}
                    </dd>
                  </div>
                </dl>

                {program.admissionRequirement?.requiredDocuments.length ? (
                  <p className="mt-3 text-xs text-mist">
                    Documents: {program.admissionRequirement.requiredDocuments.join(", ")}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeading title="Scholarships at this university" />
        {university.scholarships.length === 0 ? (
          <p className="panel p-5 text-sm text-slate">
            No awards for international students are recorded here yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {university.scholarships.map((scholarship) => {
              const input = {
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
                {
                  ...context.student,
                  nationalityCode: context.nationalityCode,
                  degreeLevel: context.degreeLevel,
                },
                candidate?.input.annualCost.total ?? 0,
              );
              const coverage = candidate
                ? coveragePercentOfCost(input, candidate.input.annualCost.tuition, candidate.input.annualCost.total)
                : 0;

              return (
                <article key={scholarship.id} className="panel p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base leading-snug">{scholarship.name}</h3>
                    <span
                      className="chip"
                      style={{
                        color:
                          match.state === "ELIGIBLE"
                            ? "var(--color-viridian)"
                            : match.state === "POSSIBLE"
                              ? "var(--color-brass)"
                              : "var(--color-rust)",
                      }}
                    >
                      {match.state === "ELIGIBLE"
                        ? "Eligible"
                        : match.state === "POSSIBLE"
                          ? "Possibly eligible"
                          : "Not currently eligible"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate">{scholarship.summary}</p>
                  <p className="mt-2 text-xs text-mist">
                    {coverageSummary(input)}
                    {coverage > 0 && ` · about ${coverage}% of your annual cost`}
                  </p>
                  <ul className="mt-3 space-y-1.5">
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
                  {scholarship.deadline && (
                    <p className="mt-3 text-xs text-mist">Closes {formatDate(scholarship.deadline)}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionHeading title="Life on campus" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="panel p-5">
            <h3 className="flex items-center gap-2 text-base">
              <Home size={16} className="text-viridian" /> Housing
            </h3>
            <p className="mt-2 text-sm text-slate">
              {university.housingAvailable
                ? university.housingNotes ?? "University housing is available to international students."
                : "No university housing recorded — students rent privately."}
            </p>
          </div>
          <div className="panel p-5">
            <h3 className="text-base">Work rules while studying</h3>
            <p className="mt-2 text-sm text-slate">
              {university.country.workRuleSummary ?? "Not recorded for this country yet."}
            </p>
          </div>
          <div className="panel p-5">
            <h3 className="flex items-center gap-2 text-base">
              <Mail size={16} className="text-viridian" /> International office
            </h3>
            <p className="mt-2 text-sm text-slate">
              {university.internationalOfficeEmail ?? "Contact not recorded"}
              {university.internationalOfficePhone ? ` · ${university.internationalOfficePhone}` : ""}
            </p>
            <p className="mt-2 text-xs text-mist">{university.internationalSupport}</p>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading title="Where this data came from" />
        <div className="panel divide-y divide-[color:var(--color-line)]">
          {[
            ...university.tuitionRecords.map((record) => ({
              label: `Tuition ${record.academicYear}`,
              source: record.dataSource,
              status: record.verification,
              verified: record.lastVerifiedAt,
              collected: record.collectedAt,
            })),
            ...university.livingCostRecords.map((record) => ({
              label: `Living costs (${HOUSING_LABEL[record.housingType]})`,
              source: record.dataSource,
              status: record.verification,
              verified: record.lastVerifiedAt,
              collected: record.collectedAt,
            })),
          ].map((row, index) => (
            <div key={index} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
              <span>{row.label}</span>
              <span className="flex flex-wrap items-center gap-3 text-xs text-slate">
                <span>
                  {row.source?.label ?? "Source not recorded"}
                  {row.source?.url && (
                    <a href={row.source.url} target="_blank" rel="noreferrer" className="ml-1.5 link-underline">
                      link
                    </a>
                  )}
                </span>
                <span className="text-mist">collected {formatDate(row.collected)}</span>
                <VerificationBadge status={row.status} lastVerifiedAt={row.verified} />
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <DataNotice>
            Something wrong here? University staff can claim this profile in the representative
            portal, and anyone can submit a correction with evidence.
          </DataNotice>
        </div>
      </section>
    </div>
  );
}
