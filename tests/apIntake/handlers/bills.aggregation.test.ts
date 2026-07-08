/**
 * Integration test — bills handler L6 anomaly + L11 fraud score aggregation wiring.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = {
  resolveVendor: vi.fn<(...args: unknown[]) => unknown>(),
  extractRemittance: vi.fn<(...args: unknown[]) => unknown>(),
  detectBankChange: vi.fn<(...args: unknown[]) => unknown>(),
  detectDuplicates: vi.fn<(...args: unknown[]) => unknown>(),
  detectAnomalies: vi.fn<(...args: unknown[]) => unknown>(),
  aggregateFraudScore: vi.fn<(...args: unknown[]) => unknown>(),
  writeBillHistoryRow: vi.fn<(...args: unknown[]) => unknown>(),
  quarantineBill: vi.fn<(...args: unknown[]) => unknown>(async () => ({ quarantineId: "q-fraud" })),
  fingerprintExtract: vi.fn<(...args: unknown[]) => unknown>(),
  computeDrift: vi.fn<(...args: unknown[]) => unknown>(),
  renderFirstPageRaster: vi.fn<(...args: unknown[]) => unknown>(async () => Buffer.from("")),
  extractBillText: vi.fn<(...args: unknown[]) => unknown>(() => ({
    raw_text: "Invoice # ANOM-1 Total $9500.00",
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
      received_at: "2026-06-01T14:00:00Z",
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
  mocks.detectDuplicates.mockResolvedValue({
    hits: [],
    highSeverityHits: [],
    shouldQuarantine: false,
    signals: [],
  });
  mocks.detectAnomalies.mockResolvedValue({
    signals: [
      {
        code: "threshold_splitting",
        severity: "HIGH",
        evidence: { prior_matches_14d: 2 },
      },
    ],
    hasHighSeverity: true,
  });
  mocks.aggregateFraudScore.mockResolvedValue({
    bill_id: "bill-1",
    score: 0.35,
    contributions: [
      {
        layer: "L6",
        code: "threshold_splitting",
        severity: "HIGH",
        contribution: 0.35,
        evidence: { prior_matches_14d: 2 },
      },
    ],
    quarantine_recommended: false,
  });
  mocks.fingerprintExtract.mockResolvedValue({
    layout_bboxes: [],
    font_families: [],
    color_palette: [],
    phash: Buffer.alloc(8),
    dhash: Buffer.alloc(8),
    extractor_version: "v1",
  });
});

describe("bills handler L6 + L11 aggregation wiring", () => {
  it("runs detectAnomalies and merges L6 signals into aggregateFraudScore", async () => {
    const { handleBills } = await import("@/lib/intake/handlers/bills");
    const r = await handleBills(makeCtx());
    if (r.status !== "success") throw new Error(`expected success, got ${r.status}`);

    expect(mocks.detectAnomalies).toHaveBeenCalledWith(
      expect.objectContaining({
        firmClientId: "fc1",
        vendorId: "v1",
        billId: "bill-1",
        receivedAt: "2026-06-01T14:00:00Z",
      }),
    );
    expect(mocks.aggregateFraudScore).toHaveBeenCalledWith(
      expect.objectContaining({
        billId: "bill-1",
        signals: expect.arrayContaining([
          expect.objectContaining({ layer: "L6", code: "threshold_splitting", severity: "HIGH" }),
        ]),
      }),
    );
    expect(mocks.writeBillHistoryRow).toHaveBeenCalledWith(
      expect.objectContaining({ billId: "bill-1", quarantined: false }),
    );
    expect(mocks.quarantineBill).not.toHaveBeenCalled();
    expect(r.detail.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "threshold_splitting", severity: "HIGH" }),
      ]),
    );
  });

  it("quarantines on fraud score threshold and writes quarantined bill history", async () => {
    mocks.aggregateFraudScore.mockResolvedValue({
      bill_id: "bill-1",
      score: 0.95,
      contributions: [
        {
          layer: "L6",
          code: "threshold_splitting",
          severity: "HIGH",
          contribution: 0.35,
          evidence: {},
        },
        {
          layer: "L5",
          code: "duplicate_flagged",
          severity: "MEDIUM",
          contribution: 0.2,
          evidence: {},
        },
      ],
      quarantine_recommended: true,
    });
    mocks.detectDuplicates.mockResolvedValue({
      hits: [],
      highSeverityHits: [],
      shouldQuarantine: false,
      signals: [{ code: "duplicate_flagged", severity: "MEDIUM", evidence: {} }],
    });

    const { handleBills } = await import("@/lib/intake/handlers/bills");
    const r = await handleBills(makeCtx());
    if (r.status !== "success") throw new Error(`expected success, got ${r.status}`);

    expect(mocks.quarantineBill).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "fraud_score_threshold" }),
    );
    expect(mocks.writeBillHistoryRow).toHaveBeenCalledWith(
      expect.objectContaining({ billId: "bill-1", quarantined: true }),
    );
    expect(r.detail.quarantine_id).toBe("q-fraud");
    expect(r.detail.fraud_score_threshold).toEqual(
      expect.objectContaining({ score: 0.95 }),
    );
  });
});
