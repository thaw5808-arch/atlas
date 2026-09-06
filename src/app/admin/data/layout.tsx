import { AdminDataNav } from "@/components/admin-data-nav";

// Tuition, living costs, scholarships and users are all "data records" in
// the same sense — a table, verification where the model has it, and every
// change logged — so they share this tab strip rather than living behind
// separate top-level admin nav entries.
export default function AdminDataLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <AdminDataNav />
      {children}
    </div>
  );
}
