import { beforeEach, describe, expect, it, vi } from "vitest";
import { basePostPayload, makePosterMockDb } from "./_poster-mock";

const {
  getSupabaseAdmin,
  canPostToQBO,
  resolveQBOTokenForFirmClient,
  validateJEPayload,
  recordMemory,
} = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  canPostToQBO: vi.fn(),
  resolveQBOTokenForFirmClient: vi.fn(),
  validateJEPayload: vi.fn(),
  recordMemory: vi.fn(),
}));

vi.mock("@/lib/supabase-admin.js", () => ({ getSupabaseAdmin }));
vi.mock("@/lib/erp/quickbooks/write-preflight", () => ({ canPostToQBO }));
vi.mock("@/lib/erp/quickbooks/token-resolver", () => ({ resolveQBOTokenForFirmClient }));
vi.mock("@/lib/erp/quickbooks/je-validator", () => ({ validateJEPayload }));
vi.mock("@/lib/memory/client-memory-service", () => ({ recordMemory }));

import { qboJournalEntryPoster } from "@/lib/erp/quickbooks/journal-entry-poster";

let posterDb = makePosterMockDb();

beforeEach(() => {
  posterDb = makePosterMockDb();
  getSupabaseAdmin.mockReturnValue(posterDb);
  canPostToQBO.mockResolvedValue({ canWrite: true });
  resolveQBOTokenForFirmClient.mockResolvedValue({ realmId: "r1", accessToken: "tok" });
  validateJEPayload.mockResolvedValue({ valid: true });
  recordMemory.mockResolvedValue({ memory_id: "m1", persistence_status: "persisted" });
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ JournalEntry: { Id: "QBO-1" } }),
  });
});

describe("journal-entry-poster assertions propagation", () => {
  it("rule-source post with explicit assertions_addressed writes them verbatim", async () => {
    const result = await qboJournalEntryPoster.post({
      firm_client_id: "fc1",
      idempotency_key: "k1",
      source_type: "rule",
      source_id: "ri-1",
      posted_by: "human",
      payload: basePostPayload(),
      assertions_addressed: ["completeness"],
      data_source_reliability_basis: "rule_synthesized_from_qbo_ledger",
    });
    expect(result.status).toBe("posted");
    expect(posterDb.auditRows[0].assertions_addressed).toEqual(["completeness"]);
    expect(posterDb.auditRows[0].data_source_reliability_basis).toBe(
      "rule_synthesized_from_qbo_ledger",
    );
  });

  it("rule-source post with undefined assertions_addressed falls back to resolveFireAssertions", async () => {
    posterDb.__seed("curated_rule_fires", [{ fire_id: "fire-x", rule_id: "gen.rule" }]);
    posterDb.__seed("rule_assertion_coverage", [
      { rule_id: "gen.rule", assertion_id: "accuracy" },
      { rule_id: "gen.rule", assertion_id: "cutoff" },
    ]);
    await qboJournalEntryPoster.post({
      firm_client_id: "fc1",
      idempotency_key: "k2",
      source_type: "rule",
      source_id: "fire-x",
      posted_by: "human",
      payload: basePostPayload(),
    });
    expect(posterDb.auditRows[0].assertions_addressed).toEqual(["accuracy", "cutoff"]);
    expect(posterDb.auditRows[0].data_source_reliability_basis).toBe(
      "rule_synthesized_from_qbo_ledger",
    );
  });

  it("rule-source post with explicit empty assertions_addressed writes empty (no fallback)", async () => {
    posterDb.__seed("curated_rule_fires", [{ fire_id: "fire-x", rule_id: "gen.rule" }]);
    posterDb.__seed("rule_assertion_coverage", [{ rule_id: "gen.rule", assertion_id: "accuracy" }]);
    await qboJournalEntryPoster.post({
      firm_client_id: "fc1",
      idempotency_key: "k3",
      source_type: "rule",
      source_id: "fire-x",
      posted_by: "human",
      payload: basePostPayload(),
      assertions_addressed: [],
    });
    expect(posterDb.auditRows[0].assertions_addressed).toEqual([]);
  });

  it("manual-source post with undefined assertions_addressed writes empty", async () => {
    await qboJournalEntryPoster.post({
      firm_client_id: "fc1",
      idempotency_key: "k4",
      source_type: "manual",
      posted_by: "human",
      payload: basePostPayload(),
    });
    expect(posterDb.auditRows[0].assertions_addressed).toEqual([]);
  });

  it("non-empty assertions_addressed requires data_source_reliability_basis", async () => {
    await qboJournalEntryPoster.post({
      firm_client_id: "fc1",
      idempotency_key: "k5",
      source_type: "rule",
      posted_by: "human",
      payload: basePostPayload(),
      assertions_addressed: ["completeness"],
      data_source_reliability_basis: "qbo_api_authenticated",
    });
    expect(posterDb.auditRows[0].data_source_reliability_basis).toBe("qbo_api_authenticated");
  });

  it("rejected post also carries assertions_addressed (finalizeReject path)", async () => {
    canPostToQBO.mockResolvedValue({ canWrite: false, reason: "write_disabled" });
    await qboJournalEntryPoster.post({
      firm_client_id: "fc1",
      idempotency_key: "k6",
      source_type: "rule",
      posted_by: "human",
      payload: basePostPayload(),
      assertions_addressed: ["accuracy"],
      data_source_reliability_basis: "rule_synthesized_from_qbo_ledger",
    });
    expect(posterDb.auditRows[0].status).toBe("rejected");
    expect(posterDb.auditRows[0].assertions_addressed).toEqual(["accuracy"]);
  });

  it("failed post also carries assertions_addressed (finalizeFail path)", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    await qboJournalEntryPoster.post({
      firm_client_id: "fc1",
      idempotency_key: "k7",
      source_type: "rule",
      posted_by: "human",
      payload: basePostPayload(),
      assertions_addressed: ["cutoff"],
      data_source_reliability_basis: "rule_synthesized_from_qbo_ledger",
    });
    expect(posterDb.auditRows[0].status).toBe("failed");
    expect(posterDb.auditRows[0].assertions_addressed).toEqual(["cutoff"]);
  });

  it("reverse propagates original assertions_addressed and reliability_basis", async () => {
    posterDb.auditRows.push({
      attempt_id: "orig-att",
      firm_client_id: "fc1",
      status: "posted",
      payload_json: basePostPayload(),
      assertions_addressed: ["existence_occurrence"],
      data_source_reliability_basis: "rule_synthesized_from_qbo_ledger",
      qbo_je_id: "QBO-ORIG",
    });
    const innerFrom = posterDb.from as unknown as (table: string) => object;
    posterDb.from = vi.fn((table: string) => {
      if (table === "je_posting_audit") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({
                  data: posterDb.auditRows[0],
                  error: null,
                }),
              }),
            }),
          }),
          insert: async (row: Record<string, unknown>) => {
            posterDb.auditRows.push(row);
            return { error: null };
          },
        };
      }
      return innerFrom(table);
    }) as typeof posterDb.from;

    await qboJournalEntryPoster.reverse("orig-att", "test", "u1");
    const reversal = posterDb.auditRows.find((r) => r.source_type === "reversal");
    expect(reversal?.assertions_addressed).toEqual(["existence_occurrence"]);
    expect(reversal?.data_source_reliability_basis).toBe("rule_synthesized_from_qbo_ledger");
  });
});
