import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatDate, titleCase } from "@/lib/format";
import { VerifyButton } from "@/components/governance-forms";
import { VerificationBadge } from "@/components/ui";

export default async function AdminScholarshipsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const scholarships = await prisma.scholarship.findMany({
    orderBy: [{ verification: "asc" }, { name: "asc" }],
    include: {
      university: { select: { name: true } },
      country: { select: { name: true } },
      dataSource: true,
    },
    take: 60,
  });

  return (
    <div className="panel overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-slate">
            <th scope="col" className="px-5 py-3 font-medium">Scholarship</th>
            <th scope="col" className="px-3 py-3 font-medium">Provider</th>
            <th scope="col" className="px-3 py-3 font-medium">Scope</th>
            <th scope="col" className="px-3 py-3 font-medium">Deadline</th>
            <th scope="col" className="px-3 py-3 font-medium">Source</th>
            <th scope="col" className="px-3 py-3 font-medium">Status</th>
            <th scope="col" className="px-5 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {scholarships.map((scholarship) => (
            <tr key={scholarship.id} className="border-b border-line last:border-0">
              <td className="px-5 py-3">{scholarship.name}</td>
              <td className="px-3 py-3">{titleCase(scholarship.provider)}</td>
              <td className="px-3 py-3 text-xs text-slate">
                {scholarship.university?.name ?? scholarship.country?.name ?? "Any"}
              </td>
              <td className="px-3 py-3 text-xs text-slate">
                {scholarship.deadline ? formatDate(scholarship.deadline) : "Not published"}
              </td>
              <td className="px-3 py-3 text-xs text-slate">{scholarship.dataSource?.label ?? "Not recorded"}</td>
              <td className="px-3 py-3">
                <VerificationBadge status={scholarship.verification} lastVerifiedAt={scholarship.lastVerifiedAt} />
              </td>
              <td className="px-5 py-3 text-right">
                <VerifyButton entityType="Scholarship" entityId={scholarship.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
