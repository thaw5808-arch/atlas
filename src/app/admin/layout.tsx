import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { getCurrentUser } from "@/lib/session";

// Every admin page re-checks the role itself: this layout does not re-run when
// navigating between sibling admin routes.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Administration</h1>
        <AdminNav />
      </header>
      {children}
    </div>
  );
}
