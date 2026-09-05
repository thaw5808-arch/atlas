import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ClaimForm } from "@/components/governance-forms";

// Open to any signed-in user, regardless of role — this is how a STUDENT
// becomes a REPRESENTATIVE in the first place, so it can't sit behind the
// role check that guards the rest of /portal.
export default async function ClaimPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/portal/claim");

  const universities = await prisma.university.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-3xl">Representative portal</h1>
      <p className="text-sm text-slate">
        Claim your university's profile to keep its tuition, requirements and deadlines accurate.
        Claims are verified by an administrator before any change goes live.
      </p>
      <div className="panel p-5">
        <ClaimForm universities={universities} />
      </div>
    </div>
  );
}
