import { describe, it, expect, vi, beforeEach } from "vitest";

const { upsertMemory } = vi.hoisted(() => ({ upsertMemory: vi.fn() }));

vi.mock("@/lib/memory/client-memory-service", () => ({ upsertMemory }));

import { writeApAccrualManifest, apAccrualManifestMemoryId } from "@/lib/accruals/write-manifest";
import { AP_ACCRUAL_MANIFEST_SCHEMA_VERSION, type ApAccrualManifestPayload } from "@/lib/accruals/manifest-schema";

function payload(): ApAccrualManifestPayload {
  return {
    schemaVersion: AP_ACCRUAL_MANIFEST_SCHEMA_VERSION,
    firmClientId: "fc-1",
    companyId: "co-1",
    closePeriodId: "cp-1",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    bookedAttemptId: "att-1",
    bookedAt: "2026-06-30T00:00:00Z",
    bookedByUserId: null,
    totalAccrued: 100,
    accruedApAccountId: "42",
    accruedApAccountName: "Accrued AP",
    lines: [
      {
        lineIndex: 0,
        vendorName: "Acme Corp",
        vendorId: null,
        vendorCanonical: "ACME",
        invoiceNumber: "INV-1",
        invoiceNumberCanonical: "1",
        invoiceDate: "2026-06-15",
        amount: 100,
        expenseAccountId: "60",
        expenseAccountName: "Office",
        accruedApAccountId: "42",
        accruedApAccountName: "Accrued AP",
        memo: null,
        matchStatus: "open",
        matchedBillId: null,
        matchedAt: null,
        reversedAttemptId: null,
      },
    ],
  };
}

describe("writeApAccrualManifest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes via the sanctioned upsertMemory path and returns memoryId + recordVersion", async () => {
    upsertMemory.mockResolvedValue({ memory_id: apAccrualManifestMemoryId("fc-1", "cp-1"), created: true });
    const res = await writeApAccrualManifest({ payload: payload() });
    expect(res.memoryId).toBe("mem_fc-1_ap_accrual_manifest_cp-1");
    expect(res.recordVersion).toBe(1);
    const call = upsertMemory.mock.calls[0][0];
    expect(call).toMatchObject({
      firmClientId: "fc-1",
      memoryType: "ap_accrual_manifest",
      memoryId: "mem_fc-1_ap_accrual_manifest_cp-1",
      memoryKey: "ap_accrual_manifest:cp-1",
      domain: "accruals",
      subdomain: "ap",
      topic: "manifest",
      entityType: "close_period",
      entityId: "cp-1",
    });
  });

  it("is idempotent: writing the same manifest twice targets the same deterministic memory_id (upsert in place)", async () => {
    upsertMemory.mockResolvedValue({ memory_id: "mem_fc-1_ap_accrual_manifest_cp-1", created: false });
    await writeApAccrualManifest({ payload: payload() });
    await writeApAccrualManifest({ payload: payload() });
    expect(upsertMemory).toHaveBeenCalledTimes(2);
    expect(upsertMemory.mock.calls[0][0].memoryId).toBe(upsertMemory.mock.calls[1][0].memoryId);
  });

  it("throws on invalid payload before any memory write", async () => {
    const bad = payload();
    bad.totalAccrued = 999;
    await expect(writeApAccrualManifest({ payload: bad })).rejects.toThrow(/totalAccrued/);
    expect(upsertMemory).not.toHaveBeenCalled();
  });
});
