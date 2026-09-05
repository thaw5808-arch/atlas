import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarClock } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { buildCandidates, getStudentContext } from "@/lib/recommendations";
import { annualFundingCapacity } from "@/lib/costs";
import { formatMoney } from "@/lib/money";
import { daysUntil, formatDate } from "@/lib/format";
import { UniversityCard } from "@/components/university-card";
import { DimensionBars, EmptyState, SectionHeading, Stat } from "@/components/ui";

const STAGE_LABEL: Record<string, string> = {
  RESEARCHING: "Researching",
  CONSIDERING: "Considering",
  PREPARING: "Preparing",
  READY_TO_APPLY: "Ready to apply",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  ACCEPTED: "Accepted",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/dashboard");

  const context = await getStudentContext(user.id);
  const [profile, applications, savedCount, notifications] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId: user.id } }),
    prisma.application.findMany({
      where: { userId: user.id },
      include: { university: true, tasks: true, program: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.savedUniversity.count({ where: { userId: user.id } }),
    prisma.notification.findMany({
      where: { userId: user.id, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  if (!profile?.completedOnboarding) redirect("/onboarding");

  const candidates = await buildCandidates(context);
  const top = candidates.slice(0, 3);
  const capacity = annualFundingCapacity(profile);
  const cheapestFit = candidates.length > 0 ? Math.min(...candidates.map((c) => c.input.annualCost.total)) : 0;

  const completionFields = [
    profile.currentCountryCode,
    profile.nationalityCode,
    profile.currentEducationLevel,
    profile.desiredDegree,
    profile.desiredMajorId,
    profile.preferredCountries.length > 0 ? "yes" : null,
    profile.gpa,
    profile.annualFamilyBudget,
    profile.careerGoal,
  ];
  const completion = Math.round(
    (completionFields.filter(Boolean).length / completionFields.length) * 100,
  );

  const deadlines = applications
    .flatMap((application) => [
      ...(application.deadline
        ? [{ label: `${application.university.name} application`, date: application.deadline, href: "/planner" }]
        : []),
      ...application.tasks
        .filter((task) => task.dueDate && !task.completed)
        .map((task) => ({ label: `${task.title} · ${application.university.name}`, date: task.dueDate!, href: "/planner" })),
    ])
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const nextActions: { label: string; href: string }[] = [];
  if (completion < 100) nextActions.push({ label: "Finish the missing parts of your profile", href: "/onboarding" });
  if (applications.length === 0) nextActions.push({ label: "Add your first university to the planner", href: "/universities" });
  if (context.student.languages.length === 0)
    nextActions.push({ label: "Add a language test result to unlock language scoring", href: "/onboarding" });
  if (capacity > 0 && cheapestFit > capacity)
    nextActions.push({ label: "Nothing fits your budget yet — model a scholarship in the Decision Lab", href: "/decision-lab" });
  if (nextActions.length === 0)
    nextActions.push({ label: "Compare your shortlist side by side", href: "/compare" });

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">
            {new Date().getHours() < 12 ? "Good morning" : "Good evening"}, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-sm text-slate">
            {candidates.length} programs scored against your profile · {savedCount} saved ·{" "}
            {applications.length} in your planner
          </p>
        </div>
        <div className="glass flex items-center gap-3 rounded-full px-4 py-2">
          <span className="text-xs text-slate">Profile complete</span>
          <span className="h-1.5 w-24 rounded-full bg-parchment">
            <span className="block h-full rounded-full bg-viridian" style={{ width: `${completion}%` }} />
          </span>
          <span className="tabular text-sm">{completion}%</span>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Funding capacity per year"
          value={formatMoney(capacity, context.currency)}
          sub="Family budget, support and savings"
        />
        <Stat
          label="Cheapest option in range"
          value={cheapestFit > 0 ? formatMoney(cheapestFit, context.currency) : "—"}
          sub="Total annual cost, all in"
          tone={cheapestFit > 0 && cheapestFit <= capacity ? "positive" : "negative"}
        />
        <Stat
          label="Options inside your budget"
          value={`${candidates.filter((c) => c.input.annualCost.total <= capacity).length}`}
          sub={`of ${candidates.length} scored`}
        />
        <Stat
          label="Awards you qualify for"
          value={`${candidates.reduce(
            (sum, candidate) =>
              sum + candidate.input.scholarships.filter((s) => s.eligibility === "ELIGIBLE").length,
            0,
          )}`}
          sub="Across every university scored"
        />
      </section>

      <section>
        <SectionHeading
          title="Your strongest matches"
          action={
            <Link href="/universities" className="btn btn-sm">
              All universities <ArrowRight size={14} />
            </Link>
          }
        />
        {top.length === 0 ? (
          <EmptyState title="Nothing scored yet" body="Load university data or widen your preferences." />
        ) : (
          <div className="space-y-4">
            {top.map((candidate) => (
              <UniversityCard key={candidate.slug} candidate={candidate} currency={context.currency} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-lg">Application progress</h2>
          {applications.length === 0 ? (
            <p className="mt-3 text-sm text-slate">
              Nothing in the planner yet.{" "}
              <Link href="/universities" className="link-underline">
                Add a university
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {applications.slice(0, 5).map((application) => {
                const done = application.tasks.filter((task) => task.completed).length;
                const total = application.tasks.length || 1;
                return (
                  <li key={application.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <Link href="/planner" className="truncate hover:underline">
                        {application.university.name}
                      </Link>
                      <span className="text-xs text-slate">{STAGE_LABEL[application.stage]}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="h-1.5 flex-1 rounded-full bg-parchment">
                        <span
                          className="block h-full rounded-full bg-viridian"
                          style={{ width: `${(done / total) * 100}%` }}
                        />
                      </span>
                      <span className="tabular text-xs text-mist">
                        {done}/{total}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="text-lg">Upcoming deadlines</h2>
          {deadlines.length === 0 ? (
            <p className="mt-3 text-sm text-slate">No dated items yet.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {deadlines.map((deadline, index) => {
                const days = daysUntil(deadline.date);
                return (
                  <li key={index} className="flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <CalendarClock size={14} className="shrink-0 text-viridian" />
                      <span className="truncate">{deadline.label}</span>
                    </span>
                    <span
                      className="tabular shrink-0 text-xs"
                      style={{ color: days < 21 ? "var(--color-rust)" : "var(--color-slate)" }}
                    >
                      {formatDate(deadline.date)} · {days}d
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="panel p-5">
          <h2 className="text-lg">How your top match scores</h2>
          {top[0] ? (
            <>
              <p className="mt-1 text-sm text-slate">{top[0].input.universityName}</p>
              <div className="mt-4">
                <DimensionBars dimensions={top[0].score.dimensions} />
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate">No matches scored yet.</p>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="text-lg">Do this next</h2>
          <ul className="mt-3 space-y-2">
            {nextActions.map((action) => (
              <li key={action.href + action.label}>
                <Link href={action.href} className="flex items-start gap-2 text-sm text-slate hover:text-ink">
                  <ArrowRight size={14} className="mt-1 shrink-0 text-viridian" />
                  {action.label}
                </Link>
              </li>
            ))}
          </ul>
          {notifications.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-xs text-mist">Unread</p>
              <ul className="mt-2 space-y-1.5">
                {notifications.map((notification) => (
                  <li key={notification.id} className="text-sm text-slate">
                    {notification.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
