import { describe, it, expect, vi, beforeEach } from "vitest";
import { composeApAccrual, type BookApAccrualInput } from "@/lib/accruals/book-ap-accrual";

// ---- Mocks for the poster-wire tests (QBO side + evidence hooks) ----
const { getSupabaseAdmin, canPostToQBO, resolveQBOTokenForFirmClient, validateJEPayload, recordMemory, persistJeEvidence, dispatchBackupPacket } =
  vi.hoisted(() => ({
    getSupabaseAdmin: vi.fn(),
    canPostToQBO: vi.fn(),
    resolveQBOTokenForFirmClient: vi.fn(),
    validateJEPayload: vi.fn(),
    recordMemory: vi.fn(),
    persistJeEvidence: vi.fn(),
    dispatchBackupPacket: vi.fn(),
  }));

vi.mock("@/lib/supabase-admin.js", () => ({ getSupabaseAdmin }));
vi.mock("@/lib/erp/quickbooks/write-preflight", () => ({ canPostToQBO }));
vi.mock("@/lib/erp/quickbooks/token-resolver", () => ({ resolveQBOTokenForFirmClient }));
vi.mock("@/lib/erp/quickbooks/je-validator", () => ({ validateJEPayload }));
vi.mock("@/lib/memory/client-memory-service", () => ({ recordMemory }));
vi.mock("@/lib/je-evidence/persist", () => ({ persistJeEvidence }));
vi.mock("@/lib/je-evidence/dispatch-hook", () => ({ dispatchBackupPacket }));

import { qboJournalEntryPoster } from "@/lib/erp/quickbooks/journal-entry-poster";

function baseInput(overrides: Partial<BookApAccrualInput> = {}): BookApAccrualInput {
  return {
    firmClientId: "fc-1",
    companyId: "co-1",
    closePeriodId: "cp-1",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    transactionDate: "2026-06-30",
    accruedApAccountId: "42",
    accruedApAccountName: "Accrued AP",
    narration: "June AP accrual",
    bookedByUserId: null,
    lines: [
      {
        vendorName: "Acme Corp",
        invoiceNumber: "INV-4471",
        invoiceDate: "2026-06-28",
        amount: 500,
        expenseAccountId: "60",
        expenseAccountName: "Office Supplies",
      },
    ],
    ...overrides,
  };
}

describe("composeApAccrual", () => {
  it("single-line input -> balanced 2-line JE (1 Dr expense, 1 Cr accrued AP)", () => {
    const { composition } = composeApAccrual(baseInput());
    expect(composition.lines).toHaveLength(2);
    expect(composition.lines[0]).toMatchObject({ drAmount: 500, crAmount: 0, accountId: "60" });
    expect(composition.lines[1]).toMatchObject({ drAmount: 0, crAmount: 500, accountId: "42" });
  });

  it("3-line input -> 4-line JE (3 Dr + 1 aggregated Cr), balanced", () => {
    const { composition, manifestPayloadDraft } = composeApAccrual(
      baseInput({
        lines: [
          { vendorName: "Acme", invoiceNumber: "INV-1", invoiceDate: "2026-06-10", amount: 100, expenseAccountId: "60", expenseAccountName: "Office" },
          { vendorName: "Beta LLC", invoiceNumber: "INV-2", invoiceDate: "2026-06-12", amount: 200, expenseAccountId: "61", expenseAccountName: "Utilities" },
          { vendorName: "Gamma", invoiceNumber: "INV-3", invoiceDate: "2026-06-14", amount: 50, expenseAccountId: "62", expenseAccountName: "Travel" },
        ],
      }),
    );
    expect(composition.lines).toHaveLength(4);
    const dr = composition.lines.filter((l) => l.drAmount > 0).reduce((s, l) => s + l.drAmount, 0);
    const cr = composition.lines.filter((l) => l.crAmount > 0).reduce((s, l) => s + l.crAmount, 0);
    expect(dr).toBe(350);
    expect(cr).toBe(350);
    expect(manifestPayloadDraft.totalAccrued).toBe(350);
    expect(composition.lines[3]).toMatchObject({ crAmount: 350, accountId: "42" });
  });

  it("manifest draft populates canonical vendor+invoice, matchStatus=open, totalAccrued matches", () => {
    const { manifestPayloadDraft } = composeApAccrual(baseInput());
    expect(manifestPayloadDraft.lines[0]).toMatchObject({
      vendorCanonical: "ACME",
      invoiceNumberCanonical: "4471",
      matchStatus: "open",
      matchedBillId: null,
    });
    expect(manifestPayloadDraft.totalAccrued).toBe(500);
    expect(manifestPayloadDraft).not.toHaveProperty("bookedAttemptId");
    expect(manifestPayloadDraft).not.toHaveProperty("bookedAt");
  });

  it("every JE line carries evidence with type=system_calculation, sourceType=ap_accrual_booking, canonical keys", () => {
    const { composition } = composeApAccrual(baseInput());
    for (const line of composition.lines) {
      expect(line.evidence.evidenceType).toBe("system_calculation");
      expect(line.evidence.sourceType).toBe("ap_accrual_booking");
    }
    expect(composition.lines[0].evidence.sourceKey).toMatchObject({
      vendor_canonical: "ACME",
      invoice_number_canonical: "4471",
    });
  });

  it("throws on empty lines", () => {
    expect(() => composeApAccrual(baseInput({ lines: [] }))).toThrow(/at least one line/);
  });

  it("throws on zero amount", () => {
    expect(() =>
      composeApAccrual(baseInput({ lines: [{ ...baseInput().lines[0], amount: 0 }] })),
    ).toThrow(/positive/);
  });

  it("throws on negative amount", () => {
    expect(() =>
      composeApAccrual(baseInput({ lines: [{ ...baseInput().lines[0], amount: -1 }] })),
    ).toThrow(/positive/);
  });

  it("throws when vendorName or invoiceNumber missing", () => {
    expect(() =>
      composeApAccrual(baseInput({ lines: [{ ...baseInput().lines[0], vendorName: "" }] })),
    ).toThrow(/required for accrual matching/);
    expect(() =>
      composeApAccrual(baseInput({ lines: [{ ...baseInput().lines[0], invoiceNumber: "" }] })),
    ).toThrow(/required for accrual matching/);
  });
});

// ---- Poster surgical-wire tests ----

type AuditRow = Record<string, unknown>;

function makePosterSupabase(auditRows: AuditRow[]) {
  return {
    from(table: string) {
      if (table === "je_post_attempts") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: { attempt_id: "att-1", status: "pending", qbo_je_id: null },
                error: null,
              }),
            }),
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      if (table === "firm_clients") {
        return {
          select: () => ({
            eq: () => ({ single: async () => ({ data: { accounting_method: "accrual" }, error: null }) }),
          }),
        };
      }
      if (table === "je_posting_audit") {
        return {
          insert: async (row: AuditRow) => {
            auditRows.push(row);
            return { error: null };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

function jePostRequestWithComposition(composition: unknown) {
  return {
    firm_client_id: "fc-1",
    idempotency_key: "accrual-cp-1",
    source_type: "rule" as const,
    posted_by: "ai" as const,
    payload: {
      transaction_date: "2026-06-30",
      narration: "June AP accrual",
      lines: [
        { account_id: "60", amount: 500, posting_type: "Debit" as const },
        { account_id: "42", amount: 500, posting_type: "Credit" as const },
      ],
    },
    composition,
  };
}

describe("poster surgical wire (D6.4b)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canPostToQBO.mockResolvedValue({ canWrite: true });
    resolveQBOTokenForFirmClient.mockResolvedValue({ realmId: "r1", accessToken: "tok" });
    validateJEPayload.mockResolvedValue({ valid: true });
    recordMemory.mockResolvedValue({ memory_id: "m1", persistence_status: "persisted" });
    persistJeEvidence.mockResolvedValue(["ev-0", "ev-1"]);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ JournalEntry: { Id: "QBO-JE-1" } }),
    });
  });

  it("invokes persistJeEvidence with the composition, then dispatchBackupPacket after post success", async () => {
    const auditRows: AuditRow[] = [];
    getSupabaseAdmin.mockReturnValue(makePosterSupabase(auditRows));
    const { composition } = composeApAccrual(baseInput());

    const result = await qboJournalEntryPoster.post(
      jePostRequestWithComposition(composition) as never,
    );

    expect(result.status).toBe("posted");
    expect(persistJeEvidence).toHaveBeenCalledTimes(1);
    expect(persistJeEvidence.mock.calls[0][0]).toMatchObject({
      attemptId: "att-1",
      firmClientId: "fc-1",
      composition,
    });
    expect(dispatchBackupPacket).toHaveBeenCalledWith(expect.anything(), "att-1", "fc-1");
  });

  it("fails the post with rejection_reason=evidence_contract_violation when persist throws; no qbo_je_id written", async () => {
    const auditRows: AuditRow[] = [];
    getSupabaseAdmin.mockReturnValue(makePosterSupabase(auditRows));
    persistJeEvidence.mockRejectedValue(new Error("line missing evidence (contract violation)"));
    const { composition } = composeApAccrual(baseInput());

    const result = await qboJournalEntryPoster.post(
      jePostRequestWithComposition(composition) as never,
    );

    expect(result.status).toBe("rejected");
    expect((result as { reason: string }).reason).toBe("evidence_contract_violation");
    expect(dispatchBackupPacket).not.toHaveBeenCalled();
    const audit = auditRows.find((r) => r.status === "rejected");
    expect(audit).toBeTruthy();
    expect(audit?.rejection_reason).toBe("evidence_contract_violation");
    expect(audit?.qbo_je_id ?? null).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
