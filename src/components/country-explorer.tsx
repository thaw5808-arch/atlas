"use client";

import { useEffect, useMemo, useState } from "react";
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

// Marker/label sizing, in viewBox units. Mobile markers are rendered noticeably larger — partly
// because these values are simply bigger, and partly because the map itself renders at a higher
// effective scale on narrow screens (see the aspect-ratio note on the wrapper below) — the two
// effects compound rather than compete.
type MarkerStyle = {
  baseRadius: number;
  radiusPerUniversity: number;
  maxRadiusBonus: number;
  dotRadius: number;
  fontSize: number;
  charWidth: number; // approx. rendered width per character, for label-collision layout
  lineHeight: number; // vertical step when a label has to drop below a colliding one
  gap: number; // space between a marker's edge and where its label starts
};

const DESKTOP_MARKER: MarkerStyle = {
  baseRadius: 6,
  radiusPerUniversity: 3,
  maxRadiusBonus: 14,
  dotRadius: 4,
  fontSize: 13,
  charWidth: 6.5,
  lineHeight: 14,
  gap: 4,
};

const MOBILE_MARKER: MarkerStyle = {
  baseRadius: 11,
  radiusPerUniversity: 4,
  maxRadiusBonus: 20,
  dotRadius: 7,
  fontSize: 19,
  charWidth: 9.5,
  lineHeight: 21,
  gap: 6,
};

// Must match the "aspect-[17/10]" class on the map's wrapper below — it's what determines how
// much of the map's left/right edges "slice" crops away on mobile. With a native 2:1 map, a
// container of ratio R (< 2) shows only the middle (R/2) of the full 1000-unit-wide viewBox.
const MOBILE_ASPECT_RATIO = 17 / 10;
const MOBILE_SAFE_X: [number, number] = (() => {
  const visibleWidth = 1000 * (MOBILE_ASPECT_RATIO / 2);
  const crop = (1000 - visibleWidth) / 2;
  return [crop, 1000 - crop];
})();
const DESKTOP_SAFE_X: [number, number] = [0, 1000];

type Positioned = { country: CountryEntry; x: number; y: number; radius: number };
type Labelled = Positioned & { labelX: number; labelY: number; anchor: "start" | "end" };

// Places each label to the right of its marker — or to the left, anchored from that side
// instead, if it would otherwise run past `safeX[1]` (the right edge of what's actually visible
// once the mobile map's edges are cropped; irrelevant on desktop, where nothing is cropped and
// safeX is just the full map). Then nudges any label down, one line at a time, until its
// (approximated) bounding box clears every label already placed. Processes points in the given
// order, so earlier entries never move for later ones.
function layoutLabels(points: Positioned[], style: MarkerStyle, safeX: [number, number]): Labelled[] {
  const placed: { left: number; right: number; top: number; bottom: number }[] = [];
  return points.map((point) => {
    const width = point.country.name.length * style.charWidth;
    const startRight = point.x + point.radius + style.gap + width;
    const anchor: "start" | "end" = startRight > safeX[1] ? "end" : "start";
    const labelX = anchor === "start" ? point.x + point.radius + style.gap : point.x - point.radius - style.gap;
    const left = anchor === "start" ? labelX : labelX - width;
    const right = left + width;
    let labelY = point.y + style.fontSize / 3;
    for (;;) {
      const top = labelY - style.fontSize * 0.8;
      const bottom = labelY + style.fontSize * 0.3;
      const overlapsPlaced = placed.some(
        (box) => !(right < box.left || left > box.right || bottom < box.top || top > box.bottom),
      );
      if (!overlapsPlaced) {
        placed.push({ left, right, top, bottom });
        return { ...point, labelX, labelY, anchor };
      }
      labelY += style.lineHeight;
    }
  });
}

// SSR/first paint always assumes desktop sizing (matches the server's guess, since there's no
// viewport to check yet) and upgrades to mobile sizing on mount if narrower than the `lg`
// breakpoint — the same 1024px cutoff the rest of the app's mobile/desktop nav split uses.
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    setIsMobile(query.matches);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

export function CountryExplorer({ countries, initialCode }: { countries: CountryEntry[]; initialCode?: string }) {
  const [selected, setSelected] = useState<CountryEntry | null>(
    countries.find((country) => country.code === initialCode) ?? null,
  );
  const isMobile = useIsMobile();
  const style = isMobile ? MOBILE_MARKER : DESKTOP_MARKER;

  const countryByCode = useMemo(() => new Map(countries.map((country) => [country.code, country])), [countries]);

  const labelled = useMemo(() => {
    const positioned = countries
      .filter((country): country is CountryEntry & { latitude: number; longitude: number } =>
        country.latitude != null && country.longitude != null,
      )
      .map((country) => {
        const { x, y } = project(country.latitude, country.longitude);
        const radius = style.baseRadius + Math.min(style.maxRadiusBonus, country.universityCount * style.radiusPerUniversity);
        return { country, x, y, radius };
      });
    return layoutLabels(positioned, style, isMobile ? MOBILE_SAFE_X : DESKTOP_SAFE_X);
  }, [countries, style, isMobile]);

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
      {/* The map is 2:1 (viewBox 1000×500). On desktop the box stays exactly that shape
          (aspect-[2/1] matches the viewBox exactly), so preserveAspectRatio="slice" behaves
          identically to the default "meet" there — no crop, no letterbox, pixel-identical to
          the old plain h-auto sizing.
          Below `lg` the box is deliberately taller than 2:1 (aspect-[17/10]), so the map gets
          real extra vertical room instead of the flat, barely-tappable strip a pure width-driven
          2:1 box gives on a narrow screen. Given a taller box than its own content, "slice" zooms
          in to fill it completely rather than leaving empty bars top and bottom — the trade-off
          is cropping the left/right edges instead. Cropping vertically (trimming the poles) was
          the other option, but it doesn't actually buy height: for a fixed width it only ever
          shortens the box further, since latitude and longitude share one uniform scale. Cropping
          longitude is also the safer axis here — this ratio loses about 30° off each side, which
          every seeded marker's *dot* clears, Japan (closest, at 138°E) with a ~10° margin. Its
          label text doesn't fit in that margin, though — labelled below handles that by flipping
          a label to the left of its marker instead of the right, whenever the right-hand version
          would run past the visible edge. */}
      <div className="panel aspect-[17/10] overflow-hidden lg:aspect-[2/1]">
        {/* Not role="img": the shapes and markers below are real controls, and labelling the
            whole svg as a single image would flatten them out of the accessibility tree. The
            decorative ground (fill, muted countries, grid) is hidden from assistive tech
            instead, and each highlighted country carries its own name. */}
        <svg
          viewBox="0 0 1000 500"
          preserveAspectRatio="xMidYMid slice"
          className="h-full w-full"
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

          {labelled.map(({ country, x, y, radius, labelX, labelY, anchor }) => {
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
                <circle cx={x} cy={y} r={style.dotRadius} fill={active ? "#0b1f29" : "#17635a"} aria-hidden="true" />
                <text x={labelX} y={labelY} textAnchor={anchor} fontSize={style.fontSize} fill="#47606b" aria-hidden="true">
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
