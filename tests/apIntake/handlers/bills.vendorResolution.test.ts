import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/entitlements/gate", () => ({
  assertEntitlement: vi.fn().mockResolvedValue(undefined),
  EntitlementDenied: class extends Error {},
}));
vi.mock("@/lib/events/publisher", () => ({
  publishEvent: vi.fn().mockResolvedValue({ eventId: "e1" }),
}));
vi.mock("@/lib/ap-intake/fingerprint/extractor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ap-intake/fingerprint/extractor")>();
  return {
    ...actual,
    fingerprintExtract: vi.fn().mockResolvedValue({
      layout_bboxes: [],
      font_families: [],
      color_palette: [],
      phash: Buffer.alloc(8),
      dhash: Buffer.alloc(8),
      extractor_version: "test",
    }),
  };
});

import { handleBills } from "@/lib/intake/handlers/bills";
import type { IntakeHandlerContext } from "@/lib/intake/types";

const now = new Date().toISOString();

function makeCtx(mirrorRows: Array<Record<string, unknown>>): IntakeHandlerContext {
  const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
  const supabase = {
    from: (table: string) => {
      if (table === "ap_intake_quarantine") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          insert: (row: Record<string, unknown>) => {
            inserts.push({ table, row });
            return {
              select: () => ({
                single: async () => ({ data: { id: "q-vendor-res-1" }, error: null }),
              }),
            };
          },
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
          select: () => billSelectChain,
          insert: (row: Record<string, unknown>) => {
            inserts.push({ table, row });
            return {
              select: () => ({
                single: async () => ({ data: { id: "bill-1" }, error: null }),
              }),
            };
          },
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
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
      return {
        select: () => ({
          eq: (_col1: string, _v1: unknown) => {
            if (table === "vendor_master_mirror") {
              return { eq: () => Promise.resolve({ data: mirrorRows, error: null }) };
            }
            return {
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: { id: "eng-1" }, error: null }),
                }),
                order: () => ({
                  limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
                }),
                eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
              }),
            };
          },
        }),
        insert: (row: Record<string, unknown>) => {
          inserts.push({ table, row });
          if (table === "vendor_invoice_fingerprints") {
            return { error: null };
          }
          return {
            select: () => ({
              single: async () => ({ data: { id: "bill-1" }, error: null }),
            }),
          };
        },
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      };
    },
    _inserts: inserts,
  };
  return {
    supabase: supabase as never,
    message: {
      id: "msg-1",
      firm_id: "firm-1",
      company_id: "co-1",
      firm_client_id: "fc-1",
      source_channel: "postmark_inbound",
      source_message_id: "pm-1",
      recipient_address: null,
      recipient_prefix: null,
      recipient_firm_slug: null,
      recipient_token: null,
      sender_email: "v@acme.com",
      sender_domain: "acme.com",
      subject: "Invoice",
      received_at: now,
      raw_body_text: "Acme Inc\nInvoice 123",
      raw_body_html: null,
      raw_headers: null,
      raw_payload: null,
      content_hash: "h",
    },
    attachments: [
      {
        id: "att-1",
        filename: "b.pdf",
        content_type: "application/pdf",
        content_length: 10,
        content_sha256: "sha",
        content_base64: Buffer.from("pdf").toString("base64"),
        is_duplicate_of: null,
      },
    ],
  };
}

describe("bills handler — vendor resolution outcomes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exact match runs fingerprint path", async () => {
    const ctx = makeCtx([
      {
        id: "v1",
        display_name: "Acme Inc",
        normalized_name: "acme",
        metaphone_code: "AKM",
        last_synced_at: now,
      },
    ]);
    const result = await handleBills(ctx);
    expect(result.status).toBe("success");
    const inserts = (ctx.supabase as { _inserts: Array<{ table: string; row: Record<string, unknown> }> })
      ._inserts;
    expect(
      inserts.some(
        (i) => i.table === "ap_intake_bills" && i.row.vendor_resolution_method === "exact",
      ),
    ).toBe(true);
    expect(inserts.some((i) => i.table === "vendor_invoice_fingerprints")).toBe(true);
  });

  it("no match defers fingerprint and emits quarantine signal", async () => {
    const ctx = makeCtx([]);
    const result = await handleBills(ctx);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      const signals = (result.detail.signals as Array<{ code: string }>) ?? [];
      expect(signals.some((s) => s.code === "no_match_route_to_quarantine")).toBe(true);
      expect(result.detail.quarantine_id).toBe("q-vendor-res-1");
    }
    const inserts = (ctx.supabase as { _inserts: Array<{ table: string; row: Record<string, unknown> }> })
      ._inserts;
    expect(inserts.some((i) => i.table === "vendor_invoice_fingerprints")).toBe(false);
    expect(inserts.some((i) => i.table === "ap_intake_quarantine")).toBe(true);
    expect(
      inserts.some(
        (i) => i.table === "ap_intake_bills" && i.row.vendor_resolution_method === "no_match",
      ),
    ).toBe(true);
  });

  it("fuzzy candidate populates candidate_ids and defers fingerprint", async () => {
    const ctx = makeCtx([
      {
        id: "v1",
        display_name: "Acme Widgets",
        normalized_name: "acme widgets",
        metaphone_code: "AKMWJTS",
        last_synced_at: now,
      },
    ]);
    ctx.message.raw_body_text = "Acme Widget\nInvoice 123";
    const result = await handleBills(ctx);
    expect(result.status).toBe("success");
    const inserts = (ctx.supabase as { _inserts: Array<{ table: string; row: Record<string, unknown> }> })
      ._inserts;
    const billInsert = inserts.find((i) => i.table === "ap_intake_bills");
    expect(billInsert?.row.vendor_resolution_method).toBe("fuzzy_candidate");
    expect(Array.isArray(billInsert?.row.vendor_candidate_ids)).toBe(true);
    expect(inserts.some((i) => i.table === "vendor_invoice_fingerprints")).toBe(false);
  });
});
