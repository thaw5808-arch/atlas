import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { RepresentativeDecision } from "@/components/governance-forms";
import { EmptyState } from "@/components/ui";

export default async function RepresentativesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const representatives = await prisma.universityRepresentative.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } }, university: { select: { name: true } } },
  });

  if (representatives.length === 0) {
    return <EmptyState title="No claims yet" body="University staff can claim a profile from the representative portal." />;
  }

  return (
    <div className="panel divide-y divide-[color:var(--color-line)]">
      {representatives.map((representative) => (
        <div key={representative.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm">
              {representative.user.name} · {representative.university.name}
            </p>
            <p className="mt-0.5 text-xs text-slate">
              {representative.jobTitle ?? "No title given"} · {representative.workEmail} ·{" "}
              {formatDate(representative.createdAt)}
            </p>
          </div>
          {representative.status === "PENDING" ? (
            <RepresentativeDecision representativeId={representative.id} />
          ) : (
            <span className="chip">{representative.status.toLowerCase()}</span>
          )}
        </div>
      ))}
    </div>
  );
}
