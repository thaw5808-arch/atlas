import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { ProposeChangeForm } from "@/components/governance-forms";
import { SectionHeading, VerificationBadge } from "@/components/ui";

// This page re-checks the role itself rather than relying on a layout gate,
// since a layout above it would not re-run on client-side navigation between
// sibling routes.
export default async function PortalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/portal");
  if (user.role === "STUDENT") redirect("/dashboard");

  const representative = await prisma.universityRepresentative.findUnique({
    where: { userId: user.id },
    include: {
      university: {
        include: { tuitionRecords: true, livingCostRecords: true, country: true },
      },
    },
  });

  if (!representative) redirect("/portal/claim");

  const requests = await prisma.correctionRequest.findMany({
    where: { reportedById: user.id },
    orderBy: { createdAt: "desc" },
  });

  const records = [
    ...representative.university.tuitionRecords.flatMap((record) => [
      {
        entityType: "TuitionRecord",
        entityId: record.id,
        field: "tuitionPerYear",
        label: `Tuition ${record.academicYear}`,
        current: formatMoney(record.tuitionPerYear, record.currency),
      },
      {
        entityType: "TuitionRecord",
        entityId: record.id,
        field: "admissionFee",
        label: `Admission fee ${record.academicYear}`,
        current: formatMoney(record.admissionFee, record.currency),
      },
    ]),
    ...representative.university.livingCostRecords.map((record) => ({
      entityType: "LivingCostRecord",
      entityId: record.id,
      field: "housingPerMonth",
      label: `Housing (${record.housingType.replace(/_/g, " ").toLowerCase()})`,
      current: formatMoney(record.housingPerMonth, record.currency),
    })),
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl">{representative.university.name}</h1>
        <p className="mt-2 text-sm text-slate">
          {representative.jobTitle} · {representative.workEmail} ·{" "}
          <span className={representative.status === "VERIFIED" ? "text-viridian" : "text-brass"}>
            {representative.status.toLowerCase()}
          </span>
        </p>
      </header>

      {representative.status !== "VERIFIED" ? (
        <p className="panel p-5 text-sm text-slate">
          Your claim is waiting on verification. You'll be able to propose updates once an
          administrator confirms your affiliation.
        </p>
      ) : (
        <section>
          <SectionHeading
            title="Propose an update"
            description="Changes enter an approval queue with your evidence attached, and are logged against your account."
          />
          <div className="panel max-w-xl p-5">
            <ProposeChangeForm universityId={representative.universityId} records={records} />
          </div>
        </section>
      )}

      <section>
        <SectionHeading title="Current records" />
        <div className="panel divide-y divide-[color:var(--color-line)]">
          {representative.university.tuitionRecords.map((record) => (
            <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
              <span>Tuition {record.academicYear}</span>
              <span className="flex items-center gap-3">
                <span className="tabular">{formatMoney(record.tuitionPerYear, record.currency)}</span>
                <VerificationBadge status={record.verification} lastVerifiedAt={record.lastVerifiedAt} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {requests.length > 0 && (
        <section>
          <SectionHeading title="Your submissions" />
          <div className="panel divide-y divide-[color:var(--color-line)]">
            {requests.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <span>
                  {request.entityType}.{request.field} → {request.claimedValue}
                </span>
                <span className="text-xs text-slate">
                  {request.status.toLowerCase()} · {formatDate(request.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
