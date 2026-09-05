import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { CorrectionDecision } from "@/components/governance-forms";
import { EmptyState } from "@/components/ui";

const APPLICABLE = new Set([
  "tuitionPerYear",
  "admissionFee",
  "otherAcademicFees",
  "housingPerMonth",
  "foodPerMonth",
  "transportPerMonth",
  "insurancePerMonth",
  "personalPerMonth",
  "booksPerYear",
  "visaFeesPerYear",
]);

export default async function CorrectionsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const requests = await prisma.correctionRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { university: true, reportedBy: { select: { name: true, email: true } } },
  });

  if (requests.length === 0) {
    return <EmptyState title="No corrections in the queue" body="Reports from students and university staff land here." />;
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <article key={request.id} className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base">
                {request.university.name} · {request.entityType}.{request.field}
              </h2>
              <p className="mt-1 text-xs text-slate">
                {request.reportedBy?.name ?? "Anonymous"} · {formatDate(request.createdAt)} ·{" "}
                {request.status.toLowerCase()}
              </p>
            </div>
            {(request.status === "OPEN" || request.status === "IN_REVIEW") && (
              <CorrectionDecision requestId={request.id} applicable={APPLICABLE.has(request.field ?? "")} />
            )}
          </div>
          <p className="mt-3 text-sm text-slate">{request.message}</p>
          <p className="mt-2 text-sm">
            Proposed value: <span className="tabular">{request.claimedValue}</span>
            {request.evidenceUrl && (
              <a href={request.evidenceUrl} target="_blank" rel="noreferrer" className="ml-2 link-underline text-sm">
                evidence
              </a>
            )}
          </p>
          {request.resolution && <p className="mt-2 text-xs text-mist">Resolution: {request.resolution}</p>}
        </article>
      ))}
    </div>
  );
}
