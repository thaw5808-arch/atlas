"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "../db";
import { requireUser } from "../session";

const DEFAULT_TASKS: { kind: "PASSPORT" | "TRANSCRIPT" | "RECOMMENDATION_LETTER" | "STATEMENT_OF_PURPOSE" | "LANGUAGE_CERTIFICATE" | "FINANCIAL_DOCUMENTS" | "PORTFOLIO" | "APPLICATION_FEE" | "INTERVIEW" | "VISA_DOCUMENTS"; title: string }[] = [
  { kind: "PASSPORT", title: "Valid passport" },
  { kind: "TRANSCRIPT", title: "Academic transcript" },
  { kind: "RECOMMENDATION_LETTER", title: "Recommendation letters" },
  { kind: "STATEMENT_OF_PURPOSE", title: "Statement of purpose" },
  { kind: "LANGUAGE_CERTIFICATE", title: "Language certificate" },
  { kind: "FINANCIAL_DOCUMENTS", title: "Proof of funds" },
  { kind: "APPLICATION_FEE", title: "Application fee paid" },
  { kind: "VISA_DOCUMENTS", title: "Visa documents" },
];

export async function toggleSaved(universityId: string, collectionId?: string | null) {
  const user = await requireUser();
  const existing = await prisma.savedUniversity.findUnique({
    where: { userId_universityId: { userId: user.id, universityId } },
  });

  if (existing && !collectionId) {
    await prisma.savedUniversity.delete({ where: { id: existing.id } });
  } else if (existing) {
    await prisma.savedUniversity.update({ where: { id: existing.id }, data: { collectionId } });
  } else {
    await prisma.savedUniversity.create({
      data: { userId: user.id, universityId, collectionId: collectionId ?? null },
    });
  }

  revalidatePath("/saved");
  revalidatePath("/dashboard");
}

export async function createCollection(name: string) {
  const user = await requireUser();
  const parsed = z.string().min(1).max(40).safeParse(name.trim());
  if (!parsed.success) return { error: "Give the collection a short name" };
  const existing = await prisma.collection.findUnique({
    where: { userId_name: { userId: user.id, name: parsed.data } },
  });
  if (existing) return { error: "You already have a collection with that name" };
  await prisma.collection.create({ data: { userId: user.id, name: parsed.data } });
  revalidatePath("/saved");
  return {};
}

export async function addToPlanner(universityId: string, programId?: string | null) {
  const user = await requireUser();
  const existing = await prisma.application.findFirst({
    where: { userId: user.id, universityId, programId: programId ?? null },
  });
  if (existing) return { id: existing.id };

  const program = programId
    ? await prisma.program.findUnique({ where: { id: programId } })
    : null;

  const application = await prisma.application.create({
    data: {
      userId: user.id,
      universityId,
      programId: programId ?? null,
      deadline: program?.applicationCloses ?? null,
      tasks: {
        create: DEFAULT_TASKS.map((task, index) => ({ ...task, position: index })),
      },
    },
  });

  revalidatePath("/planner");
  revalidatePath("/dashboard");
  return { id: application.id };
}

const stages = z.enum([
  "RESEARCHING",
  "CONSIDERING",
  "PREPARING",
  "READY_TO_APPLY",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "ACCEPTED",
]);

export async function moveApplication(applicationId: string, stage: string) {
  const user = await requireUser();
  const parsed = stages.safeParse(stage);
  if (!parsed.success) return { error: "Unknown stage" };

  // Ownership is re-checked here rather than trusting the caller.
  const updated = await prisma.application.updateMany({
    where: { id: applicationId, userId: user.id },
    data: { stage: parsed.data },
  });
  if (updated.count === 0) return { error: "That application isn't yours" };

  await prisma.notification.create({
    data: {
      userId: user.id,
      kind: "APPLICATION_STATUS",
      title: "Application moved",
      body: `Stage changed to ${parsed.data.replace(/_/g, " ").toLowerCase()}.`,
      href: "/planner",
    },
  });

  revalidatePath("/planner");
  return {};
}

export async function toggleTask(taskId: string, completed: boolean) {
  const user = await requireUser();
  const updated = await prisma.applicationTask.updateMany({
    where: { id: taskId, application: { userId: user.id } },
    data: { completed },
  });
  if (updated.count === 0) return { error: "That task isn't yours" };
  revalidatePath("/planner");
  return {};
}

export async function removeApplication(applicationId: string) {
  const user = await requireUser();
  await prisma.application.deleteMany({ where: { id: applicationId, userId: user.id } });
  revalidatePath("/planner");
}

export async function markNotificationsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
