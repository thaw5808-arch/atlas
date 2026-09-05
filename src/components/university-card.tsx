import Link from "next/link";
import { Building2, MapPin, Wallet } from "lucide-react";
import type { Candidate } from "@/lib/recommendations";
import { formatMoney } from "@/lib/money";
import { titleCase } from "@/lib/format";
import { DimensionBars, FitRing, MatchBadge } from "./ui";

export function UniversityCard({
  candidate,
  currency,
  showBars = true,
}: {
  candidate: Candidate;
  currency: string;
  showBars?: boolean;
}) {
  const { input, score } = candidate;
  const topStrength = score.strengths[0];
  const topConcern = score.concerns[0];

  return (
    <article className="panel overflow-hidden">
      <div className="flex gap-4 p-5">
        <div className="shrink-0">
          <FitRing score={score.overall} />
          <p className="mt-1.5 text-center text-[11px] text-mist">match</p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg leading-tight">
                <Link href={`/universities/${candidate.slug}`} className="hover:underline">
                  {input.universityName}
                </Link>
              </h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} /> {candidate.cityName}, {input.countryName}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Building2 size={12} /> {titleCase(candidate.universityType)}
                </span>
              </p>
            </div>
            <MatchBadge score={score.overall} />
          </div>

          <p className="mt-2.5 text-sm">
            {input.program.name}
            <span className="text-mist"> · {input.program.durationYears} years · taught in {input.program.languageOfInstruction}</span>
          </p>

          <p className="mt-2 inline-flex items-center gap-1.5 text-sm">
            <Wallet size={14} className="text-viridian" />
            <span className="tabular font-medium">{formatMoney(input.annualCost.total, currency)}</span>
            <span className="text-xs text-mist">
              per year, all in · tuition {formatMoney(input.annualCost.tuition, currency)}
            </span>
          </p>
        </div>
      </div>

      {showBars && (
        <div className="grid gap-4 border-t border-line px-5 py-4 sm:grid-cols-2">
          <DimensionBars dimensions={score.dimensions} compact />
          <div className="space-y-2 text-sm">
            {topStrength && (
              <p className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-viridian" />
                <span className="text-slate">{topStrength.message}</span>
              </p>
            )}
            {topConcern && (
              <p className="flex gap-2">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    background:
                      topConcern.kind === "blocker" ? "var(--color-rust)" : "var(--color-brass)",
                  }}
                />
                <span className="text-slate">{topConcern.message}</span>
              </p>
            )}
            <Link href={`/universities/${candidate.slug}`} className="inline-block pt-1 text-sm link-underline">
              Why this ranking
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}
