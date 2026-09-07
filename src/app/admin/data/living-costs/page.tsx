import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatMoney } from "@/lib/money";
import { formatDate, titleCase } from "@/lib/format";
import { VerifyButton } from "@/components/governance-forms";
import { VerificationBadge } from "@/components/ui";

export default async function AdminLivingCostsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const records = await prisma.livingCostRecord.findMany({
    orderBy: [{ verification: "asc" }, { collectedAt: "desc" }],
    include: { university: { select: { name: true } }, dataSource: true },
    take: 60,
  });

  return (
    <div className="panel overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-slate">
            <th scope="col" className="px-5 py-3 font-medium">University</th>
            <th scope="col" className="px-3 py-3 font-medium">Housing type</th>
            <th scope="col" className="px-3 py-3 text-right font-medium">Housing / mo</th>
            <th scope="col" className="px-3 py-3 font-medium">Source</th>
            <th scope="col" className="px-3 py-3 font-medium">Status</th>
            <th scope="col" className="px-5 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="border-b border-line last:border-0">
              <td className="px-5 py-3">{record.university.name}</td>
              <td className="px-3 py-3">{titleCase(record.housingType)}</td>
              <td className="px-3 py-3 text-right">{formatMoney(record.housingPerMonth, record.currency)}</td>
              <td className="px-3 py-3 text-xs text-slate">
                {record.dataSource?.label ?? "Not recorded"} · {formatDate(record.collectedAt)}
              </td>
              <td className="px-3 py-3">
                <VerificationBadge status={record.verification} lastVerifiedAt={record.lastVerifiedAt} />
              </td>
              <td className="px-5 py-3 text-right">
                <VerifyButton entityType="LivingCostRecord" entityId={record.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
