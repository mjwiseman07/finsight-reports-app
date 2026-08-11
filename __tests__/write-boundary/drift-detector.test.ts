import { describe, test, expect } from "vitest";
import { detectDrift } from "@/lib/accounting/write-boundary/drift-detector";
import type { JournalEntry, ProviderWriteResponse } from "@/lib/accounting/write-boundary/types";

const req = (overrides: Partial<JournalEntry> = {}): JournalEntry => ({
  tenantId: "t1",
  journalDate: "2026-08-08",
  narration: "Test",
  lines: [
    { accountCode: "200", debit: 100, credit: 0 },
    { accountCode: "400", debit: 0, credit: 100 },
  ],
  currency: "USD",
  status: "DRAFT",
  externalRef: "test-ext-1",
  ...overrides,
});

const res = (overrides: Partial<ProviderWriteResponse> = {}): ProviderWriteResponse => ({
  providerJournalId: "prov-1",
  status: "DRAFT",
  writtenAt: "2026-08-08T00:00:00Z",
  recordedLines: [
    { accountCode: "200", accountId: "a1", debit: 100, credit: 0 },
    { accountCode: "400", accountId: "a2", debit: 0, credit: 100 },
  ],
  warnings: [],
  ...overrides,
});

describe("detectDrift", () => {
  test("no drift when request and response match", () => {
    expect(detectDrift(req(), res()).drifted).toBe(false);
  });

  test("W0.5 silent-strip: line count mismatch", () => {
    // Request has 2 lines; provider recorded only 1 (silently stripped forbidden line)
    const result = detectDrift(req(), res({ recordedLines: [res().recordedLines[0]] }));
    expect(result.drifted).toBe(true);
    expect(result.reasons[0]).toContain("line count mismatch");
    expect(result.reasons[0]).toContain("requested 2, provider recorded 1");
  });

  test("provider warnings are drift", () => {
    const result = detectDrift(req(), res({ warnings: ["Account is a system account"] }));
    expect(result.drifted).toBe(true);
    expect(result.reasons.some((r) => r.includes("warning"))).toBe(true);
  });

  test("status mismatch", () => {
    const result = detectDrift(req({ status: "DRAFT" }), res({ status: "POSTED" }));
    expect(result.drifted).toBe(true);
    expect(result.reasons.some((r) => r.includes("status mismatch"))).toBe(true);
  });

  test("account code rewrite", () => {
    const rewritten = res();
    rewritten.recordedLines[0] = { ...rewritten.recordedLines[0], accountCode: "999" };
    const result = detectDrift(req(), rewritten);
    expect(result.drifted).toBe(true);
    expect(result.reasons.some((r) => r.includes("accountCode rewritten"))).toBe(true);
  });

  test("amount change > 1 cent triggers drift", () => {
    const shifted = res();
    shifted.recordedLines[0] = { ...shifted.recordedLines[0], debit: 99.5 };
    const result = detectDrift(req(), shifted);
    expect(result.drifted).toBe(true);
    expect(result.reasons.some((r) => r.includes("debit changed"))).toBe(true);
  });

  test("amount change <= 1 cent tolerated (float rounding)", () => {
    const shifted = res();
    shifted.recordedLines[0] = { ...shifted.recordedLines[0], debit: 100.005 };
    expect(detectDrift(req(), shifted).drifted).toBe(false);
  });
});
