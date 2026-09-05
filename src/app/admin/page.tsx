import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { Stat } from "@/components/ui";

export default async function AdminOverviewPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const [universities, countries, scholarships, students, openCorrections, pendingReps, unverified, audit] =
    await Promise.all([
      prisma.university.count(),
      prisma.country.count(),
      prisma.scholarship.count(),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.correctionRequest.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
      prisma.universityRepresentative.count({ where: { status: "PENDING" } }),
      prisma.tuitionRecord.count({ where: { verification: "NEEDS_REVIEW" } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { actor: { select: { name: true } } },
      }),
    ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Universities" value={`${universities}`} sub={`${countries} countries`} />
        <Stat label="Scholarships" value={`${scholarships}`} />
        <Stat label="Students" value={`${students}`} />
        <Stat
          label="Waiting on you"
          value={`${openCorrections + pendingReps}`}
          sub={`${openCorrections} corrections · ${pendingReps} claims`}
          tone={openCorrections + pendingReps > 0 ? "negative" : "positive"}
        />
      </div>

      <div className="panel p-5">
        <h2 className="text-lg">Data health</h2>
        <p className="mt-2 text-sm text-slate">
          {unverified} tuition records are still marked as needing review. Verified figures are the
          only ones students should rely on.
        </p>
      </div>

      <div className="panel">
        <h2 className="px-5 pt-5 text-lg">Audit trail</h2>
        <div className="mt-3 divide-y divide-[color:var(--color-line)]">
          {audit.length === 0 && <p className="px-5 py-4 text-sm text-slate">No changes recorded yet.</p>}
          {audit.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
              <span>
                <span className="text-slate">{entry.actor?.name ?? "System"}</span> {entry.action}d{" "}
                {entry.entityType}
                {entry.field ? ` · ${entry.field}` : ""}
              </span>
              <span className="text-xs text-mist">
                {entry.previousValue != null && entry.newValue != null
                  ? `${entry.previousValue} → ${entry.newValue} · `
                  : ""}
                {formatDate(entry.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
