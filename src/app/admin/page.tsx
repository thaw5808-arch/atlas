import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { Stat } from "@/components/ui";

// AuditLog.action is stored as the bare verb ("create", "verify", …) — this
// maps it to the past tense for display. A plain "+ d" reads fine for
// "reject" → "rejectd"... except it doesn't, and it mangles "verify" into
// "verifyd" outright, so known actions get an explicit form.
const PAST_TENSE: Record<string, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
  verify: "verified",
  approve: "approved",
  reject: "rejected",
  revoke: "revoked",
};

function describeAction(action: string): string {
  return PAST_TENSE[action] ?? `${action}ed`;
}

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

  // Rows about a User only carry its id in entityId — resolve those to a
  // name (or email) so "Priya Menon updated User · role" says whose role changed.
  const affectedUserIds = [...new Set(audit.filter((entry) => entry.entityType === "User").map((entry) => entry.entityId))];
  const affectedUsers = affectedUserIds.length
    ? await prisma.user.findMany({ where: { id: { in: affectedUserIds } }, select: { id: true, name: true, email: true } })
    : [];
  const affectedUserById = new Map(affectedUsers.map((row) => [row.id, row]));

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
          {audit.map((entry) => {
            const entityLabel =
              entry.entityType === "User"
                ? (affectedUserById.get(entry.entityId)?.name ??
                  affectedUserById.get(entry.entityId)?.email ??
                  "a deleted user")
                : entry.entityType;
            return (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <span>
                  <span className="text-slate">{entry.actor?.name ?? "System"}</span> {describeAction(entry.action)}{" "}
                  {entityLabel}
                  {entry.field ? ` · ${entry.field}` : ""}
                </span>
                <span className="text-xs text-mist">
                  {entry.previousValue != null && entry.newValue != null
                    ? `${entry.previousValue} → ${entry.newValue} · `
                    : ""}
                  {formatDate(entry.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
