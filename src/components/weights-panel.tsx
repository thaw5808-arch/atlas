"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  DIMENSIONS,
  IMPORTANCE_WEIGHT,
  scoreCandidate,
  type CandidateInput,
  type Importance,
  type StudentInput,
  type Weights,
} from "@/lib/decision";
import { saveWeights } from "@/lib/actions/profile";
import { formatMoney } from "@/lib/money";
import { FitRing } from "./ui";

const OPTIONS: Importance[] = ["LOW", "MEDIUM", "HIGH", "VERY_HIGH"];
const LABEL: Record<Importance, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  VERY_HIGH: "Very high",
};

const ROWS: [keyof Weights, string][] = [
  ["financial", "Cost"],
  ["academic", "Academic fit"],
  ["language", "Language requirements"],
  ["location", "Location"],
  ["scholarship", "Scholarships"],
  ["career", "Career alignment"],
  ["ranking", "Ranking"],
];

export function WeightsPanel({
  student,
  candidates,
  initialWeights,
  currency,
  signedIn,
}: {
  student: StudentInput;
  candidates: { slug: string; input: CandidateInput }[];
  initialWeights: Weights;
  currency: string;
  signedIn: boolean;
}) {
  const [weights, setWeights] = useState<Weights>(initialWeights);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const ranked = useMemo(
    () =>
      candidates
        .map((candidate) => ({
          ...candidate,
          score: scoreCandidate(student, candidate.input, weights),
        }))
        .sort((a, b) => b.score.overall - a.score.overall)
        .slice(0, 8),
    [candidates, student, weights],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
      <div className="glass h-fit rounded-[26px] p-5">
        <h3 className="text-base">What matters to you</h3>
        <p className="mt-1 text-sm text-slate">The ranking on the right updates as you change these.</p>

        <div className="mt-4 space-y-3">
          {ROWS.map(([key, label]) => (
            <div key={key}>
              <span className="label mb-1.5">{label}</span>
              <div className="flex flex-wrap gap-1.5">
                {OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setWeights((current) => ({ ...current, [key]: option }))}
                    className={weights[key] === option ? "chip chip-selected" : "chip"}
                  >
                    {LABEL[option]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {signedIn && (
          <button
            type="button"
            className="btn btn-accent mt-5 w-full"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await saveWeights(weights);
                setSavedAt(new Date().toLocaleTimeString());
              })
            }
          >
            {pending ? "Saving…" : "Save these priorities"}
          </button>
        )}
        {savedAt && <p className="mt-2 text-xs text-mist">Saved at {savedAt}</p>}

        <p className="mt-4 text-xs text-mist">
          Weights are relative: a very high setting counts{" "}
          {IMPORTANCE_WEIGHT.VERY_HIGH / IMPORTANCE_WEIGHT.LOW}× a low one when the six scores are
          combined.
        </p>
      </div>

      <div className="panel divide-y divide-[color:var(--color-line)]">
        {ranked.map((candidate, index) => (
          <div key={candidate.slug} className="flex items-center gap-4 p-4">
            <span className="tabular w-5 text-sm text-mist">{index + 1}</span>
            <FitRing score={candidate.score.overall} size={46} />
            <div className="min-w-0 flex-1">
              <Link href={`/universities/${candidate.slug}`} className="block truncate text-sm hover:underline">
                {candidate.input.universityName}
              </Link>
              <p className="truncate text-xs text-slate">
                {candidate.input.countryName} · {formatMoney(candidate.input.annualCost.total, currency)} per year
              </p>
            </div>
            <div className="hidden gap-3 sm:flex">
              {DIMENSIONS.map((dimension) => (
                <div key={dimension.key} className="w-8 text-center">
                  <div className="mx-auto h-10 w-1.5 rounded-full bg-parchment">
                    <div
                      className="w-full rounded-full bg-viridian"
                      style={{
                        height: `${candidate.score.dimensions[dimension.key].score}%`,
                        marginTop: `${100 - candidate.score.dimensions[dimension.key].score}%`,
                      }}
                    />
                  </div>
                  <span className="mt-1 block text-[10px] text-mist">
                    {dimension.label.split(" ")[0].slice(0, 4)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
