import { describe, it, expect } from "vitest";
import {
  AP_ACCRUAL_MANIFEST_SCHEMA_VERSION,
  validateManifest,
  ManifestSchemaError,
  type ApAccrualManifestLine,
  type ApAccrualManifestPayload,
} from "@/lib/accruals/manifest-schema";

function line(overrides: Partial<ApAccrualManifestLine> = {}): ApAccrualManifestLine {
  return {
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
    ...overrides,
  };
}

function payload(overrides: Partial<ApAccrualManifestPayload> = {}): ApAccrualManifestPayload {
  const lines = overrides.lines ?? [
    line({ lineIndex: 0, amount: 100 }),
    line({ lineIndex: 1, amount: 50, invoiceNumber: "INV-2", invoiceNumberCanonical: "2" }),
    line({ lineIndex: 2, amount: 25, invoiceNumber: "INV-3", invoiceNumberCanonical: "3" }),
  ];
  const total = lines.reduce((s, l) => s + l.amount, 0);
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
    totalAccrued: total,
    accruedApAccountId: "42",
    accruedApAccountName: "Accrued AP",
    lines,
    ...overrides,
  };
}

describe("validateManifest", () => {
  it("accepts a valid 3-line payload", () => {
    expect(() => validateManifest(payload())).not.toThrow();
  });

  it("throws when schemaVersion missing", () => {
    const p = payload() as unknown as Record<string, unknown>;
    delete p.schemaVersion;
    expect(() => validateManifest(p)).toThrow(ManifestSchemaError);
  });

  it("throws when schemaVersion = 2 (mismatch)", () => {
    expect(() => validateManifest(payload({ schemaVersion: 2 as never }))).toThrow(/mismatch/);
  });

  it("throws when lines is an empty array", () => {
    expect(() => validateManifest(payload({ lines: [], totalAccrued: 0 }))).toThrow(
      /non-empty array/,
    );
  });

  it("throws when a line amount is 0", () => {
    expect(() =>
      validateManifest(payload({ lines: [line({ amount: 0 })], totalAccrued: 0 })),
    ).toThrow(/amount must be positive/);
  });

  it("throws when a line amount is negative", () => {
    expect(() =>
      validateManifest(payload({ lines: [line({ amount: -5 })], totalAccrued: -5 })),
    ).toThrow(/amount must be positive/);
  });

  it("throws when totalAccrued != sum(lines) beyond penny tolerance", () => {
    expect(() =>
      validateManifest(payload({ lines: [line({ amount: 100 })], totalAccrued: 200 })),
    ).toThrow(/totalAccrued does not match/);
  });

  it("throws when matchStatus is invalid", () => {
    expect(() =>
      validateManifest(payload({ lines: [line({ matchStatus: "weird" as never })], totalAccrued: 100 })),
    ).toThrow(/matchStatus invalid/);
  });

  it("accepts all four valid matchStatus values", () => {
    for (const s of ["open", "matched", "reversed", "stale"] as const) {
      expect(() =>
        validateManifest(payload({ lines: [line({ matchStatus: s })], totalAccrued: 100 })),
      ).not.toThrow();
    }
  });
});
