"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { formatMoney } from "@/lib/money";
import worldCountriesData from "@/data/world-countries-110m.json";

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

// Shape of src/data/world-countries-110m.json — real country borders at 110m resolution
// (world-atlas), reduced to just {name, code} + geometry and regenerated locally with
// `npm run data:world-countries` (see scripts/build-world-countries.js). Bundled as a static
// import rather than fetched, so the map works offline and needs no runtime geo dependency.
type Ring = [number, number][];
type WorldGeometry = { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };
type WorldFeature = { type: "Feature"; properties: { name: string; code: string | null }; geometry: WorldGeometry };
const worldCountries = worldCountriesData as unknown as { features: WorldFeature[] };

// Equirectangular projection onto the 1000 × 500 plot below.
const project = (lat: number, lon: number) => ({
  x: ((lon + 180) / 360) * 1000,
  y: ((90 - lat) / 180) * 500,
});

// Turns one ring of [lon, lat] pairs into one or more closed SVG subpaths. Split wherever
// longitude jumps by more than 180° between consecutive points — otherwise a country that
// crosses the antimeridian (Russia, Fiji, the Aleutians) would draw a spurious line straight
// across the map, since this is a plain equirectangular projection with no spherical clipping.
function ringToPathParts(ring: Ring): string[] {
  const parts: string[] = [];
  let current: string[] = [];
  let prevLon: number | null = null;
  for (const [lon, lat] of ring) {
    const { x, y } = project(lat, lon);
    if (prevLon !== null && Math.abs(lon - prevLon) > 180 && current.length > 0) {
      parts.push(`${current.join(" ")} Z`);
      current = [];
    }
    current.push(`${current.length === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
    prevLon = lon;
  }
  if (current.length > 0) parts.push(`${current.join(" ")} Z`);
  return parts;
}

// One `d` string per feature, all rings and (for MultiPolygons) all parts combined — evenodd
// fill so holes (e.g. Lesotho inside South Africa) punch through correctly regardless of ring
// winding order.
function geometryToPath(geometry: WorldGeometry): string {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap((polygon) => polygon.flatMap(ringToPathParts)).join(" ");
}

// A 13px label is roughly 6.5px per character wide on average for this font — precise enough
// to keep labels from overlapping without measuring actual rendered text.
const approxLabelWidth = (text: string) => text.length * 6.5;

type Positioned = { country: CountryEntry; x: number; y: number; radius: number };
type Labelled = Positioned & { labelY: number };

// Places each label to the right of its marker, then nudges any label down, one line at a
// time, until its (approximated) bounding box clears every label already placed. Processes
// points in the given order, so earlier entries never move for later ones.
function layoutLabels(points: Positioned[]): Labelled[] {
  const placed: { left: number; right: number; top: number; bottom: number }[] = [];
  return points.map((point) => {
    const left = point.x + point.radius + 4;
    const width = approxLabelWidth(point.country.name);
    const right = left + width;
    let labelY = point.y + 4;
    for (;;) {
      const top = labelY - 10;
      const bottom = labelY + 4;
      const overlapsPlaced = placed.some(
        (box) => !(right < box.left || left > box.right || bottom < box.top || top > box.bottom),
      );
      if (!overlapsPlaced) {
        placed.push({ left, right, top, bottom });
        return { ...point, labelY };
      }
      labelY += 14;
    }
  });
}

export function CountryExplorer({ countries, initialCode }: { countries: CountryEntry[]; initialCode?: string }) {
  const [selected, setSelected] = useState<CountryEntry | null>(
    countries.find((country) => country.code === initialCode) ?? null,
  );

  const countryByCode = useMemo(() => new Map(countries.map((country) => [country.code, country])), [countries]);

  const labelled = useMemo(() => {
    const positioned = countries
      .filter((country): country is CountryEntry & { latitude: number; longitude: number } =>
        country.latitude != null && country.longitude != null,
      )
      .map((country) => {
        const { x, y } = project(country.latitude, country.longitude);
        return { country, x, y, radius: 6 + Math.min(14, country.universityCount * 3) };
      });
    return layoutLabels(positioned);
  }, [countries]);

  const { mutedPaths, highlightedPaths, unmarkedHighlighted } = useMemo(() => {
    const positionedCodes = new Set(labelled.map((point) => point.country.code));
    const muted: { key: string; d: string }[] = [];
    const highlighted = new Map<string, string>(); // code -> path d
    const extra: { country: CountryEntry; d: string }[] = [];

    for (const feature of worldCountries.features) {
      const code = feature.properties.code;
      const country = code ? countryByCode.get(code) : undefined;
      if (!country) {
        muted.push({ key: code ?? feature.properties.name, d: geometryToPath(feature.geometry) });
        continue;
      }
      const d = geometryToPath(feature.geometry);
      if (positionedCodes.has(country.code)) {
        highlighted.set(country.code, d);
      } else {
        // Present in the dataset but with no lat/long to hang a marker off — still
        // highlighted and clickable, just via the shape alone.
        extra.push({ country, d });
      }
    }
    return { mutedPaths: muted, highlightedPaths: highlighted, unmarkedHighlighted: extra };
  }, [countryByCode, labelled]);

  const open = (country: CountryEntry) => setSelected(country);
  const activateOnKey = (country: CountryEntry) => (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open(country);
    }
  };

  return (
    <div className="relative">
      <div className="panel overflow-hidden">
        {/* Not role="img": the shapes and markers below are real controls, and labelling the
            whole svg as a single image would flatten them out of the accessibility tree. The
            decorative ground (fill, muted countries, grid) is hidden from assistive tech
            instead, and each highlighted country carries its own name. */}
        <svg
          viewBox="0 0 1000 500"
          className="h-auto w-full"
          role="group"
          aria-label="Countries in the dataset, plotted on a world map"
        >
          <rect width="1000" height="500" fill="#e9ede7" aria-hidden="true" />

          {mutedPaths.map(({ key, d }) => (
            <path key={key} d={d} fillRule="evenodd" className="country-muted" aria-hidden="true" />
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
              aria-hidden="true"
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
              aria-hidden="true"
            />
          ))}

          {unmarkedHighlighted.map(({ country, d }) => {
            const active = selected?.code === country.code;
            return (
              <g
                key={country.code}
                role="button"
                tabIndex={0}
                aria-label={country.name}
                aria-pressed={active}
                onClick={() => open(country)}
                onKeyDown={activateOnKey(country)}
                className="country-highlighted"
              >
                <path d={d} fillRule="evenodd" aria-hidden="true" />
              </g>
            );
          })}

          {labelled.map(({ country, x, y, radius, labelY }) => {
            const active = selected?.code === country.code;
            const d = highlightedPaths.get(country.code);
            return (
              <g
                key={country.code}
                role="button"
                tabIndex={0}
                aria-label={country.name}
                aria-pressed={active}
                onClick={() => open(country)}
                onKeyDown={activateOnKey(country)}
                className="country-highlighted"
                style={{ cursor: "pointer" }}
              >
                {d && <path d={d} fillRule="evenodd" aria-hidden="true" />}
                <circle cx={x} cy={y} r={radius} fill="#17635a" fillOpacity={active ? 0.28 : 0.14} aria-hidden="true" />
                <circle cx={x} cy={y} r={4} fill={active ? "#0b1f29" : "#17635a"} aria-hidden="true" />
                <text x={x + radius + 4} y={labelY} fontSize={13} fill="#47606b" aria-hidden="true">
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
              <h2 className="text-xl">{selected.name}</h2>
              <p className="mt-0.5 text-xs text-slate">
                {selected.region} · {selected.currency} · {selected.languages.join(", ")}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost h-8 w-8 px-0"
              onClick={() => setSelected(null)}
              aria-label="Close country details"
            >
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
