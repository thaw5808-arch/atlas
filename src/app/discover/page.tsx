import Link from "next/link";
import { UniversityCard } from "@/components/university-card";
import { SectionHeading, EmptyState } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";
import { buildCandidates, getStudentContext, sortCandidates } from "@/lib/recommendations";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export default async function DiscoverPage() {
  const user = await getCurrentUser();
  const context = await getStudentContext(user?.id);
  const candidates = await buildCandidates(context);
  const countries = await prisma.country.findMany({ orderBy: { name: "asc" } });

  const cheapest = sortCandidates(candidates, "lowest_total_cost").slice(0, 3);
  const scholarship = sortCandidates(candidates, "scholarship").slice(0, 3);
  const best = candidates.slice(0, 3);

  if (candidates.length === 0) {
    return (
      <EmptyState
        title="No university data loaded"
        body="Run the seed script to populate countries, universities, programs and scholarships."
      />
    );
  }

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl">Discover</h1>
        <p className="mt-2 max-w-prose text-sm text-slate">
          Three ways into the same dataset: what fits you best, what costs least, and where the money
          is.
        </p>
      </header>

      <section>
        <SectionHeading
          title="Strongest matches for you"
          description="Weighted by the priorities on your profile."
          action={
            <Link href="/universities" className="btn btn-sm">
              See all
            </Link>
          }
        />
        <div className="space-y-4">
          {best.map((candidate) => (
            <UniversityCard key={candidate.slug} candidate={candidate} currency={context.currency} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="Lowest total annual cost" description="Tuition, fees and living costs combined." />
        <div className="space-y-4">
          {cheapest.map((candidate) => (
            <UniversityCard
              key={candidate.slug}
              candidate={candidate}
              currency={context.currency}
              showBars={false}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="Best scholarship prospects" description="Ranked by awards you currently qualify for." />
        <div className="space-y-4">
          {scholarship.map((candidate) => (
            <UniversityCard
              key={candidate.slug}
              candidate={candidate}
              currency={context.currency}
              showBars={false}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="Countries in the dataset" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {countries.map((country) => (
            <Link key={country.code} href={`/countries?code=${country.code}`} className="panel p-4">
              <p className="text-base">{country.name}</p>
              <p className="mt-1 text-xs text-slate">{country.region}</p>
              <p className="tabular mt-3 text-sm">
                {country.typicalTuitionMin != null && country.typicalTuitionMax != null
                  ? `${formatMoney(country.typicalTuitionMin, "USD")}–${formatMoney(country.typicalTuitionMax, "USD")} tuition`
                  : "Tuition range not recorded"}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
