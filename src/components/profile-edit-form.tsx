"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { type OnboardingPayload, saveOnboarding } from "@/lib/actions/profile";
import { CURRENCIES } from "@/lib/money";
import {
  DEGREES,
  EDUCATION,
  ENVIRONMENTS,
  Field,
  INTAKES,
  Pills,
  TESTS,
} from "@/components/onboarding-wizard";
import { buildFormState, sanitizeNumericText, toPayload, type OnboardingFormState } from "@/lib/onboarding-form";
import { SectionHeading } from "@/components/ui";

export function ProfileEditForm({
  countries,
  majors,
  initial,
}: {
  countries: { code: string; name: string }[];
  majors: { id: string; name: string; field: string }[];
  initial: Partial<OnboardingPayload>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<OnboardingFormState>(() => buildFormState(initial));

  const patch = (values: Partial<OnboardingFormState>) => setForm((current) => ({ ...current, ...values }));

  const toggleCountry = (code: string) => {
    const current = form.preferredCountries;
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
      else router.push("/profile");
    });
  };

  return (
    <div className="space-y-8">
      <section>
        <SectionHeading title="Education" description="Where you are studying now" />
        <div className="panel space-y-5 p-5 sm:p-6">
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
        </div>
      </section>

      <section>
        <SectionHeading title="Study plans" description="What and where you want to study" />
        <div className="panel space-y-5 p-5 sm:p-6">
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
                    aria-pressed={selected}
                    onClick={() => toggleCountry(country.code)}
                    className={selected ? "chip chip-selected" : "chip"}
                  >
                    {selected && <Check size={12} aria-hidden="true" />}
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
        </div>
      </section>

      <section>
        <SectionHeading title="Academic results" description="Grades and language tests" />
        <div className="panel space-y-5 p-5 sm:p-6">
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
            <p className="label" id="languages-label">
              Language qualifications you already hold
            </p>
            <div className="space-y-2" role="group" aria-labelledby="languages-label">
              {TESTS.map((test) => (
                <div key={test.value} className="grid grid-cols-[1fr_8rem] items-center gap-3">
                  <label htmlFor={`language-${test.value}`} className="text-sm">
                    {test.label}
                  </label>
                  <input
                    id={`language-${test.value}`}
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
        </div>
      </section>

      <section>
        <SectionHeading title="Budget" description="What you can realistically fund" />
        <div className="panel space-y-5 p-5 sm:p-6">
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
        </div>
      </section>

      <section>
        <SectionHeading title="Work and career" description="Where this degree is taking you" />
        <div className="panel space-y-5 p-5 sm:p-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.willingToWorkPartTime ?? false}
              onChange={(event) => patch({ willingToWorkPartTime: event.target.checked })}
            />
            I am willing to work part-time during term, where the visa allows it
          </label>
          <p className="text-xs text-mist">
            Any earnings are modelled as a scenario. ATLAS never counts them as funding you can rely
            on.
          </p>
          <Field label="What do you want this degree to lead to?" optional>
            <textarea
              className="input min-h-24"
              placeholder="Backend engineering at a games studio in Japan"
              value={form.careerGoal ?? ""}
              onChange={(event) => patch({ careerGoal: event.target.value })}
            />
          </Field>
        </div>
      </section>

      {error && <p className="rounded-lg bg-rust-soft px-3 py-2 text-sm text-rust">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <Link href="/profile" className="btn">
          Cancel
        </Link>
        <button type="button" className="btn btn-accent" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
