/**
 * Integration test — bills handler L3 wiring.
 * Verifies that exact-match + changed bank forces quarantine and skips fingerprint.
 * We use module mocks to isolate the handler from the real supabase + downstream code.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = {
  resolveVendor: vi.fn<(...args: unknown[]) => unknown>(),
  extractRemittance: vi.fn<(...args: unknown[]) => unknown>(),
  detectBankChange: vi.fn<(...args: unknown[]) => unknown>(),
  quarantineBill: vi.fn<(...args: unknown[]) => unknown>(async () => ({ quarantineId: "q-new" })),
  fingerprintExtract: vi.fn<(...args: unknown[]) => unknown>(),
  computeDrift: vi.fn<(...args: unknown[]) => unknown>(),
  renderFirstPageRaster: vi.fn<(...args: unknown[]) => unknown>(async () => Buffer.from("")),
  extractBillText: vi.fn<(...args: unknown[]) => unknown>(() => ({
    raw_text: "routing 021000021 account 1234567890",
    mime_type: "text/plain",
    bill_id: null,
  })),
  acceptsBillsMime: vi.fn<(...args: unknown[]) => unknown>(() => true),
  publishEvent: vi.fn<(...args: unknown[]) => unknown>(async () => ({
    eventId: "e1",
    eventSequence: 1,
    eventType: "t",
    eventCategory: "ap",
    occurredAt: new Date(),
    recordedAt: new Date(),
  })),
  assertEntitlement: vi.fn<(...args: unknown[]) => unknown>(async () => undefined),
  detectDuplicates: vi.fn<(...args: unknown[]) => unknown>(async () => ({
    hits: [],
    highSeverityHits: [],
    shouldQuarantine: false,
    signals: [],
  })),
  detectAnomalies: vi.fn<(...args: unknown[]) => unknown>(async () => ({ signals: [], hasHighSeverity: false })),
  aggregateFraudScore: vi.fn<(...args: unknown[]) => unknown>(async () => ({
    bill_id: "bill-1",
    score: 0,
    contributions: [],
    quarantine_recommended: false,
  })),
  writeBillHistoryRow: vi.fn<(...args: unknown[]) => unknown>(async () => undefined),
};

vi.mock("@/lib/ap-intake/vendor/resolver", () => ({
  resolveVendor: (...a: unknown[]) => mocks.resolveVendor(...a),
}));
vi.mock("@/lib/ap-intake/l3/remittance-extractor", () => ({
  extractRemittance: (...a: unknown[]) => mocks.extractRemittance(...a),
}));
vi.mock("@/lib/ap-intake/l3/bank-change-detector", () => ({
  detectBankChange: (...a: unknown[]) => mocks.detectBankChange(...a),
}));
vi.mock("@/lib/ap-intake/quarantine/quarantine-service", () => ({
  quarantineBill: (...a: unknown[]) => mocks.quarantineBill(...a),
}));
vi.mock("@/lib/ap-intake/fingerprint/extractor", () => ({
  computeDrift: (...a: unknown[]) => mocks.computeDrift(...a),
  fingerprintExtract: (...a: unknown[]) => mocks.fingerprintExtract(...a),
  EXTRACTOR_VERSION: "v1",
}));
vi.mock("@/lib/ap-intake/bills/helpers", () => ({
  acceptsBillsMime: (...a: unknown[]) => mocks.acceptsBillsMime(...a),
  extractBillText: (...a: unknown[]) => mocks.extractBillText(...a),
  renderFirstPageRaster: (...a: unknown[]) => mocks.renderFirstPageRaster(...a),
}));
vi.mock("@/lib/events/publisher", () => ({
  publishEvent: (...a: unknown[]) => mocks.publishEvent(...a),
}));
vi.mock("@/lib/entitlements/gate", () => ({
  assertEntitlement: (...a: unknown[]) => mocks.assertEntitlement(...a),
  EntitlementDenied: class extends Error {},
}));
vi.mock("@/lib/ap-intake/duplicate/detector", () => ({
  detectDuplicates: (...a: unknown[]) => mocks.detectDuplicates(...a),
}));
vi.mock("@/lib/ap-intake/anomaly/detector", () => ({
  detectAnomalies: (...a: unknown[]) => mocks.detectAnomalies(...a),
}));
vi.mock("@/lib/ap-intake/scoring/aggregator", () => ({
  aggregateFraudScore: (...a: unknown[]) => mocks.aggregateFraudScore(...a),
}));
vi.mock("@/lib/ap-intake/history/bill-history-writer", () => ({
  writeBillHistoryRow: (...a: unknown[]) => mocks.writeBillHistoryRow(...a),
}));

function makeCtx() {
  return {
    supabase: {
      from(table: string) {
        if (table === "engagements") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: { id: "e1" } }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "ap_intake_bills") {
          return {
            insert: () => ({
              select: () => ({ single: async () => ({ data: { id: "bill-1" }, error: null }) }),
            }),
            update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { fraud_score_current: 0 }, error: null }),
              }),
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
                      maybeSingle: async () => ({ data: null }),
                    }),
                  }),
                }),
              }),
            }),
            insert: () => Promise.resolve({ data: null, error: null }),
          };
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
        throw new Error(`unexpected ${table}`);
      },
    },
    message: {
      id: "m1",
      firm_id: "f1",
      company_id: "c1",
      firm_client_id: "fc1",
      source_channel: "email",
      source_message_id: "src-1",
      recipient_address: null,
      recipient_prefix: null,
      recipient_firm_slug: null,
      recipient_token: null,
      sender_email: null,
      sender_domain: null,
      subject: null,
      received_at: new Date().toISOString(),
      raw_body_text: "",
      raw_body_html: null,
      raw_headers: null,
      raw_payload: null,
      content_hash: "h",
    },
    attachments: [
      {
        id: "a",
        filename: "bill.pdf",
        content_type: "application/pdf",
        content_length: 100,
        content_sha256: "s",
        content_base64: "",
        is_duplicate_of: null,
      },
    ],
  } as unknown as import("@/lib/intake/types").IntakeHandlerContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.extractRemittance.mockReturnValue({
    routing_number: "021000021",
    account_number: "1234567890",
    raw_snippet: "routing 021000021 account 1234567890",
  });
});

describe("bills handler L3 wiring", () => {
  it("exact match + changed bank → quarantine + fingerprint_deferred + no fingerprint call", async () => {
    mocks.resolveVendor.mockResolvedValue({
      method: "exact",
      resolved_vendor_id: "v1",
      candidate_ids: [],
      confidence: 1.0,
      signals: [],
    });
    mocks.detectBankChange.mockResolvedValue({
      changed: true,
      known: false,
      prior_hash: "OLD",
      current_hash: "NEW",
      current_last4: { routing: "0021", account: "7890" },
      signals: [{ code: "bank_change_detected", severity: "HIGH", evidence: {} }],
    });

    const { handleBills } = await import("@/lib/intake/handlers/bills");
    const r = await handleBills(makeCtx());
    if (r.status !== "success") throw new Error(`expected success, got ${r.status}`);
    expect(r.detail.fingerprint_deferred).toBe(true);
    expect(r.detail.quarantine_id).toBe("q-new");
    expect(mocks.quarantineBill).toHaveBeenCalledTimes(1);
    expect(mocks.fingerprintExtract).not.toHaveBeenCalled();
  });

  it("exact match + unchanged bank → fingerprint runs, no quarantine", async () => {
    mocks.resolveVendor.mockResolvedValue({
      method: "exact",
      resolved_vendor_id: "v1",
      candidate_ids: [],
      confidence: 1.0,
      signals: [],
    });
    mocks.detectBankChange.mockResolvedValue({
      changed: false,
      known: true,
      prior_hash: "SAME",
      current_hash: "SAME",
      current_last4: { routing: "0021", account: "7890" },
      signals: [],
    });
    mocks.fingerprintExtract.mockResolvedValue({
      layout_bboxes: [],
      font_families: [],
      color_palette: [],
      phash: Buffer.alloc(8),
      dhash: Buffer.alloc(8),
      extractor_version: "v1",
    });

    const { handleBills } = await import("@/lib/intake/handlers/bills");
    const r = await handleBills(makeCtx());
    if (r.status !== "success") throw new Error(`expected success, got ${r.status}`);
    expect(mocks.quarantineBill).not.toHaveBeenCalled();
    expect(mocks.fingerprintExtract).toHaveBeenCalledTimes(1);
    expect(r.detail.fingerprint_deferred).toBeUndefined();
  });

  it("exact match + no remittance parsed → fingerprint runs, no quarantine", async () => {
    mocks.resolveVendor.mockResolvedValue({
      method: "exact",
      resolved_vendor_id: "v1",
      candidate_ids: [],
      confidence: 1.0,
      signals: [],
    });
    mocks.extractRemittance.mockReturnValue({
      routing_number: null,
      account_number: null,
      raw_snippet: null,
    });
    mocks.detectBankChange.mockResolvedValue({
      changed: false,
      known: false,
      prior_hash: null,
      current_hash: null,
      current_last4: null,
      signals: [],
    });
    mocks.fingerprintExtract.mockResolvedValue({
      layout_bboxes: [],
      font_families: [],
      color_palette: [],
      phash: Buffer.alloc(8),
      dhash: Buffer.alloc(8),
      extractor_version: "v1",
    });

    const { handleBills } = await import("@/lib/intake/handlers/bills");
    const r = await handleBills(makeCtx());
    if (r.status !== "success") throw new Error(`expected success, got ${r.status}`);
    expect(mocks.quarantineBill).not.toHaveBeenCalled();
    expect(mocks.fingerprintExtract).toHaveBeenCalledTimes(1);
  });

  it("no_match → quarantine even without bank change path", async () => {
    mocks.resolveVendor.mockResolvedValue({
      method: "no_match",
      resolved_vendor_id: null,
      candidate_ids: [],
      confidence: 0,
      signals: [
        {
          code: "no_match_route_to_quarantine",
          severity: "HIGH",
          evidence: {},
        },
      ],
    });
    mocks.quarantineBill.mockResolvedValue({ quarantineId: "q-nm" });

    const { handleBills } = await import("@/lib/intake/handlers/bills");
    const r = await handleBills(makeCtx());
    if (r.status !== "success") throw new Error(`expected success, got ${r.status}`);
    expect(r.detail.quarantine_id).toBe("q-nm");
    expect(mocks.quarantineBill).toHaveBeenCalledTimes(1);
    expect(mocks.detectBankChange).not.toHaveBeenCalled();
    expect(mocks.fingerprintExtract).not.toHaveBeenCalled();
  });

  it("fuzzy_candidate → quarantine, bank detection not attempted", async () => {
    mocks.resolveVendor.mockResolvedValue({
      method: "fuzzy_candidate",
      resolved_vendor_id: null,
      candidate_ids: ["v1", "v2"],
      confidence: 0.82,
      signals: [
        {
          code: "fuzzy_candidates_pending_review",
          severity: "INFO",
          evidence: { candidate_ids: ["v1", "v2"] },
        },
      ],
    });
    mocks.quarantineBill.mockResolvedValue({ quarantineId: "q-fz" });

    const { handleBills } = await import("@/lib/intake/handlers/bills");
    const r = await handleBills(makeCtx());
    if (r.status !== "success") throw new Error(`expected success, got ${r.status}`);
    expect(r.detail.quarantine_id).toBe("q-fz");
    expect(mocks.detectBankChange).not.toHaveBeenCalled();
    expect(mocks.fingerprintExtract).not.toHaveBeenCalled();
  });
});
