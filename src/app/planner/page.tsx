import Link from "next/link";
import { redirect } from "next/navigation";
import { PlannerBoard, type PlannerApplication } from "@/components/planner-board";
import { EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export default async function PlannerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/planner");

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    include: { university: { include: { country: true } }, program: true, tasks: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  const items: PlannerApplication[] = applications.map((application) => ({
    id: application.id,
    stage: application.stage,
    universityName: application.university.name,
    slug: application.university.slug,
    programName: application.program?.name ?? null,
    countryName: application.university.country.name,
    deadline: application.deadline?.toISOString() ?? null,
    tasks: application.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      completed: task.completed,
      dueDate: task.dueDate?.toISOString() ?? null,
    })),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl">Planner</h1>
        <p className="mt-2 max-w-prose text-sm text-slate">
          Each university you add carries its own document checklist and deadlines. Move it through
          the stages as the application progresses.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          title="Your planner is empty"
          body="Add a university from its profile and ATLAS will create the document checklist for you."
          action={
            <Link href="/universities" className="btn btn-accent btn-sm">
              Find universities
            </Link>
          }
        />
      ) : (
        <PlannerBoard applications={items} />
      )}
    </div>
  );
}
