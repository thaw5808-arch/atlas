"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "../db";
import { requireRole, requireUser } from "../session";

async function audit(
  actorId: string,
  entityType: string,
  entityId: string,
  action: string,
  field?: string,
  previousValue?: string,
  newValue?: string,
) {
  await prisma.auditLog.create({
    data: { actorId, entityType, entityId, action, field, previousValue, newValue },
  });
}

/** A representative proposes a change; it does not go live until an admin approves it. */
export async function proposeChange(input: {
  universityId: string;
  entityType: string;
  entityId: string;
  field: string;
  claimedValue: string;
  message: string;
  evidenceUrl?: string;
}) {
  const user = await requireUser();
  const parsed = z
    .object({
      universityId: z.string(),
      entityType: z.enum(["TuitionRecord", "LivingCostRecord", "AdmissionRequirement", "LanguageRequirement", "University"]),
      entityId: z.string(),
      field: z.string().min(1).max(60),
      claimedValue: z.string().min(1).max(200),
      message: z.string().min(5).max(600),
      evidenceUrl: z.string().url().optional().or(z.literal("")),
    })
    .safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Representatives may only propose changes for the university they are verified for.
  if (user.role === "REPRESENTATIVE") {
    const representative = await prisma.universityRepresentative.findUnique({ where: { userId: user.id } });
    if (!representative || representative.status !== "VERIFIED" || representative.universityId !== parsed.data.universityId) {
      return { error: "You are not verified for that university" };
    }
  }

  const request = await prisma.correctionRequest.create({
    data: {
      universityId: parsed.data.universityId,
      reportedById: user.id,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      field: parsed.data.field,
      claimedValue: parsed.data.claimedValue,
      evidenceUrl: parsed.data.evidenceUrl || null,
      message: parsed.data.message,
    },
  });

  await audit(user.id, "CorrectionRequest", request.id, "create", parsed.data.field, undefined, parsed.data.claimedValue);
  revalidatePath("/portal");
  revalidatePath("/admin/corrections");
  return { id: request.id };
}

const NUMERIC_FIELDS: Record<string, Set<string>> = {
  TuitionRecord: new Set(["tuitionPerYear", "admissionFee", "otherAcademicFees"]),
  LivingCostRecord: new Set([
    "housingPerMonth",
    "foodPerMonth",
    "transportPerMonth",
    "insurancePerMonth",
    "personalPerMonth",
    "booksPerYear",
    "visaFeesPerYear",
  ]),
  AdmissionRequirement: new Set(["minGpa"]),
  LanguageRequirement: new Set(["minScore"]),
};

export async function resolveCorrection(requestId: string, decision: "approve" | "reject", note?: string) {
  const admin = await requireRole("ADMIN");
  const request = await prisma.correctionRequest.findUnique({ where: { id: requestId } });
  if (!request) return { error: "That request no longer exists" };
  if (request.status !== "OPEN" && request.status !== "IN_REVIEW") return { error: "Already resolved" };

  if (decision === "reject") {
    await prisma.correctionRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", resolution: note ?? null, resolvedAt: new Date() },
    });
    await audit(admin.id, "CorrectionRequest", requestId, "reject");
    revalidatePath("/admin/corrections");
    return {};
  }

  const allowed = NUMERIC_FIELDS[request.entityType];
  if (!allowed?.has(request.field ?? "")) {
    return { error: "That field can't be applied automatically — edit it directly instead" };
  }
  const value = Number(request.claimedValue);
  if (!Number.isFinite(value) || value < 0) return { error: "The proposed value isn't a valid number" };

  await prisma.$transaction(async (tx) => {
    const model = request.entityType === "TuitionRecord" ? tx.tuitionRecord : tx.livingCostRecord;
    const before = (await (model as typeof tx.tuitionRecord).findUnique({ where: { id: request.entityId } })) as
      | Record<string, unknown>
      | null;

    await (model as typeof tx.tuitionRecord).update({
      where: { id: request.entityId },
      data: {
        [request.field as string]: value,
        verification: "RECENTLY_UPDATED",
        lastVerifiedAt: new Date(),
      } as never,
    });

    await tx.correctionRequest.update({
      where: { id: requestId },
      data: { status: "RESOLVED", resolution: note ?? "Applied", resolvedAt: new Date() },
    });

    await tx.verificationRecord.create({
      data: {
        entityType: request.entityType,
        entityId: request.entityId,
        status: "RECENTLY_UPDATED",
        verifiedById: admin.id,
        note: `Applied correction ${requestId}`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        entityType: request.entityType,
        entityId: request.entityId,
        action: "update",
        field: request.field,
        previousValue: before ? String(before[request.field as string]) : null,
        newValue: String(value),
      },
    });
  });

  revalidatePath("/admin/corrections");
  return {};
}

export async function reviewRepresentative(representativeId: string, decision: "verify" | "reject") {
  const admin = await requireRole("ADMIN");
  const representative = await prisma.universityRepresentative.findUnique({ where: { id: representativeId } });
  if (!representative) return { error: "That request no longer exists" };

  await prisma.$transaction(async (tx) => {
    await tx.universityRepresentative.update({
      where: { id: representativeId },
      data: { status: decision === "verify" ? "VERIFIED" : "REJECTED", reviewedAt: new Date() },
    });
    if (decision === "verify") {
      await tx.user.update({ where: { id: representative.userId }, data: { role: "REPRESENTATIVE" } });
      await tx.university.update({ where: { id: representative.universityId }, data: { claimed: true } });
    }
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        entityType: "UniversityRepresentative",
        entityId: representativeId,
        action: decision,
        field: "status",
        previousValue: representative.status,
        newValue: decision === "verify" ? "VERIFIED" : "REJECTED",
      },
    });
    await tx.notification.create({
      data: {
        userId: representative.userId,
        kind: "VERIFICATION",
        title: decision === "verify" ? "Your claim was approved" : "Your claim was declined",
        body:
          decision === "verify"
            ? "You can now propose updates for your university."
            : "An administrator could not verify your affiliation.",
        href: "/portal",
      },
    });
  });

  revalidatePath("/admin/representatives");
  return {};
}

const VERIFIABLE_MODELS = {
  TuitionRecord: "tuitionRecord",
  LivingCostRecord: "livingCostRecord",
  Scholarship: "scholarship",
} as const;

export type VerifiableEntityType = keyof typeof VERIFIABLE_MODELS;

export async function verifyRecord(entityType: VerifiableEntityType, entityId: string) {
  const admin = await requireRole("ADMIN");
  const model = prisma[VERIFIABLE_MODELS[entityType]];
  const before = (await (model as typeof prisma.tuitionRecord).findUnique({ where: { id: entityId } })) as
    | { verification: string }
    | null;
  if (!before) return { error: "That record no longer exists" };

  await (model as typeof prisma.tuitionRecord).update({
    where: { id: entityId },
    data: { verification: "VERIFIED", lastVerifiedAt: new Date() },
  });
  await prisma.verificationRecord.create({
    data: { entityType, entityId, status: "VERIFIED", verifiedById: admin.id },
  });
  await audit(admin.id, entityType, entityId, "verify", "verification", before.verification, "VERIFIED");
  revalidatePath("/admin/data");
  revalidatePath("/admin/data/living-costs");
  revalidatePath("/admin/data/scholarships");
  return {};
}

export async function claimUniversity(universityId: string, workEmail: string, jobTitle: string) {
  const user = await requireUser();
  const parsed = z
    .object({ workEmail: z.string().email(), jobTitle: z.string().min(2).max(80) })
    .safeParse({ workEmail, jobTitle });
  if (!parsed.success) return { error: "Enter a valid work email and job title" };

  const existing = await prisma.universityRepresentative.findUnique({ where: { userId: user.id } });
  if (existing) return { error: "You already have a claim on file" };

  await prisma.universityRepresentative.create({
    data: { userId: user.id, universityId, workEmail: parsed.data.workEmail, jobTitle: parsed.data.jobTitle },
  });
  revalidatePath("/portal");
  revalidatePath("/portal/claim");
  return {};
}

export async function updateUserRole(userId: string, role: string) {
  const admin = await requireRole("ADMIN");
  const parsed = z.enum(["STUDENT", "REPRESENTATIVE", "ADMIN"]).safeParse(role);
  if (!parsed.success) return { error: "Not a valid role" };

  // Stops an admin from demoting themselves out of the admin section.
  if (userId === admin.id) return { error: "You can't change your own role" };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "That user no longer exists" };
  if (target.role === parsed.data) return {};

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role: parsed.data } });
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        entityType: "User",
        entityId: userId,
        action: "update",
        field: "role",
        previousValue: target.role,
        newValue: parsed.data,
      },
    });
  });

  revalidatePath("/admin/data/users");
  return {};
}
