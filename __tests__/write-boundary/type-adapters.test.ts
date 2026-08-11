import { describe, expect, it } from "vitest";
import { typeAdapters } from "@/lib/accounting/write-boundary";
import {
  WriteRejected,
  WriteFailed,
} from "@/lib/integrations/shared/contracts/AccountingSystemAdapter";

const { toJEPayload, toWriteReceipt } = typeAdapters;

describe("toJEPayload", () => {
  const baseEntry = {
    tenantId: "realm-1",
    journalDate: "2026-01-15",
    narration: "Test JE",
    currency: "USD",
    status: "POSTED" as const,
    externalRef: "test-idem-1",
    lines: [
      { accountCode: "100", debit: 500, credit: 0, description: "Debit A" },
      { accountCode: "200", debit: 0, credit: 500, description: "Credit B" },
    ],
  };

  it("converts one debit + one credit line into two Q7 JELines", () => {
    const payload = toJEPayload(baseEntry, { currency: "USD" });
    expect(payload.transaction_date).toBe("2026-01-15");
    expect(payload.narration).toBe("Test JE");
    expect(payload.currency).toBe("USD");
    expect(payload.lines).toHaveLength(2);
    expect(payload.lines[0]).toEqual({
      account_id: "100",
      amount: 500,
      posting_type: "Debit",
      description: "Debit A",
      class_id: undefined,
    });
    expect(payload.lines[1]).toEqual({
      account_id: "200",
      amount: 500,
      posting_type: "Credit",
      description: "Credit B",
      class_id: undefined,
    });
  });

  it("uppercases currency", () => {
    const payload = toJEPayload(baseEntry, { currency: "eur" });
    expect(payload.currency).toBe("EUR");
  });

  it("passes private_note when supplied", () => {
    const payload = toJEPayload(baseEntry, {
      currency: "USD",
      privateNote: "For audit trail",
    });
    expect(payload.private_note).toBe("For audit trail");
  });

  it("drops zero/zero lines silently", () => {
    const entry = {
      ...baseEntry,
      lines: [
        { accountCode: "100", debit: 500, credit: 0 },
        { accountCode: "200", debit: 0, credit: 0 }, // dropped
        { accountCode: "300", debit: 0, credit: 500 },
      ],
    };
    const payload = toJEPayload(entry, { currency: "USD" });
    expect(payload.lines).toHaveLength(2);
    expect(payload.lines.map((l) => l.account_id)).toEqual(["100", "300"]);
  });

  it("throws when a line has both debit and credit > 0", () => {
    const entry = {
      ...baseEntry,
      lines: [{ accountCode: "100", debit: 500, credit: 500 }],
    };
    expect(() => toJEPayload(entry, { currency: "USD" })).toThrow(
      /both debit=500 and credit=500/,
    );
  });

  it("passes classId through as class_id", () => {
    const entry = {
      ...baseEntry,
      lines: [
        {
          accountCode: "100",
          debit: 500,
          credit: 0,
          classId: "CLASS-1",
        },
      ],
    };
    const payload = toJEPayload(entry, { currency: "USD" });
    expect(payload.lines[0].class_id).toBe("CLASS-1");
  });

  it("preserves order of lines", () => {
    const entry = {
      ...baseEntry,
      lines: [
        { accountCode: "A", debit: 100, credit: 0 },
        { accountCode: "B", debit: 0, credit: 50 },
        { accountCode: "C", debit: 0, credit: 50 },
      ],
    };
    const payload = toJEPayload(entry, { currency: "USD" });
    expect(payload.lines.map((l) => l.account_id)).toEqual(["A", "B", "C"]);
  });
});

describe("toWriteReceipt", () => {
  const entry = {
    tenantId: "realm-1",
    journalDate: "2026-01-15",
    narration: "Test",
    currency: "USD",
    status: "POSTED" as const,
    externalRef: "test-1",
    lines: [
      { accountCode: "100", accountId: "100", debit: 500, credit: 0 },
      { accountCode: "200", accountId: "200", debit: 0, credit: 500 },
    ],
  };
  const ctx = {
    lifecycleEventIds: ["evt-1", "evt-2"],
    writtenAt: "2026-01-15T12:00:00.000Z",
  };

  it("converts posted result into WriteReceipt", () => {
    const receipt = toWriteReceipt(
      { status: "posted", attempt_id: "att-1", qbo_je_id: "QBO-99" },
      entry,
      ctx,
    );
    expect(receipt.providerJournalId).toBe("QBO-99");
    expect(receipt.status).toBe("POSTED");
    expect(receipt.writtenAt).toBe("2026-01-15T12:00:00.000Z");
    expect(receipt.lifecycleEventIds).toEqual(["evt-1", "evt-2"]);
    expect(receipt.resolvedAccounts).toEqual([
      { accountCode: "100", accountId: "100" },
      { accountCode: "200", accountId: "200" },
    ]);
  });

  it("throws WriteRejected on rejected result", () => {
    expect(() =>
      toWriteReceipt(
        {
          status: "rejected",
          attempt_id: "att-1",
          reason: "unbalanced",
          details: { drTotal: 500, crTotal: 400 },
        },
        entry,
        ctx,
      ),
    ).toThrow(WriteRejected);
  });

  it("throws WriteFailed on failed result", () => {
    expect(() =>
      toWriteReceipt(
        {
          status: "failed",
          attempt_id: "att-1",
          error: "HTTP 500",
          retryable: true,
        },
        entry,
        ctx,
      ),
    ).toThrow(WriteFailed);
  });
});
