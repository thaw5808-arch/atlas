import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const REMINDER_WINDOW_DAYS = 30;
// Nothing to remind a student about once the outcome is decided.
const LIVE_STAGES = ["RESEARCHING", "CONSIDERING", "PREPARING", "READY_TO_APPLY", "APPLIED", "INTERVIEW", "OFFER"] as const;

type Candidate = {
  userId: string;
  kind: "APPLICATION_DEADLINE" | "CHECKLIST_DUE";
  href: string;
  title: string;
  body: string;
};

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return unauthorized();

  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [dueSoon, withOverdueTasks] = await Promise.all([
    prisma.application.findMany({
      where: {
        stage: { in: [...LIVE_STAGES] },
        deadline: { gte: now, lte: windowEnd },
      },
      include: { university: true },
    }),
    prisma.application.findMany({
      where: {
        stage: { in: [...LIVE_STAGES] },
        tasks: { some: { completed: false, dueDate: { lt: now } } },
      },
      include: {
        university: true,
        tasks: { where: { completed: false, dueDate: { lt: now } }, orderBy: { dueDate: "asc" } },
      },
    }),
  ]);

  const candidates: Candidate[] = [
    ...dueSoon.map((application) => ({
      userId: application.userId,
      kind: "APPLICATION_DEADLINE" as const,
      href: `/planner?application=${application.id}`,
      title: "Deadline approaching",
      body: `${application.university.name}'s deadline is ${formatDate(application.deadline)}.`,
    })),
    ...withOverdueTasks.map((application) => {
      const titles = application.tasks.map((task) => task.title);
      return {
        userId: application.userId,
        kind: "CHECKLIST_DUE" as const,
        href: `/planner?application=${application.id}`,
        title: titles.length === 1 ? "A task is overdue" : `${titles.length} tasks are overdue`,
        body: `${application.university.name}: ${titles.join(", ")}.`,
      };
    }),
  ];

  if (candidates.length === 0) {
    return NextResponse.json({ created: 0, checked: 0 });
  }

  // One notification per application per condition, ever — a notification
  // already sent for this (user, kind, application) combination is never
  // repeated, even once its underlying deadline or task list has passed.
  const existing = await prisma.notification.findMany({
    where: {
      OR: candidates.map((candidate) => ({
        userId: candidate.userId,
        kind: candidate.kind,
        href: candidate.href,
      })),
    },
    select: { userId: true, kind: true, href: true },
  });
  const sentKeys = new Set(existing.map((row) => `${row.userId}:${row.kind}:${row.href}`));

  const toCreate = candidates.filter((candidate) => !sentKeys.has(`${candidate.userId}:${candidate.kind}:${candidate.href}`));

  if (toCreate.length > 0) {
    await prisma.notification.createMany({ data: toCreate });
  }

  return NextResponse.json({ created: toCreate.length, checked: candidates.length });
}
