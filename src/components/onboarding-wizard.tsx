"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { type OnboardingPayload, saveOnboarding } from "@/lib/actions/profile";
import { CURRENCIES } from "@/lib/money";
import { IMPORTANCE_WEIGHT, type Importance } from "@/lib/decision";
import { buildFormState, sanitizeNumericText, toPayload, type OnboardingFormState } from "@/lib/onboarding-form";

export type Option = { value: string; label: string };

export const EDUCATION: Option[] = [
  { value: "HIGH_SCHOOL", label: "High school" },
  { value: "FOUNDATION", label: "Foundation year" },
  { value: "DIPLOMA", label: "Diploma" },
  { value: "BACHELOR", label: "Bachelor's" },
  { value: "MASTER", label: "Master's" },
  { value: "DOCTORATE", label: "Doctorate" },
];

export const DEGREES: Option[] = EDUCATION.filter((option) => option.value !== "HIGH_SCHOOL");

export const INTAKES: Option[] = [
  { value: "SPRING", label: "Spring" },
  { value: "SUMMER", label: "Summer" },
  { value: "AUTUMN", label: "Autumn" },
  { value: "WINTER", label: "Winter" },
  { value: "ROLLING", label: "Any / rolling" },
];

export const ENVIRONMENTS: Option[] = [
  { value: "MAJOR_METRO", label: "Large city" },
  { value: "MID_SIZED_CITY", label: "Mid-sized city" },
  { value: "UNIVERSITY_TOWN", label: "University town" },
  { value: "NO_PREFERENCE", label: "No preference" },
];

export const TESTS: { value: string; label: string; kind: "score" | "band"; hint: string }[] = [
  { value: "IELTS", label: "IELTS", kind: "score", hint: "e.g. 6.5" },
  { value: "TOEFL_IBT", label: "TOEFL iBT", kind: "score", hint: "e.g. 88" },
  { value: "DUOLINGO", label: "Duolingo English Test", kind: "score", hint: "e.g. 115" },
  { value: "JLPT", label: "JLPT", kind: "band", hint: "N1 – N5" },
  { value: "TOPIK", label: "TOPIK", kind: "band", hint: "1 – 6" },
  { value: "DELF", label: "DELF/DALF", kind: "band", hint: "A1 – C2" },
];

const IMPORTANCE_OPTIONS: Importance[] = ["LOW", "MEDIUM", "HIGH", "VERY_HIGH"];
const IMPORTANCE_LABEL: Record<Importance, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  VERY_HIGH: "Very high",
};

const STEPS = [
  { title: "About you", note: "Where you are studying now" },
  { title: "Study plans", note: "What and where you want to study" },
  { title: "Academic results", note: "Grades and language tests" },
  { title: "Budget", note: "What you can realistically fund" },
  { title: "Work and career", note: "Where this degree is taking you" },
  { title: "Priorities", note: "How to weigh your matches" },
];

export function OnboardingWizard({
  countries,
  majors,
  initial,
}: {
  countries: { code: string; name: string }[];
  majors: { id: string; name: string; field: string }[];
  initial: Partial<OnboardingPayload>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<OnboardingFormState>(() => {
    const base = buildFormState(initial);
    return {
      ...base,
      weights: base.weights ?? {
        financial: "VERY_HIGH",
        academic: "HIGH",
        language: "HIGH",
        location: "MEDIUM",
        scholarship: "HIGH",
        career: "MEDIUM",
        ranking: "LOW",
      },
    };
  });

  const patch = (values: Partial<OnboardingFormState>) => setForm((current) => ({ ...current, ...values }));

  const toggleCountry = (code: string) => {
    const current = form.preferredCountries ?? [];
    patch({
      preferredCountries: current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code],
    });
  };

  const setLanguage = (test: string, patchValue: { score?: string; band?: string | null }) => {
    const current = form.languages;
    const existing = current.find((entry) => entry.test === test);
    const next = existing
      ? current.map((entry) => (entry.test === test ? { ...entry, ...patchValue } : entry))
      : [...current, { test, score: "", band: null, ...patchValue }];
    patch({
      languages: next.filter((entry) => entry.score.trim().length > 0 || (entry.band ?? "").trim().length > 0),
    });
  };

  const languageValue = (test: string) => form.languages.find((entry) => entry.test === test);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveOnboarding(toPayload(form));
      if (result.error) setError(result.error);
      else router.push("/dashboard");
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="h-1 flex-1 rounded-full bg-parchment">
          <div
            className="h-full rounded-full bg-viridian transition-[width] duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <span className="tabular text-xs text-mist">
          {step + 1} of {STEPS.length}
        </span>
      </div>

      <h1 className="text-3xl">{STEPS[step].title}</h1>
      <p className="mt-1 text-sm text-slate">{STEPS[step].note}</p>

      <div className="panel mt-6 space-y-5 p-5 sm:p-6">
        {step === 0 && (
          <>
            <Field label="Country you live in now">
              <select
                className="input"
                value={form.currentCountryCode ?? ""}
                onChange={(event) => patch({ currentCountryCode: event.target.value || null })}
              >
                <option value="">Select a country</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nationality on your passport">
              <select
                className="input"
                value={form.nationalityCode ?? ""}
                onChange={(event) => patch({ nationalityCode: event.target.value || null })}
              >
                <option value="">Select a nationality</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Education level you have completed or are completing">
              <Pills
                options={EDUCATION}
                value={form.currentEducationLevel ?? null}
                onChange={(value) => patch({ currentEducationLevel: value as never })}
              />
            </Field>
            <Field label="Current school or university" optional>
              <input
                className="input"
                value={form.currentInstitution ?? ""}
                onChange={(event) => patch({ currentInstitution: event.target.value })}
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Degree you want to study">
              <Pills
                options={DEGREES}
                value={form.desiredDegree ?? null}
                onChange={(value) => patch({ desiredDegree: value as never })}
              />
            </Field>
            <Field label="Subject">
              <select
                className="input"
                value={form.desiredMajorId ?? ""}
                onChange={(event) => patch({ desiredMajorId: event.target.value || null })}
              >
                <option value="">Select a subject</option>
                {majors.map((major) => (
                  <option key={major.id} value={major.id}>
                    {major.name} — {major.field}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Countries you would consider" optional>
              <div className="flex flex-wrap gap-2">
                {countries.map((country) => {
                  const selected = (form.preferredCountries ?? []).includes(country.code);
                  return (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => toggleCountry(country.code)}
                      className={selected ? "chip chip-selected" : "chip"}
                    >
                      {selected && <Check size={12} />}
                      {country.name}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Preferred intake" optional>
                <Pills
                  options={INTAKES}
                  value={form.preferredIntake ?? null}
                  onChange={(value) => patch({ preferredIntake: value as never })}
                />
              </Field>
              <Field label="City you would rather live in">
                <Pills
                  options={ENVIRONMENTS}
                  value={form.preferredEnvironment ?? "NO_PREFERENCE"}
                  onChange={(value) => patch({ preferredEnvironment: value as never })}
                />
              </Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
              <Field label="Current GPA or grade average">
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="3.45"
                  value={form.gpa}
                  onChange={(event) => patch({ gpa: sanitizeNumericText(event.target.value) })}
                />
              </Field>
              <Field label="Out of">
                <input
                  className="input"
                  inputMode="decimal"
                  value={form.gpaScale}
                  onChange={(event) => patch({ gpaScale: sanitizeNumericText(event.target.value) })}
                />
              </Field>
            </div>

            <div>
              <p className="label">Language qualifications you already hold</p>
              <div className="space-y-2">
                {TESTS.map((test) => (
                  <div key={test.value} className="grid grid-cols-[1fr_8rem] items-center gap-3">
                    <span className="text-sm">{test.label}</span>
                    <input
                      className="input"
                      placeholder={test.hint}
                      value={
                        (test.kind === "score"
                          ? languageValue(test.value)?.score
                          : languageValue(test.value)?.band) ?? ""
                      }
                      onChange={(event) =>
                        setLanguage(
                          test.value,
                          test.kind === "score"
                            ? { score: sanitizeNumericText(event.target.value) }
                            : { band: event.target.value.toUpperCase() || null },
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-mist">
                Leave a row empty if you haven't taken it. Planned tests can be added later.
              </p>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <Field label="Currency you budget in">
              <select
                className="input"
                value={form.budgetCurrency}
                onChange={(event) => patch({ budgetCurrency: event.target.value })}
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Family budget per year">
                <input
                  className="input"
                  inputMode="numeric"
                  value={form.annualFamilyBudget}
                  onChange={(event) => patch({ annualFamilyBudget: sanitizeNumericText(event.target.value) })}
                />
              </Field>
              <Field label="Savings available in total">
                <input
                  className="input"
                  inputMode="numeric"
                  value={form.availableSavings}
                  onChange={(event) => patch({ availableSavings: sanitizeNumericText(event.target.value) })}
                />
              </Field>
              <Field label="Other support per year" optional>
                <input
                  className="input"
                  inputMode="numeric"
                  value={form.expectedSupport}
                  onChange={(event) => patch({ expectedSupport: sanitizeNumericText(event.target.value) })}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Most you would pay in tuition per year" optional>
                <input
                  className="input"
                  inputMode="numeric"
                  value={form.maxTuitionPerYear}
                  onChange={(event) => patch({ maxTuitionPerYear: sanitizeNumericText(event.target.value) })}
                />
              </Field>
              <Field label="Most you would spend on living costs per year" optional>
                <input
                  className="input"
                  inputMode="numeric"
                  value={form.maxLivingCostPerYear}
                  onChange={(event) => patch({ maxLivingCostPerYear: sanitizeNumericText(event.target.value) })}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.scholarshipRequired}
                onChange={(event) => patch({ scholarshipRequired: event.target.checked })}
              />
              I can only go if I receive a scholarship
            </label>
            {form.scholarshipRequired && (
              <Field label="Minimum share of costs an award must cover (%)">
                <input
                  className="input"
                  inputMode="numeric"
                  value={form.minScholarshipPercent}
                  onChange={(event) => patch({ minScholarshipPercent: sanitizeNumericText(event.target.value) })}
                />
              </Field>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.willingToWorkPartTime ?? false}
                onChange={(event) => patch({ willingToWorkPartTime: event.target.checked })}
              />
              I am willing to work part-time during term, where the visa allows it
            </label>
            <p className="text-xs text-mist">
              Any earnings are modelled as a scenario. ATLAS never counts them as funding you can
              rely on.
            </p>
            <Field label="What do you want this degree to lead to?" optional>
              <textarea
                className="input min-h-24"
                placeholder="Backend engineering at a games studio in Japan"
                value={form.careerGoal ?? ""}
                onChange={(event) => patch({ careerGoal: event.target.value })}
              />
            </Field>
          </>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <p className="text-sm text-slate">
              These weights decide how the six fit scores combine. You can change them at any time in
              the Decision Lab.
            </p>
            {(
              [
                ["financial", "Cost"],
                ["academic", "Academic fit"],
                ["language", "Language requirements"],
                ["location", "Location"],
                ["scholarship", "Scholarships"],
                ["career", "Career alignment"],
                ["ranking", "Ranking"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <span className="text-sm">{label}</span>
                <div className="flex gap-1">
                  {IMPORTANCE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        patch({
                          weights: {
                            ...(form.weights as NonNullable<OnboardingPayload["weights"]>),
                            [key]: option,
                          },
                        })
                      }
                      className={
                        form.weights?.[key] === option ? "chip chip-selected" : "chip"
                      }
                    >
                      {IMPORTANCE_LABEL[option]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-mist">
              A "very high" weight counts {IMPORTANCE_WEIGHT.VERY_HIGH / IMPORTANCE_WEIGHT.LOW} times
              as much as a "low" one.
            </p>
          </div>
        )}

        {error && <p className="rounded-lg bg-rust-soft px-3 py-2 text-sm text-rust">{error}</p>}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0}
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="flex items-center gap-2">
          {step < STEPS.length - 1 && (
            <button type="button" className="btn btn-ghost" onClick={() => setStep(step + 1)}>
              Skip this step
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={() => setStep(step + 1)}>
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" className="btn btn-accent" onClick={submit} disabled={pending}>
              {pending ? "Saving…" : "See my matches"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="label">
        {label}
        {optional && <span className="ml-1.5 font-normal text-mist">optional</span>}
      </span>
      {children}
    </div>
  );
}

export function Pills({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={value === option.value ? "chip chip-selected" : "chip"}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
