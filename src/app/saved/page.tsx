import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getStudentContext, buildCandidates } from "@/lib/recommendations";
import { UniversityCard } from "@/components/university-card";
import { EmptyState, SectionHeading } from "@/components/ui";

export default async function SavedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/saved");

  const context = await getStudentContext(user.id);
  const [saved, collections] = await Promise.all([
    prisma.savedUniversity.findMany({
      where: { userId: user.id },
      include: { university: true, collection: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.collection.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);

  const candidates = saved.length
    ? await buildCandidates(context, { slugs: saved.map((entry) => entry.university.slug) })
    : [];

  const grouped = collections.map((collection) => ({
    collection,
    slugs: saved.filter((entry) => entry.collectionId === collection.id).map((entry) => entry.university.slug),
  }));
  const unfiled = saved.filter((entry) => !entry.collectionId).map((entry) => entry.university.slug);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl">Saved</h1>
        <p className="mt-2 text-sm text-slate">
          {saved.length} universities across {collections.length} collections.
        </p>
      </header>

      {saved.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          body="Save a university from its profile to keep it here and compare it later."
          action={
            <Link href="/universities" className="btn btn-accent btn-sm">
              Browse universities
            </Link>
          }
        />
      ) : (
        <>
          {unfiled.length > 0 && (
            <section>
              <SectionHeading title="Not in a collection" />
              <div className="space-y-4">
                {candidates
                  .filter((candidate) => unfiled.includes(candidate.slug))
                  .map((candidate) => (
                    <UniversityCard key={candidate.slug} candidate={candidate} currency={context.currency} showBars={false} />
                  ))}
              </div>
            </section>
          )}

          {grouped
            .filter((group) => group.slugs.length > 0)
            .map((group) => (
              <section key={group.collection.id}>
                <SectionHeading title={group.collection.name} />
                <div className="space-y-4">
                  {candidates
                    .filter((candidate) => group.slugs.includes(candidate.slug))
                    .map((candidate) => (
                      <UniversityCard key={candidate.slug} candidate={candidate} currency={context.currency} showBars={false} />
                    ))}
                </div>
              </section>
            ))}
        </>
      )}
    </div>
  );
}
