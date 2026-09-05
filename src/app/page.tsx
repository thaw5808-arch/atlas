import Link from "next/link";
import { ArrowUpRight, Layers, ListChecks, ScrollText } from "lucide-react";
import { AffordabilityProbe, type ProbeUniversity } from "@/components/affordability-probe";
import { DataNotice } from "@/components/ui";
import { buildCandidates, getStudentContext } from "@/lib/recommendations";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { DIMENSIONS } from "@/lib/decision";

export default async function HomePage() {
  const user = await getCurrentUser();
  const context = await getStudentContext(user?.id);
  const candidates = await buildCandidates(context);
  const [countryCount, scholarshipCount] = await Promise.all([
    prisma.country.count(),
    prisma.scholarship.count(),
  ]);

  const probe: ProbeUniversity[] = candidates.map((candidate) => ({
    slug: candidate.slug,
    name: candidate.input.universityName,
    city: candidate.cityName,
    countryCode: candidate.input.countryCode,
    countryName: candidate.input.countryName,
    total: Math.round(candidate.input.annualCost.total),
    tuition: Math.round(candidate.input.annualCost.tuition),
    scholarships: candidate.scholarshipCount,
  }));

  return (
    <div className="space-y-20">
      <section className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="pt-6 lg:pt-10">
          <h1 className="max-w-[16ch] font-display text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">
            Studying abroad is a budgeting problem before it is a dream.
          </h1>
          <p className="mt-5 max-w-prose text-[15px] leading-relaxed text-slate">
            ATLAS takes what you can afford, what you have studied, the language results you hold and
            where you are willing to live, then works out which universities and countries actually
            remain open to you. Every score comes with the reasoning behind it, and every cost figure
            carries the source it came from.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={user ? "/dashboard" : "/register"} className="btn btn-primary">
              {user ? "Open your dashboard" : "Build your profile"}
            </Link>
            <Link href="/universities" className="btn">
              Browse universities
            </Link>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
            <div>
              <dt className="text-xs text-mist">Programs costed</dt>
              <dd className="tabular font-display text-2xl">{candidates.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-mist">Countries profiled</dt>
              <dd className="tabular font-display text-2xl">{countryCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-mist">Scholarships tracked</dt>
              <dd className="tabular font-display text-2xl">{scholarshipCount}</dd>
            </div>
          </dl>
        </div>

        <AffordabilityProbe universities={probe} currency={context.currency} />
      </section>

      <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="text-2xl">A score you can argue with</h2>
          <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-slate">
            Each university is scored across six dimensions, weighted by what you say matters. Change
            a weight and the ranking changes in front of you. Where a figure is missing from our
            records, the dimension says so instead of guessing.
          </p>
          <Link href="/decision-lab" className="mt-5 inline-flex items-center gap-1.5 text-sm link-underline">
            Try the Decision Lab <ArrowUpRight size={15} />
          </Link>
        </div>

        <div className="panel divide-y divide-[color:var(--color-line)]">
          {DIMENSIONS.map((dimension, index) => (
            <div key={dimension.key} className="flex items-baseline gap-4 px-5 py-3.5">
              <span className="tabular w-6 text-xs text-mist">{index + 1}</span>
              <span className="w-32 text-sm">{dimension.label}</span>
              <span className="flex-1 text-sm text-slate">{DIMENSION_COPY[dimension.key]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Layers,
            title: "Model the whole degree, not one tuition figure",
            body: "Housing, food, transport, insurance, visa fees, flights and an emergency reserve are all part of the number. Part-time earnings stay a scenario, never counted as guaranteed money.",
            href: "/decision-lab",
            cta: "Open Decision Lab",
          },
          {
            icon: ListChecks,
            title: "Turn a shortlist into an application plan",
            body: "Move universities through researching, preparing, applied and offer stages, with a document checklist and deadline calendar attached to each one.",
            href: "/planner",
            cta: "See the planner",
          },
          {
            icon: ScrollText,
            title: "Know where every number came from",
            body: "Tuition, admission and language records carry a source, a collection date and a verification state. University staff can claim a profile and submit corrections.",
            href: "/countries",
            cta: "Explore countries",
          },
        ].map((card) => (
          <article key={card.title} className="panel flex flex-col gap-3 p-5">
            <card.icon size={20} className="text-viridian" />
            <h3 className="text-base leading-snug">{card.title}</h3>
            <p className="text-sm leading-relaxed text-slate">{card.body}</p>
            <Link href={card.href} className="mt-auto pt-2 text-sm link-underline">
              {card.cta}
            </Link>
          </article>
        ))}
      </section>

      <footer className="border-t border-line pt-6">
        <DataNotice>
          This deployment runs on a sample dataset built for development. Institutions, fees and
          requirements are illustrative and must be replaced with sourced, verified records before
          anyone relies on them for a real application.
        </DataNotice>
      </footer>
    </div>
  );
}

const DIMENSION_COPY: Record<string, string> = {
  academic: "Your GPA against the published minimum, plus how close the program is to your subject.",
  financial: "Annual cost after any award you qualify for, against what you can actually fund.",
  language: "Each listed test requirement checked against the results on your profile.",
  location: "Country and city type against your stated preferences and work intentions.",
  scholarship: "Awards you meet the criteria for, weighted by how much of the cost they cover.",
  career: "How closely the program's subject matter tracks the goal you wrote down.",
};
