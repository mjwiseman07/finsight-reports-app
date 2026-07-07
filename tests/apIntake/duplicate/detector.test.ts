import { describe, it, expect, vi, beforeEach } from "vitest";

const { publishEvent, logAiAction, runS1, runS2, runS3, runS4, persistDuplicateMatch } =
  vi.hoisted(() => ({
    publishEvent: vi.fn().mockResolvedValue({ eventId: "e1" }),
    logAiAction: vi.fn().mockResolvedValue({ actionId: "a1" }),
    runS1: vi.fn(),
    runS2: vi.fn(),
    runS3: vi.fn(),
    runS4: vi.fn(),
    persistDuplicateMatch: vi.fn().mockResolvedValue(undefined),
  }));

vi.mock("@/lib/events/publisher", () => ({ publishEvent }));
vi.mock("@/lib/ai/action-logger", () => ({ logAiAction }));
vi.mock("@/lib/ap-intake/duplicate/strategies/s1-content-hash", () => ({ runS1ContentHash: runS1 }));
vi.mock("@/lib/ap-intake/duplicate/strategies/s2-amount-vendor-date", () => ({
  runS2AmountVendorDate: runS2,
}));
vi.mock("@/lib/ap-intake/duplicate/strategies/s3-invoice-number-vendor", () => ({
  runS3InvoiceNumberVendor: runS3,
}));
vi.mock("@/lib/ap-intake/duplicate/strategies/s4-fuzzy-amount-window", () => ({
  runS4FuzzyAmountWindow: runS4,
}));
vi.mock("@/lib/ap-intake/duplicate/persist", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/ap-intake/duplicate/persist")>();
  return { ...mod, persistDuplicateMatch };
});

import { detectDuplicates } from "@/lib/ap-intake/duplicate/detector";

const supabase = {} as import("@supabase/supabase-js").SupabaseClient;
const baseArgs = {
  supabase,
  firmId: "f1",
  firmClientId: "fc1",
  vendorId: "v1",
  billId: "b-new",
  contentHash: "hash",
  invoiceNumber: "INV-1",
  invoiceDate: "2026-01-01",
  invoiceAmountCents: 10000,
};

beforeEach(() => {
  vi.clearAllMocks();
  runS1.mockResolvedValue([]);
  runS2.mockResolvedValue([]);
  runS3.mockResolvedValue([]);
  runS4.mockResolvedValue([]);
});

describe("detectDuplicates orchestrator", () => {
  it("quarantines on HIGH severity and publishes bill.duplicate_detected", async () => {
    runS1.mockResolvedValue([
      {
        matched_bill_id: "b-old",
        strategy_id: "S1_exact_content_hash",
        confidence: 1,
        severity: "HIGH",
        evidence: {},
      },
    ]);

    const result = await detectDuplicates(baseArgs);
    expect(result.shouldQuarantine).toBe(true);
    expect(result.hits).toHaveLength(1);
    expect(publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "bill.duplicate_detected" }),
      supabase,
    );
    expect(logAiAction).toHaveBeenCalled();
    expect(persistDuplicateMatch).toHaveBeenCalled();
  });

  it("flags MEDIUM-only hits without quarantine", async () => {
    runS4.mockResolvedValue([
      {
        matched_bill_id: "b-fuzzy",
        strategy_id: "S4_fuzzy_amount_window",
        confidence: 0.75,
        severity: "MEDIUM",
        evidence: {},
      },
    ]);

    const result = await detectDuplicates(baseArgs);
    expect(result.shouldQuarantine).toBe(false);
    expect(publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "bill.duplicate_flagged" }),
      supabase,
    );
  });

  it("dedupes best confidence per matched bill in returned hits", async () => {
    runS2.mockResolvedValue([
      {
        matched_bill_id: "b-same",
        strategy_id: "S2_amount_vendor_date",
        confidence: 0.95,
        severity: "HIGH",
        evidence: {},
      },
    ]);
    runS3.mockResolvedValue([
      {
        matched_bill_id: "b-same",
        strategy_id: "S3_invoice_number_vendor",
        confidence: 0.98,
        severity: "HIGH",
        evidence: {},
      },
    ]);

    const result = await detectDuplicates(baseArgs);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].strategy_id).toBe("S3_invoice_number_vendor");
  });
});
