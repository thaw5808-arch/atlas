import { beforeEach, describe, expect, it, vi } from "vitest";

// resolveCorrection dispatches the approved value onto one of four Prisma
// models depending on the correction's entityType. TuitionRecord and
// LivingCostRecord were exercised by hand; AdmissionRequirement and
// LanguageRequirement were wired into the allowed-fields list but the model
// selector never routed to them, so approving either would look up the
// entity's id in the wrong table (tuitionRecord/livingCostRecord) — a
// findUnique that finds nothing and an update that throws. These tests cover
// the two previously unreachable branches.

const requireRole = vi.fn();

vi.mock("@/lib/session", () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
  requireUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

function makeModel(row: Record<string, unknown>) {
  return {
    findUnique: vi.fn().mockResolvedValue(row),
    update: vi.fn().mockResolvedValue({ ...row }),
  };
}

function makeTx(models: Record<string, ReturnType<typeof makeModel>>) {
  return {
    ...models,
    correctionRequest: { update: vi.fn().mockResolvedValue({}) },
    verificationRecord: { create: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
}

const ADMIN = { id: "admin-1", email: "admin@atlas.study", name: "Admin", role: "ADMIN", preferredCurrency: "USD" };

describe("resolveCorrection", () => {
  beforeEach(() => {
    vi.resetModules();
    requireRole.mockReset();
    requireRole.mockResolvedValue(ADMIN);
  });

  it("applies an approved AdmissionRequirement correction to admissionRequirement, not tuitionRecord", async () => {
    const admissionRequirement = makeModel({ id: "req-1", minGpa: 2.8 });
    const tuitionRecord = makeModel({ id: "req-1", tuitionPerYear: 10_000 });
    const livingCostRecord = makeModel({ id: "req-1", housingPerMonth: 500 });
    const tx = makeTx({ admissionRequirement, tuitionRecord, livingCostRecord });

    const correctionRequest = {
      findUnique: vi.fn().mockResolvedValue({
        id: "cr-1",
        entityType: "AdmissionRequirement",
        entityId: "req-1",
        field: "minGpa",
        claimedValue: "3.2",
        status: "OPEN",
      }),
      update: vi.fn(),
    };

    vi.doMock("@/lib/db", () => ({
      prisma: {
        correctionRequest,
        $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(tx)),
      },
    }));

    const { resolveCorrection } = await import("@/lib/actions/governance");
    const result = await resolveCorrection("cr-1", "approve");

    expect(result).toEqual({});
    expect(admissionRequirement.findUnique).toHaveBeenCalledWith({ where: { id: "req-1" } });
    expect(admissionRequirement.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { minGpa: 3.2, verification: "RECENTLY_UPDATED", lastVerifiedAt: expect.any(Date) },
    });
    expect(tuitionRecord.findUnique).not.toHaveBeenCalled();
    expect(tuitionRecord.update).not.toHaveBeenCalled();
    expect(livingCostRecord.findUnique).not.toHaveBeenCalled();
    expect(livingCostRecord.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "AdmissionRequirement",
        entityId: "req-1",
        field: "minGpa",
        previousValue: "2.8",
        newValue: "3.2",
      }),
    });
  });

  it("applies an approved LanguageRequirement correction to languageRequirement, not livingCostRecord", async () => {
    const languageRequirement = makeModel({ id: "req-2", minScore: 6.0 });
    const tuitionRecord = makeModel({ id: "req-2", tuitionPerYear: 10_000 });
    const livingCostRecord = makeModel({ id: "req-2", housingPerMonth: 500 });
    const tx = makeTx({ languageRequirement, tuitionRecord, livingCostRecord });

    const correctionRequest = {
      findUnique: vi.fn().mockResolvedValue({
        id: "cr-2",
        entityType: "LanguageRequirement",
        entityId: "req-2",
        field: "minScore",
        claimedValue: "6.5",
        status: "IN_REVIEW",
      }),
      update: vi.fn(),
    };

    vi.doMock("@/lib/db", () => ({
      prisma: {
        correctionRequest,
        $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(tx)),
      },
    }));

    const { resolveCorrection } = await import("@/lib/actions/governance");
    const result = await resolveCorrection("cr-2", "approve");

    expect(result).toEqual({});
    expect(languageRequirement.findUnique).toHaveBeenCalledWith({ where: { id: "req-2" } });
    expect(languageRequirement.update).toHaveBeenCalledWith({
      where: { id: "req-2" },
      data: { minScore: 6.5, verification: "RECENTLY_UPDATED", lastVerifiedAt: expect.any(Date) },
    });
    expect(livingCostRecord.findUnique).not.toHaveBeenCalled();
    expect(livingCostRecord.update).not.toHaveBeenCalled();
    expect(tuitionRecord.findUnique).not.toHaveBeenCalled();
    expect(tuitionRecord.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "LanguageRequirement",
        entityId: "req-2",
        field: "minScore",
        previousValue: "6",
        newValue: "6.5",
      }),
    });
  });
});
