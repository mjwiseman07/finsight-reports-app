import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/entitlements/gate", () => ({
  assertEntitlement: vi.fn().mockResolvedValue(undefined),
  EntitlementDenied: class EntitlementDenied extends Error {},
}));

vi.mock("@/lib/ai/action-logger", () => ({
  logAiAction: vi.fn().mockResolvedValue({ actionId: "a1", eventId: "e1" }),
}));

vi.mock("@/lib/events/publisher", () => ({
  publishEvent: vi.fn().mockResolvedValue({ eventId: "evt-1" }),
}));

import { publishEvent } from "@/lib/events/publisher";
import { getHandler, listHandlers } from "@/lib/intake/handlers";
import { handleBills } from "@/lib/intake/handlers/bills";
import { acceptsBillsMime } from "@/lib/ap-intake/bills/helpers";
import type { IntakeHandlerContext } from "@/lib/intake/types";

const mockPublish = vi.mocked(publishEvent);

interface MockState {
  fingerprintRows: Array<Record<string, unknown>>;
  billRows: Array<Record<string, unknown>>;
  quarantineRows?: Array<Record<string, unknown>>;
  versionRows: Array<{ version: number }>;
  priorRow: Record<string, unknown> | null;
}

const now = new Date().toISOString();

function makeCtx(
  overrides: {
    mirrorRows?: Array<Record<string, unknown>>;
    attachmentSeed?: string;
    state?: Partial<MockState>;
    rawBodyText?: string;
  } = {},
): IntakeHandlerContext & { _state: MockState } {
  const mirrorRows = overrides.mirrorRows ?? [
    {
      id: "vendor-1",
      display_name: "Acme Inc",
      normalized_name: "acme",
      metaphone_code: "AKM",
      last_synced_at: now,
    },
  ];
  const state: MockState = {
    fingerprintRows: [],
    billRows: [],
    versionRows: [],
    priorRow: null,
    ...overrides.state,
  };

  const supabase = {
    _state: state,
    from: (table: string) => {
      if (table === "engagements") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: { id: "eng-1" }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "vendor_master_mirror") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: mirrorRows, error: null }),
            }),
          }),
        };
      }
      if (table === "ap_intake_quarantine") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          insert: (row: Record<string, unknown>) => {
            state.quarantineRows = state.quarantineRows ?? [];
            state.quarantineRows.push(row);
            return {
              select: () => ({
                single: async () => ({ data: { id: "q-integration-1" }, error: null }),
              }),
            };
          },
        };
      }
      if (table === "ap_intake_bills") {
        const billSelectChain = {
          select: () => billSelectChain,
          eq: () => billSelectChain,
          neq: () => billSelectChain,
          gte: () => billSelectChain,
          lte: () => billSelectChain,
          not: () => billSelectChain,
          maybeSingle: async () => ({ data: { fraud_score_current: 0 }, error: null }),
          then: (
            resolve: (v: { data: unknown[]; error: null }) => void,
            reject?: (e: unknown) => void,
          ) => Promise.resolve({ data: [], error: null }).then(resolve, reject),
        };
        return {
          insert: (row: Record<string, unknown>) => {
            state.billRows.push(row);
            return {
              select: () => ({
                single: async () => ({ data: { id: "bill-1" }, error: null }),
              }),
            };
          },
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
          select: () => billSelectChain,
        };
      }
      if (table === "ap_intake_bill_duplicates") {
        return {
          upsert: () => Promise.resolve({ error: null }),
        };
      }
      if (table === "vendor_bank_history") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
          insert: () => Promise.resolve({ data: null, error: null }),
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
        };
      }
      if (table === "vendor_invoice_fingerprints") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({
                      data: state.versionRows[0] ?? null,
                      error: null,
                    }),
                  }),
                }),
                eq: () => ({
                  maybeSingle: async () => ({ data: state.priorRow, error: null }),
                }),
              }),
            }),
          }),
          insert: (row: Record<string, unknown>) => {
            state.fingerprintRows.push(row);
            return { error: null };
          },
        };
      }
      if (table === "ap_intake_bill_duplicates") {
        return {
          upsert: () => Promise.resolve({ error: null }),
        };
      }
      if (table === "bill_history") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          gte: () => chain,
          order: () => chain,
          limit: () => Promise.resolve({ data: [], error: null }),
        };
        return { select: () => chain, upsert: () => Promise.resolve({ error: null }) };
      }
      if (table === "fraud_score_signals") {
        return { upsert: () => Promise.resolve({ error: null }) };
      }
      if (table === "pilot_feature_allowlist") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
    },
  };

  return {
    supabase: supabase as never,
    _state: state,
    message: {
      id: "msg-1",
      firm_id: "firm-1",
      company_id: "co-1",
      firm_client_id: "fc-1",
      source_channel: "postmark_inbound",
      source_message_id: overrides.attachmentSeed ?? "pm-1",
      recipient_address: null,
      recipient_prefix: "bills",
      recipient_firm_slug: "acme",
      recipient_token: "tok",
      sender_email: "v@example.com",
      sender_domain: "example.com",
      subject: "Invoice",
      received_at: "2026-07-06T04:00:00Z",
      raw_body_text: overrides.rawBodyText ?? "Acme Inc\nInvoice details",
      raw_body_html: null,
      raw_headers: null,
      raw_payload: {},
      content_hash: "hash",
    },
    attachments: [
      {
        id: "att-1",
        filename: "bill.pdf",
        content_type: "application/pdf",
        content_length: 10,
        content_sha256: "sha-pdf",
        content_base64: Buffer.from("pdf").toString("base64"),
        is_duplicate_of: null,
      },
    ],
  };
}

describe("bills handler integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers on intake bus under alias bills", () => {
    expect(getHandler("bills")?.key).toBe("bills");
    expect(listHandlers().some((h) => h.key === "bills")).toBe(true);
  });

  it("accepts four MIME types and rejects application/octet-stream", () => {
    expect(acceptsBillsMime("application/pdf")).toBe(true);
    expect(acceptsBillsMime("image/png")).toBe(true);
    expect(acceptsBillsMime("image/jpeg")).toBe(true);
    expect(acceptsBillsMime("image/webp")).toBe(true);
    expect(acceptsBillsMime("application/octet-stream")).toBe(false);
  });

  it("persists fingerprint v1 and emits ledger event when vendor resolved", async () => {
    const ctx = makeCtx();
    const result = await handleBills(ctx);
    expect(result.status).toBe("success");
    expect(ctx._state.fingerprintRows).toHaveLength(1);
    expect(ctx._state.fingerprintRows[0].version).toBe(1);
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "fingerprint.new_version_created" }),
      expect.anything(),
    );
  });

  it("version 2 with drifted visuals emits HIGH drift signal", async () => {
    const prior = {
      layout_bboxes: [{ x: 0, y: 0, w: 10, h: 10, region_kind: "header" }],
      font_families: ["sans-serif", "mono-table"],
      color_palette: [[255, 0, 0, 50]],
      phash: Buffer.alloc(8, 0xff),
      dhash: Buffer.alloc(10, 0xff),
      extractor_version: "l4-v1.0.0",
    };
    const ctx = makeCtx({
      attachmentSeed: "drift-seed-2",
      state: {
        versionRows: [{ version: 1 }],
        priorRow: prior,
      },
    });
    const result = await handleBills(ctx);
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(ctx._state.fingerprintRows[0].version).toBe(2);
    const signals = (result.detail as { signals: Array<{ severity: string }> }).signals;
    expect(signals.some((s) => s.severity === "HIGH")).toBe(true);
  });

  it("unresolved vendor returns no_match with zero fingerprint rows", async () => {
    const ctx = makeCtx({ mirrorRows: [] });
    const result = await handleBills(ctx);
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(ctx._state.fingerprintRows).toHaveLength(0);
    const detail = result.detail as {
      signals: Array<{ code: string }>;
      fingerprint_deferred: boolean;
      quarantine_id: string;
    };
    expect(detail.fingerprint_deferred).toBe(true);
    expect(detail.quarantine_id).toBe("q-integration-1");
    expect(detail.signals.some((s) => s.code === "no_match_route_to_quarantine")).toBe(true);
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "bill.quarantined" }),
    );
  });
});
