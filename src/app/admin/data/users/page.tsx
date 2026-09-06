import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatDate, titleCase } from "@/lib/format";
import { RoleSelect } from "@/components/governance-forms";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    take: 100,
  });

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-slate">
            <th className="px-5 py-3 font-medium">Name</th>
            <th className="px-3 py-3 font-medium">Email</th>
            <th className="px-3 py-3 font-medium">Joined</th>
            <th className="px-5 py-3 text-right font-medium">Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-0">
              <td className="px-5 py-3">{row.name}</td>
              <td className="px-3 py-3 text-xs text-slate">{row.email}</td>
              <td className="px-3 py-3 text-xs text-slate">{formatDate(row.createdAt)}</td>
              <td className="px-5 py-3">
                {row.id === user.id ? (
                  <p className="text-right text-xs text-mist">{titleCase(row.role)} · you</p>
                ) : (
                  <RoleSelect userId={row.id} role={row.role} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
