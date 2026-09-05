"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { formatMoney } from "@/lib/money";

export type CountryEntry = {
  code: string;
  name: string;
  region: string;
  currency: string;
  languages: string[];
  visaOverview: string | null;
  workRuleSummary: string | null;
  workHoursPerWeek: number | null;
  academicCalendar: string | null;
  housingNotes: string | null;
  insuranceNotes: string | null;
  transportNotes: string | null;
  typicalTuitionMin: number | null;
  typicalTuitionMax: number | null;
  typicalLivingMin: number | null;
  typicalLivingMax: number | null;
  latitude: number | null;
  longitude: number | null;
  universityCount: number;
  cities: string[];
};

// Equirectangular projection onto the 1000 × 500 plot below.
const project = (lat: number, lon: number) => ({
  x: ((lon + 180) / 360) * 1000,
  y: ((90 - lat) / 180) * 500,
});

// Very low-detail continent silhouettes, as a handful of [lat, lon] corners
// each — just enough to read as landmasses, not a real coastline. Run
// through the same `project` as the markers so they always land in the
// right place relative to the plotted points.
const LANDMASSES: [number, number][][] = [
  // North America
  [
    [72, -165], [71, -140], [60, -95], [50, -80], [45, -65], [40, -74],
    [25, -80], [18, -95], [9, -83], [15, -92], [20, -105], [32, -117],
    [48, -125], [60, -150],
  ],
  // South America
  [
    [12, -72], [10, -62], [-5, -35], [-23, -43], [-34, -58], [-55, -68],
    [-50, -74], [-18, -70], [0, -79],
  ],
  // Europe
  [
    [71, 25], [65, -10], [45, -10], [36, -6], [38, 15], [45, 20],
    [55, 40], [65, 45],
  ],
  // Africa
  [
    [37, 10], [33, -8], [15, -17], [5, -10], [-5, 10], [-25, 15],
    [-34, 18], [-25, 33], [0, 42], [12, 45], [20, 38], [30, 32],
  ],
  // Asia
  [
    [75, 60], [70, 140], [60, 160], [45, 140], [35, 130], [20, 110],
    [10, 100], [5, 95], [8, 80], [8, 77], [20, 70], [35, 55],
    [45, 50], [55, 45], [65, 40],
  ],
  // Australia
  [
    [-12, 130], [-10, 142], [-20, 150], [-35, 150], [-38, 145],
    [-35, 138], [-32, 115], [-20, 115],
  ],
];

function landmassPath(points: [number, number][]) {
  return (
    points
      .map(([lat, lon], index) => {
        const { x, y } = project(lat, lon);
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") + " Z"
  );
}

export function CountryExplorer({ countries, initialCode }: { countries: CountryEntry[]; initialCode?: string }) {
  const [selected, setSelected] = useState<CountryEntry | null>(
    countries.find((country) => country.code === initialCode) ?? null,
  );

  const positioned = countries
    .filter((country): country is CountryEntry & { latitude: number; longitude: number } =>
      country.latitude != null && country.longitude != null,
    )
    .map((country) => {
      const { x, y } = project(country.latitude, country.longitude);
      return { country, x, y, radius: 6 + Math.min(14, country.universityCount * 3) };
    });

  // When two markers land within ~40px of each other, their default labels
  // (set to the right of the marker, roughly at marker height) collide. Drop
  // the later one down a line so both stay legible.
  const droppedLabels = new Set<string>();
  positioned.forEach((point, index) => {
    for (let earlier = 0; earlier < index; earlier++) {
      const other = positioned[earlier];
      if (Math.hypot(point.x - other.x, point.y - other.y) < 40) {
        droppedLabels.add(point.country.code);
        break;
      }
    }
  });

  return (
    <div className="relative">
      <div className="panel overflow-hidden">
        <svg viewBox="0 0 1000 500" className="h-auto w-full" role="img" aria-label="Countries in the dataset plotted by coordinates">
          <rect width="1000" height="500" fill="#e9ede7" />
          {LANDMASSES.map((points, index) => (
            <path
              key={`land${index}`}
              d={landmassPath(points)}
              fill="#d6ddd0"
              stroke="#0b1f29"
              strokeOpacity={0.08}
            />
          ))}
          {Array.from({ length: 12 }).map((_, index) => (
            <line
              key={`v${index}`}
              x1={(index / 11) * 1000}
              y1={0}
              x2={(index / 11) * 1000}
              y2={500}
              stroke="#0b1f29"
              strokeOpacity={0.07}
            />
          ))}
          {Array.from({ length: 7 }).map((_, index) => (
            <line
              key={`h${index}`}
              x1={0}
              y1={(index / 6) * 500}
              x2={1000}
              y2={(index / 6) * 500}
              stroke="#0b1f29"
              strokeOpacity={index === 3 ? 0.18 : 0.07}
            />
          ))}

          {positioned.map(({ country, x, y, radius }) => {
            const active = selected?.code === country.code;
            const labelY = y + 4 + (droppedLabels.has(country.code) ? 14 : 0);
            return (
              <g key={country.code} onClick={() => setSelected(country)} style={{ cursor: "pointer" }}>
                <circle cx={x} cy={y} r={radius} fill="#17635a" fillOpacity={active ? 0.28 : 0.14} />
                <circle cx={x} cy={y} r={4} fill={active ? "#0b1f29" : "#17635a"} />
                <text x={x + radius + 4} y={labelY} fontSize={13} fill="#47606b">
                  {country.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selected && (
        <aside className="glass fixed inset-x-3 bottom-20 z-40 max-h-[70vh] overflow-y-auto rounded-[26px] p-5 lg:absolute lg:inset-auto lg:right-4 lg:top-4 lg:bottom-4 lg:w-96">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl">{selected.name}</h3>
              <p className="mt-0.5 text-xs text-slate">
                {selected.region} · {selected.currency} · {selected.languages.join(", ")}
              </p>
            </div>
            <button type="button" className="btn btn-ghost h-8 w-8 px-0" onClick={() => setSelected(null)} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <dl className="mt-4 space-y-3 text-sm">
            <Row
              label="Typical tuition"
              value={
                selected.typicalTuitionMin != null && selected.typicalTuitionMax != null
                  ? `${formatMoney(selected.typicalTuitionMin, "USD")} – ${formatMoney(selected.typicalTuitionMax, "USD")} per year`
                  : "Not recorded"
              }
            />
            <Row
              label="Living costs"
              value={
                selected.typicalLivingMin != null && selected.typicalLivingMax != null
                  ? `${formatMoney(selected.typicalLivingMin, "USD")} – ${formatMoney(selected.typicalLivingMax, "USD")} per year`
                  : "Not recorded"
              }
            />
            <Row label="Student cities" value={selected.cities.join(", ") || "None recorded"} />
            <Row label="Visa" value={selected.visaOverview ?? "Not recorded"} />
            <Row
              label="Working while studying"
              value={
                selected.workRuleSummary ??
                (selected.workHoursPerWeek ? `About ${selected.workHoursPerWeek} hrs/week` : "Not recorded")
              }
            />
            <Row label="Academic calendar" value={selected.academicCalendar ?? "Not recorded"} />
            <Row label="Housing" value={selected.housingNotes ?? "Not recorded"} />
            <Row label="Insurance" value={selected.insuranceNotes ?? "Not recorded"} />
            <Row label="Transport" value={selected.transportNotes ?? "Not recorded"} />
          </dl>

          <Link href={`/universities?countries=${selected.code}`} className="btn btn-accent mt-5 w-full">
            See {selected.universityCount} universities here
          </Link>
        </aside>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-mist">{label}</dt>
      <dd className="mt-0.5 text-slate">{value}</dd>
    </div>
  );
}
