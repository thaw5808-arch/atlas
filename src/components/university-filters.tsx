"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

const SORTS = [
  { value: "best_match", label: "Best match" },
  { value: "lowest_total_cost", label: "Lowest total cost" },
  { value: "lowest_tuition", label: "Lowest tuition" },
  { value: "scholarship", label: "Scholarship opportunity" },
  { value: "academic", label: "Academic compatibility" },
  { value: "budget", label: "Budget compatibility" },
];

export function UniversityFilters({
  countries,
  majors,
  languages,
  currency,
}: {
  countries: { code: string; name: string }[];
  majors: { id: string; name: string }[];
  languages: string[];
  currency: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    router.push(`/universities?${next.toString()}`, { scroll: false });
  };

  const selectedCountries = params.get("countries")?.split(",").filter(Boolean) ?? [];
  const toggleCountry = (code: string) => {
    const next = selectedCountries.includes(code)
      ? selectedCountries.filter((item) => item !== code)
      : [...selectedCountries, code];
    update("countries", next.length ? next.join(",") : null);
  };

  const activeCount =
    [...params.keys()].filter((key) => !["sort", "q"].includes(key)).length +
    (selectedCountries.length > 0 ? 0 : 0);

  return (
    <div className="glass sticky top-20 z-30 rounded-[22px] p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="university-search" className="sr-only">
          Search a university, city or country
        </label>
        <input
          id="university-search"
          className="input h-10 min-w-48 flex-1"
          placeholder="Search a university, city or country"
          defaultValue={params.get("q") ?? ""}
          onKeyDown={(event) => {
            if (event.key === "Enter") update("q", (event.target as HTMLInputElement).value || null);
          }}
        />
        <label htmlFor="university-sort" className="sr-only">
          Sort by
        </label>
        <select
          id="university-sort"
          className="input h-10 w-auto"
          value={params.get("sort") ?? "best_match"}
          onChange={(event) => update("sort", event.target.value)}
        >
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {sort.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn h-10"
          aria-expanded={open}
          aria-controls="university-filter-panel"
          onClick={() => setOpen((value) => !value)}
        >
          <SlidersHorizontal size={15} aria-hidden="true" />
          Filters {activeCount > 0 ? `(${activeCount})` : ""}
        </button>
      </div>

      {open && (
        <div id="university-filter-panel" className="mt-4 space-y-4 border-t border-line pt-4">
          <div>
            <p className="label" id="filter-countries-label">
              Countries
            </p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="filter-countries-label">
              {countries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  aria-pressed={selectedCountries.includes(country.code)}
                  onClick={() => toggleCountry(country.code)}
                  className={selectedCountries.includes(country.code) ? "chip chip-selected" : "chip"}
                >
                  {country.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="filter-degree">
                Degree level
              </label>
              <select
                id="filter-degree"
                className="input"
                value={params.get("degree") ?? ""}
                onChange={(event) => update("degree", event.target.value || null)}
              >
                <option value="">Any</option>
                {["FOUNDATION", "DIPLOMA", "BACHELOR", "MASTER", "DOCTORATE"].map((level) => (
                  <option key={level} value={level}>
                    {level.charAt(0) + level.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="filter-major">
                Subject
              </label>
              <select
                id="filter-major"
                className="input"
                value={params.get("major") ?? ""}
                onChange={(event) => update("major", event.target.value || null)}
              >
                <option value="">Any</option>
                {majors.map((major) => (
                  <option key={major.id} value={major.id}>
                    {major.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="filter-language">
                Taught in
              </label>
              <select
                id="filter-language"
                className="input"
                value={params.get("language") ?? ""}
                onChange={(event) => update("language", event.target.value || null)}
              >
                <option value="">Any</option>
                {languages.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="filter-type">
                University type
              </label>
              <select
                id="filter-type"
                className="input"
                value={params.get("type") ?? ""}
                onChange={(event) => update("type", event.target.value || null)}
              >
                <option value="">Any</option>
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private</option>
                <option value="PRIVATE_NONPROFIT">Private non-profit</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="filter-cost">
                Total annual cost at most ({currency})
              </label>
              <input
                id="filter-cost"
                className="input"
                inputMode="numeric"
                defaultValue={params.get("maxCost") ?? ""}
                onBlur={(event) => update("maxCost", event.target.value || null)}
              />
            </div>
            <div className="flex flex-wrap items-end gap-2">
              {[
                ["scholarships", "Has scholarships"],
                ["housing", "Housing available"],
                ["partTime", "Part-time work friendly"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={Boolean(params.get(key))}
                  onClick={() => update(key, params.get(key) ? null : "1")}
                  className={params.get(key) ? "chip chip-selected" : "chip"}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="btn btn-sm" onClick={() => router.push("/universities")}>
            <X size={14} /> Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
