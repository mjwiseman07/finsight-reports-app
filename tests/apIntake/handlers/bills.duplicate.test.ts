/**
 * Integration test — bills handler L5 duplicate detection wiring.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = {
  resolveVendor: vi.fn(),
  extractRemittance: vi.fn(),
  detectBankChange: vi.fn(),
  detectDuplicates: vi.fn(),
  quarantineBill: vi.fn(async () => ({ quarantineId: "q-dup" })),
  fingerprintExtract: vi.fn(),
  computeDrift: vi.fn(),
  renderFirstPageRaster: vi.fn(async () => Buffer.from("")),
  extractBillText: vi.fn(() => ({
    raw_text: "Invoice # DUP-99 Total $100.00",
    mime_type: "text/plain",
    bill_id: null,
  })),
  acceptsBillsMime: vi.fn(() => true),
  publishEvent: vi.fn(async () => ({
    eventId: "e1",
    eventSequence: 1,
    eventType: "t",
    eventCategory: "ap",
    occurredAt: new Date(),
    recordedAt: new Date(),
  })),
  assertEntitlement: vi.fn(async () => undefined),
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
  mocks.fingerprintExtract.mockResolvedValue({
    layout_bboxes: [],
    font_families: [],
    color_palette: [],
    phash: Buffer.alloc(8),
    dhash: Buffer.alloc(8),
    extractor_version: "v1",
  });
});

describe("bills handler L5 duplicate wiring", () => {
  it("HIGH duplicate → quarantine multi_signal + fingerprint_deferred", async () => {
    mocks.detectDuplicates.mockResolvedValue({
      hits: [
        {
          matched_bill_id: "b-old",
          strategy_id: "S1_exact_content_hash",
          confidence: 1,
          severity: "HIGH",
          evidence: {},
        },
      ],
      highSeverityHits: [
        {
          matched_bill_id: "b-old",
          strategy_id: "S1_exact_content_hash",
          confidence: 1,
          severity: "HIGH",
          evidence: {},
        },
      ],
      shouldQuarantine: true,
      signals: [{ code: "duplicate_detected", severity: "HIGH", evidence: {} }],
    });

    const { handleBills } = await import("@/lib/intake/handlers/bills");
    const r = await handleBills(makeCtx());
    if (r.status !== "success") throw new Error(`expected success, got ${r.status}`);
    expect(r.detail.fingerprint_deferred).toBe(true);
    expect(r.detail.quarantine_id).toBe("q-dup");
    expect(mocks.quarantineBill).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "multi_signal" }),
    );
    expect(mocks.fingerprintExtract).not.toHaveBeenCalled();
  });

  it("MEDIUM-only duplicate → fingerprint continues", async () => {
    mocks.detectDuplicates.mockResolvedValue({
      hits: [
        {
          matched_bill_id: "b-fuzzy",
          strategy_id: "S4_fuzzy_amount_window",
          confidence: 0.75,
          severity: "MEDIUM",
          evidence: {},
        },
      ],
      highSeverityHits: [],
      shouldQuarantine: false,
      signals: [{ code: "duplicate_flagged", severity: "MEDIUM", evidence: {} }],
    });

    const { handleBills } = await import("@/lib/intake/handlers/bills");
    const r = await handleBills(makeCtx());
    if (r.status !== "success") throw new Error(`expected success, got ${r.status}`);
    expect(mocks.quarantineBill).not.toHaveBeenCalled();
    expect(mocks.fingerprintExtract).toHaveBeenCalledTimes(1);
    expect(r.detail.signals).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "duplicate_flagged" })]),
    );
  });
});
