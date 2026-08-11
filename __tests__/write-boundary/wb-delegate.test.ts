import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

process.env.WRITE_BOUNDARY_ENABLED = "true";

vi.mock("@/lib/supabase-admin.js", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/integrations/quickbooks/accounting-provider", () => ({
  quickBooksWriteProvider: {
    writeJournalEntry: vi.fn(),
    voidJournalEntry: vi.fn(),
  },
}));
vi.mock("@/lib/integrations/shared/load-connection-for-firm-client", () => ({
  loadQboConnectionForFirmClient: vi.fn(),
}));
vi.mock("@/lib/memory/client-memory-service", () => ({ recordMemory: vi.fn() }));
vi.mock("@/lib/assertions/resolve-rule-assertions", () => ({
  resolveFireAssertions: vi.fn(async () => []),
}));
vi.mock("@/lib/je-evidence/persist", () => ({ persistJeEvidence: vi.fn() }));
vi.mock("@/lib/je-evidence/dispatch-hook", () => ({ dispatchBackupPacket: vi.fn() }));
vi.mock("@/lib/accounting/write-boundary/type-adapters", () => ({
  jePayloadToJournalEntry: vi.fn((args: {
    tenantId: string;
    homeCurrency: string;
    externalRef: string;
    payload: {
      transaction_date: string;
      narration?: string;
      lines: Array<{
        account_id: string;
        posting_type: "Debit" | "Credit";
        amount: number;
        description?: string;
      }>;
    };
  }) => ({
    tenantId: args.tenantId,
    journalDate: args.payload.transaction_date,
    narration: args.payload.narration ?? "",
    currency: args.homeCurrency,
    status: "POSTED",
    externalRef: args.externalRef,
    lines: args.payload.lines.map((l) => ({
      accountCode: l.account_id,
      debit: l.posting_type === "Debit" ? Number(l.amount) : 0,
      credit: l.posting_type === "Credit" ? Number(l.amount) : 0,
      description: l.description,
    })),
  })),
}));

import { postViaWriteBoundary } from "@/lib/erp/quickbooks/journal-entry-poster.wb-delegate";
import { quickBooksWriteProvider } from "@/lib/integrations/quickbooks/accounting-provider";
import { loadQboConnectionForFirmClient } from "@/lib/integrations/shared/load-connection-for-firm-client";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { recordMemory } from "@/lib/memory/client-memory-service";
import {
  WriteRejected,
  WriteFailed,
  WriteDrifted,
  WriteBoundaryDisabled,
} from "@/lib/accounting/write-boundary/types";

function makeSupabaseMock(opts: {
  attempt?: { attempt_id: string };
  duplicate?: boolean;
  firmClient?: { accounting_method: string | null };
} = {}) {
  const attempt = opts.attempt ?? { attempt_id: "attempt-1" };
  const fc = opts.firmClient ?? { accounting_method: "accrual" };
  return {
    from: vi.fn((table: string) => {
      if (table === "je_post_attempts") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () =>
                opts.duplicate
                  ? { data: null, error: { code: "23505" } }
                  : { data: attempt, error: null },
              ),
            })),
          })),
          update: vi.fn(() => ({ eq: vi.fn(async () => ({})) })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { attempt_id: "existing", status: "posted", qbo_je_id: "999" },
                })),
              })),
            })),
          })),
        };
      }
      if (table === "firm_clients") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: fc })) })),
          })),
        };
      }
      if (table === "je_posting_audit") {
        return { insert: vi.fn(async () => ({})) };
      }
      return { insert: vi.fn(), update: vi.fn(), select: vi.fn() };
    }),
  };
}

const CONN_USD = {
  id: "conn-1",
  user_id: "user-1",
  provider: "quickbooks",
  tenant_or_realm_id: "9341-realm",
  home_currency: "USD",
  is_active: true,
};

const validReq = {
  firm_client_id: "fc-1",
  idempotency_key: "test-1",
  source_type: "manual" as const,
  posted_by: "human" as const,
  posted_by_user_id: "user-1",
  payload: {
    transaction_date: "2026-08-01",
    lines: [
      { account_id: "1", posting_type: "Debit" as const, amount: 100, description: "dr" },
      { account_id: "2", posting_type: "Credit" as const, amount: 100, description: "cr" },
    ],
  },
};

describe("postViaWriteBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeSupabaseMock() as never);
    vi.mocked(loadQboConnectionForFirmClient).mockResolvedValue({ connection: CONN_USD as never });
  });

  it("returns posted on successful provider write and back-writes audit + memory", async () => {
    (quickBooksWriteProvider.writeJournalEntry as Mock).mockResolvedValue({
      providerJournalId: "qbo-je-42",
      status: "POSTED",
      writtenAt: "2026-08-08T00:00:00Z",
      resolvedAccounts: [{ accountCode: "1", accountId: "1" }, { accountCode: "2", accountId: "2" }],
      lifecycleEventIds: ["evt-1", "evt-2"],
    });

    const result = await postViaWriteBoundary(validReq);

    expect(result).toEqual({
      status: "posted",
      attempt_id: "attempt-1",
      qbo_je_id: "qbo-je-42",
    });
    expect(recordMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        memoryType: "posted_je",
        memoryKey: "posted_je_qbo-je-42",
      }),
    );
  });

  it("translates WriteRejected → rejected with issue.code as reason", async () => {
    (quickBooksWriteProvider.writeJournalEntry as Mock).mockRejectedValue(
      new WriteRejected(
        [{ code: "unbalanced-lines", message: "debit != credit" }],
        ["evt-3"],
      ),
    );

    const result = await postViaWriteBoundary({ ...validReq, idempotency_key: "test-2" });
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") expect(result.reason).toBe("unbalanced-lines");
  });

  it("translates WriteDrifted → rejected write_drift_detected", async () => {
    (quickBooksWriteProvider.writeJournalEntry as Mock).mockRejectedValue(
      new WriteDrifted(["account-code-changed"], ["evt-4"], "voided-je-1"),
    );
    const result = await postViaWriteBoundary({ ...validReq, idempotency_key: "test-3" });
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") expect(result.reason).toBe("write_drift_detected");
  });

  it("translates WriteFailed 503 → failed retryable=true", async () => {
    (quickBooksWriteProvider.writeJournalEntry as Mock).mockRejectedValue(
      new WriteFailed("QBO 503", ["evt-5"], 503),
    );
    const result = await postViaWriteBoundary({ ...validReq, idempotency_key: "test-4" });
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toBe("qbo_503");
      expect(result.retryable).toBe(true);
    }
  });

  it("translates WriteBoundaryDisabled → rejected write_gate_failed", async () => {
    (quickBooksWriteProvider.writeJournalEntry as Mock).mockRejectedValue(
      new WriteBoundaryDisabled("kill switch off"),
    );
    const result = await postViaWriteBoundary({ ...validReq, idempotency_key: "test-5" });
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") expect(result.reason).toBe("write_gate_failed");
  });

  it("rejects on cash-basis firm_client before touching provider", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      makeSupabaseMock({ firmClient: { accounting_method: "cash" } }) as never,
    );
    const result = await postViaWriteBoundary({ ...validReq, idempotency_key: "test-6" });
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") expect(result.reason).toBe("cash_basis_notes_only");
    expect(quickBooksWriteProvider.writeJournalEntry).not.toHaveBeenCalled();
  });

  it("rejects on non-home currency (W1 multicurrency gate)", async () => {
    const foreignReq = {
      ...validReq,
      idempotency_key: "test-eur",
      payload: { ...validReq.payload, currency: "EUR" },
    };
    const result = await postViaWriteBoundary(foreignReq);
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toBe("not_home_currency_deferred_w1_5");
    }
    expect(quickBooksWriteProvider.writeJournalEntry).not.toHaveBeenCalled();
  });

  it("returns prior posted attempt on 23505 idempotency collision", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(makeSupabaseMock({ duplicate: true }) as never);
    const result = await postViaWriteBoundary(validReq);
    expect(result).toEqual({
      status: "posted",
      attempt_id: "existing",
      qbo_je_id: "999",
    });
    expect(quickBooksWriteProvider.writeJournalEntry).not.toHaveBeenCalled();
  });

  it("rejects when connection loader throws no_active_qbo_connection", async () => {
    vi.mocked(loadQboConnectionForFirmClient).mockRejectedValue(
      new Error("no_active_qbo_connection_for_owner: user-1"),
    );
    const result = await postViaWriteBoundary({ ...validReq, idempotency_key: "test-noconn" });
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason).toBe("no_active_qbo_connection_for_owner");
    }
  });
});
