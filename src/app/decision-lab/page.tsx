import { ScenarioLab } from "@/components/scenario-lab";
import { WeightsPanel } from "@/components/weights-panel";
import { SectionHeading, DataNotice } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { buildCandidates, buildScenarioOptions, getStudentContext } from "@/lib/recommendations";

export default async function DecisionLabPage() {
  const user = await getCurrentUser();
  const context = await getStudentContext(user?.id);
  const [candidates, options, profile] = await Promise.all([
    buildCandidates(context),
    buildScenarioOptions(context),
    user
      ? prisma.studentProfile.findUnique({ where: { userId: user.id } })
      : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl">Decision Lab</h1>
        <p className="mt-2 max-w-prose text-sm text-slate">
          Two questions live here: what matters to you, and what a given plan actually costs. Change
          either and everything downstream recalculates.
        </p>
      </header>

      <section>
        <SectionHeading
          title="Priorities"
          description="Reweight the six fit dimensions and watch the ranking reorder."
        />
        <WeightsPanel
          student={context.student}
          candidates={candidates.map((candidate) => ({ slug: candidate.slug, input: candidate.input }))}
          initialWeights={context.weights}
          currency={context.currency}
          signedIn={Boolean(user)}
        />
      </section>

      <section>
        <SectionHeading
          title="Scenario builder"
          description="Model a full year: tuition, living, flights, reserve, scholarships and — separately — any work you might find."
        />
        <ScenarioLab
          options={options}
          currency={context.currency}
          funding={{
            annualFamilyBudget: profile?.annualFamilyBudget ?? 0,
            savings: profile?.availableSavings ?? 0,
            expectedSupport: profile?.expectedSupport ?? 0,
          }}
        />
        <div className="mt-4">
          <DataNotice>
            Part-time earnings are shown separately from guaranteed funding because visa rules, term
            schedules and local job markets all change what a student can actually earn. Never plan a
            degree on money you have not been offered.
          </DataNotice>
        </div>
      </section>
    </div>
  );
}
