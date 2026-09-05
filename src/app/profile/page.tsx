import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { logout } from "@/lib/actions/auth";
import { getRateTable } from "@/lib/recommendations";
import { formatMoney } from "@/lib/money";
import { formatDate, titleCase } from "@/lib/format";
import { CurrencyPicker } from "@/components/currency-picker";
import { SectionHeading } from "@/components/ui";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/profile");

  const [profile, rates] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: { languageQualifications: true, desiredMajor: true },
    }),
    getRateTable(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-3xl">{user.name}</h1>
        <p className="mt-2 text-sm text-slate">
          {user.email} · {titleCase(user.role)}
        </p>
      </header>

      <section>
        <SectionHeading title="Currency" description="Costs are converted from the currency each record was collected in." />
        <div className="panel p-5">
          <CurrencyPicker current={user.preferredCurrency} />
          <p className="mt-3 text-xs text-mist">
            Rates last updated {formatDate(rates.fetchedAt)}. Converted figures are estimates and move
            with the market.
          </p>
        </div>
      </section>

      <section>
        <SectionHeading
          title="Your profile"
          action={
            <Link href="/onboarding" className="btn btn-sm">
              Edit
            </Link>
          }
        />
        <dl className="panel divide-y divide-[color:var(--color-line)]">
          {[
            ["Studying now", profile?.currentEducationLevel ? titleCase(profile.currentEducationLevel) : "Not set"],
            ["Target degree", profile?.desiredDegree ? titleCase(profile.desiredDegree) : "Not set"],
            ["Subject", profile?.desiredMajor?.name ?? "Not set"],
            ["Preferred countries", profile?.preferredCountries.join(", ") || "Any"],
            ["GPA", profile?.gpa ? `${profile.gpa} / ${profile.gpaScale ?? 4}` : "Not set"],
            [
              "Language results",
              profile?.languageQualifications.length
                ? profile.languageQualifications
                    .map((q) => `${q.test.replace("_", " ")} ${q.score ?? q.band ?? ""}`)
                    .join(" · ")
                : "None recorded",
            ],
            [
              "Budget per year",
              profile?.annualFamilyBudget != null
                ? formatMoney(profile.annualFamilyBudget, profile.budgetCurrency)
                : "Not set",
            ],
            ["Career goal", profile?.careerGoal ?? "Not set"],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-wrap justify-between gap-3 px-5 py-3 text-sm">
              <dt className="text-slate">{label}</dt>
              <dd className="text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-wrap gap-2">
        <Link href="/decision-lab" className="btn">
          Change your priorities
        </Link>
        <Link href="/portal/claim" className="btn">
          Representative portal
        </Link>
        <form action={logout}>
          <button type="submit" className="btn">
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
