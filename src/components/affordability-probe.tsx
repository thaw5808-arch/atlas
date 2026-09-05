"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";

export type ProbeUniversity = {
  slug: string;
  name: string;
  city: string;
  countryCode: string;
  countryName: string;
  total: number;
  tuition: number;
  scholarships: number;
};

export function AffordabilityProbe({
  universities,
  currency,
}: {
  universities: ProbeUniversity[];
  currency: string;
}) {
  const [budget, setBudget] = useState(18000);

  const { affordable, byCountry, cheapest } = useMemo(() => {
    const affordable = universities.filter((u) => u.total <= budget);
    const counts = new Map<string, { name: string; total: number; fits: number }>();
    for (const university of universities) {
      const entry = counts.get(university.countryCode) ?? {
        name: university.countryName,
        total: 0,
        fits: 0,
      };
      entry.total += 1;
      if (university.total <= budget) entry.fits += 1;
      counts.set(university.countryCode, entry);
    }
    return {
      affordable,
      byCountry: [...counts.values()].sort((a, b) => b.fits - a.fits || a.name.localeCompare(b.name)),
      cheapest: [...affordable].sort((a, b) => a.total - b.total).slice(0, 3),
    };
  }, [universities, budget]);

  return (
    <div className="glass rounded-[26px] p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor="probe-budget" className="text-sm text-slate">
          What you can spend per year
        </label>
        <span className="tabular font-display text-2xl">{formatMoney(budget, currency)}</span>
      </div>

      <input
        id="probe-budget"
        type="range"
        min={4000}
        max={70000}
        step={500}
        value={budget}
        onChange={(event) => setBudget(Number(event.target.value))}
        className="mt-3 w-full accent-[var(--color-viridian)]"
      />

      <p className="mt-4 text-sm text-slate">
        <span className="tabular font-medium text-ink">{affordable.length}</span> of{" "}
        <span className="tabular">{universities.length}</span> programs in the dataset fit inside that
        figure once tuition, fees, housing, food, transport, insurance and books are added together.
      </p>

      <ul className="mt-4 space-y-2">
        {byCountry.slice(0, 5).map((country) => (
          <li key={country.name} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3">
            <span className="truncate text-xs text-slate">{country.name}</span>
            <span className="h-2 rounded-full bg-parchment">
              <span
                className="block h-full rounded-full bg-viridian transition-[width] duration-200"
                style={{ width: `${(country.fits / country.total) * 100}%` }}
              />
            </span>
            <span className="tabular text-right text-xs text-mist">
              {country.fits}/{country.total}
            </span>
          </li>
        ))}
      </ul>

      {cheapest.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-2 text-xs text-mist">Lowest total cost inside that budget</p>
          <ul className="space-y-1.5">
            {cheapest.map((university) => (
              <li key={university.slug} className="flex items-center justify-between gap-3 text-sm">
                <Link href={`/universities/${university.slug}`} className="truncate link-underline">
                  {university.name}
                </Link>
                <span className="tabular shrink-0 text-slate">
                  {formatMoney(university.total, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
