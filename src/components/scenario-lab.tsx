"use client";

import { useId, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { computeScenario, WHAT_IF_PRESETS, type ScenarioInput, type WorkAssumptionCode } from "@/lib/costs";
import type { ScenarioOption } from "@/lib/recommendations";
import { formatMoney } from "@/lib/money";

type HousingKey = "ON_CAMPUS" | "SHARED_OFF_CAMPUS" | "PRIVATE_OFF_CAMPUS";

const HOUSING_LABEL: Record<HousingKey, string> = {
  ON_CAMPUS: "University housing",
  SHARED_OFF_CAMPUS: "Shared flat",
  PRIVATE_OFF_CAMPUS: "Private rental",
};

const WORK_LABEL: Record<WorkAssumptionCode, string> = {
  NONE: "No work",
  CONSERVATIVE: "Half the permitted hours",
  PERMITTED_MAX: "Full permitted hours",
};

export function ScenarioLab({
  options,
  currency,
  funding,
}: {
  options: ScenarioOption[];
  currency: string;
  funding: { annualFamilyBudget: number; savings: number; expectedSupport: number };
}) {
  const [optionIndex, setOptionIndex] = useState(0);
  const [housing, setHousing] = useState<HousingKey>("SHARED_OFF_CAMPUS");
  const [work, setWork] = useState<WorkAssumptionCode>("NONE");
  const [roommates, setRoommates] = useState(0);
  const [rent, setRent] = useState(1);
  const [tuitionShift, setTuitionShift] = useState(1);
  const [fx, setFx] = useState(1);
  const [scholarshipPercent, setScholarshipPercent] = useState(0);
  const [flights, setFlights] = useState(2);
  const [flightCost, setFlightCost] = useState(600);
  const [buffer, setBuffer] = useState(2);
  const [saved, setSaved] = useState<{ name: string; annual: number; gap: number }[]>([]);

  const option = options[optionIndex];

  const input: ScenarioInput | null = useMemo(() => {
    if (!option) return null;
    const living =
      option.housing[housing] ??
      option.housing.SHARED_OFF_CAMPUS ??
      option.housing.ON_CAMPUS ??
      option.housing.PRIVATE_OFF_CAMPUS;
    if (!living) return null;

    return {
      currency,
      durationYears: option.durationYears,
      tuitionPerYear: option.tuitionPerYear,
      admissionFee: option.admissionFee,
      otherAcademicFees: option.otherAcademicFees,
      living,
      flightsPerYear: flights,
      flightCost,
      emergencyBufferMonths: buffer,
      rentMultiplier: rent,
      tuitionMultiplier: tuitionShift,
      fxMultiplier: fx,
      roommateCount: roommates,
      scholarshipPercent,
      scholarshipStipendPerYear: 0,
      workAssumption: work,
      work: option.work,
      funding,
    };
  }, [option, housing, currency, flights, flightCost, buffer, rent, tuitionShift, fx, roommates, scholarshipPercent, work, funding]);

  const result = useMemo(() => (input ? computeScenario(input) : null), [input]);

  const whatIf = useMemo(() => {
    if (!input || !result) return [];
    return WHAT_IF_PRESETS.map((preset) => {
      const alternative = computeScenario(preset.apply(input));
      return {
        id: preset.id,
        label: preset.label,
        annual: alternative.annualCost,
        gap: alternative.annualGap,
        gapDelta: alternative.annualGap - result.annualGap,
      };
    });
  }, [input, result]);

  if (!option || !result || !input) {
    return <p className="panel p-5 text-sm text-slate">No cost records are loaded yet.</p>;
  }

  const chartData = result.costLines
    .filter((line) => line.amountPerYear > 0)
    .map((line) => ({ name: line.label, value: Math.round(line.amountPerYear) }));

  const gapWithWork = result.annualGapWithWork;

  return (
    <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
      <div className="glass h-fit rounded-[26px] p-5">
        <label className="label" htmlFor="scenario-university">
          University
        </label>
        <select
          id="scenario-university"
          className="input"
          value={optionIndex}
          onChange={(event) => setOptionIndex(Number(event.target.value))}
        >
          {options.map((entry, index) => (
            <option key={entry.slug} value={index}>
              {entry.name} — {entry.countryName}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-mist">
          {option.programName} · {option.durationYears} years
        </p>

        <div className="mt-4">
          <p className="label" id="housing-label">
            Where you live
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="housing-label">
            {(Object.keys(HOUSING_LABEL) as HousingKey[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={housing === key}
                disabled={!option.housing[key]}
                onClick={() => setHousing(key)}
                className={housing === key ? "chip chip-selected" : "chip"}
              >
                {HOUSING_LABEL[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="label" id="work-label">
            Part-time work assumption
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="work-label">
            {(Object.keys(WORK_LABEL) as WorkAssumptionCode[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={work === key}
                onClick={() => setWork(key)}
                className={work === key ? "chip chip-selected" : "chip"}
              >
                {WORK_LABEL[key]}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-mist">
            {option.work.permittedHoursPerWeek > 0
              ? `Local rules allow about ${option.work.permittedHoursPerWeek} hrs/week in term. Modelled income is an estimate, never guaranteed funding.`
              : "No permitted working hours recorded for this country."}
          </p>
        </div>

        <Slider label="Roommates sharing rent" value={roommates} min={0} max={3} step={1} onChange={setRoommates} display={`${roommates}`} />
        <Slider label="Rent change" value={rent} min={0.7} max={1.5} step={0.05} onChange={setRent} display={`${Math.round((rent - 1) * 100)}%`} />
        <Slider label="Tuition change" value={tuitionShift} min={0.9} max={1.3} step={0.01} onChange={setTuitionShift} display={`${Math.round((tuitionShift - 1) * 100)}%`} />
        <Slider label="Exchange rate shift" value={fx} min={0.8} max={1.3} step={0.01} onChange={setFx} display={`${Math.round((fx - 1) * 100)}%`} />
        <Slider label="Scholarship on tuition" value={scholarshipPercent} min={0} max={100} step={5} onChange={setScholarshipPercent} display={`${scholarshipPercent}%`} />
        <Slider label="Flights home per year" value={flights} min={0} max={4} step={1} onChange={setFlights} display={`${flights}`} />
        <Slider label="Cost per flight" value={flightCost} min={0} max={2500} step={50} onChange={setFlightCost} display={formatMoney(flightCost, currency)} />
        <Slider label="Emergency reserve" value={buffer} min={0} max={6} step={0.5} onChange={setBuffer} display={`${buffer} months`} />

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() =>
              setSaved((current) => [
                ...current,
                { name: `${option.name} · ${HOUSING_LABEL[housing]}`, annual: result.annualCost, gap: result.annualGap },
              ])
            }
          >
            <Plus size={14} /> Keep this scenario
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setRent(1);
              setTuitionShift(1);
              setFx(1);
              setRoommates(0);
              setScholarshipPercent(0);
              setWork("NONE");
            }}
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <Figure label="Monthly requirement" value={formatMoney(result.monthlyCost, currency)} />
          <Figure label="Annual requirement" value={formatMoney(result.annualCost, currency)} />
          <Figure label="Total degree cost" value={formatMoney(result.totalDegreeCost, currency)} />
          <Figure
            label="Projected annual gap"
            value={formatMoney(Math.max(0, result.annualGap), currency)}
            tone={result.annualGap > 0 ? "negative" : "positive"}
            note={
              work !== "NONE"
                ? `${formatMoney(Math.max(0, gapWithWork), currency)} if the work estimate holds`
                : undefined
            }
          />
        </div>

        <div className="panel p-5">
          <h3 className="text-base">Where the money goes each year</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="rgba(11,31,41,0.08)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#47606b" }} tickFormatter={(value) => formatMoney(value, currency, { compact: true })} />
                <YAxis type="category" dataKey="name" width={132} tick={{ fontSize: 11, fill: "#47606b" }} />
                <Tooltip
                  cursor={{ fill: "rgba(11,31,41,0.04)" }}
                  formatter={(value: number) => formatMoney(value, currency)}
                  contentStyle={{ borderRadius: 12, border: "1px solid rgba(11,31,41,0.12)", fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        ["Tuition", "Admission fee", "Other academic fees"].includes(entry.name)
                          ? "#17635a"
                          : entry.name === "Emergency reserve"
                            ? "#b1801f"
                            : "#3f6a76"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="text-base">What if…</h3>
          <p className="mt-1 text-sm text-slate">
            Each row re-runs the same model with one assumption changed.
          </p>
          <ul className="mt-4 divide-y divide-[color:var(--color-line)]">
            {whatIf.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                <span>{row.label}</span>
                <span className="tabular flex items-center gap-4">
                  <span className="text-slate">{formatMoney(row.annual, currency)} / year</span>
                  <span style={{ color: row.gapDelta > 0 ? "var(--color-rust)" : "var(--color-viridian)" }}>
                    {row.gapDelta > 0 ? "+" : ""}
                    {formatMoney(row.gapDelta, currency)} gap
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel p-5">
          <h3 className="text-base">Funding against cost</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {result.fundingLines.map((line) => (
              <li key={line.key} className="flex flex-wrap items-baseline justify-between gap-2">
                <span>
                  {line.label}
                  {!line.guaranteed && <span className="ml-2 text-xs text-brass">not guaranteed</span>}
                  {line.note && <span className="ml-2 text-xs text-mist">{line.note}</span>}
                </span>
                <span className="tabular">{formatMoney(line.amountPerYear, currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-line pt-3 text-sm">
            <div className="flex items-baseline justify-between">
              <span>Total cost per year</span>
              <span className="tabular">{formatMoney(result.annualCost, currency)}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between font-medium">
              <span>Shortfall to close</span>
              <span
                className="tabular"
                style={{ color: result.annualGap > 0 ? "var(--color-rust)" : "var(--color-viridian)" }}
              >
                {formatMoney(Math.max(0, result.annualGap), currency)}
              </span>
            </div>
          </div>
        </div>

        {saved.length > 0 && (
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base">Kept scenarios</h3>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSaved([])}>
                <Trash2 size={14} /> Clear
              </button>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={saved} margin={{ left: 4, right: 8 }}>
                  <CartesianGrid vertical={false} stroke="rgba(11,31,41,0.08)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#47606b" }} interval={0} height={48} />
                  <YAxis tick={{ fontSize: 11, fill: "#47606b" }} tickFormatter={(value) => formatMoney(value, currency, { compact: true })} />
                  <Tooltip formatter={(value: number) => formatMoney(value, currency)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar name="Annual cost" dataKey="annual" fill="#17635a" radius={[6, 6, 0, 0]} />
                  <Bar name="Annual gap" dataKey="gap" fill="#a03c28" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  display: string;
}) {
  const id = useId();
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between">
        <label className="label mb-0" htmlFor={id}>
          {label}
        </label>
        <span className="tabular text-xs text-slate">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        className="mt-1.5 w-full accent-[var(--color-viridian)]"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function Figure({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="panel p-4">
      <p className="text-xs text-slate">{label}</p>
      <p
        className="tabular mt-1 font-display text-xl"
        style={{
          color:
            tone === "negative"
              ? "var(--color-rust)"
              : tone === "positive"
                ? "var(--color-viridian)"
                : undefined,
        }}
      >
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-mist">{note}</p>}
    </div>
  );
}
