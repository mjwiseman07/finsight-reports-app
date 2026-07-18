/**
 * MC-4c (Gap C-3): payments service currency contract.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "@/tests/entitlements/_mock-supabase";

const mock = makeMockSupabase();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: vi.fn() }));

import { createPaymentBatch, addBatchLine } from "@/lib/ap-intake/payments/service";

const FIRM = "00000000-0000-0000-0000-0000000004c11";
const CLIENT = "00000000-0000-0000-0000-0000000004c12";
const ENG = "00000000-0000-0000-0000-0000000004c13";
const USER = "00000000-0000-0000-0000-0000000004c14";
const VENDOR = "00000000-0000-0000-0000-0000000004c15";

function seedGates() {
  mock.__state.engagement_addons.push({
    engagement_id: ENG,
    addon_code: "ap_payment_interlock",
    is_active: true,
  });
  mock.__state.pilot_feature_allowlist.push({
    firm_id: FIRM,
    feature_code: "ap_payment_interlock",
    revoked_at: null,
  });
}

describe("MC-4c :: payments service currency contract", () => {
  beforeEach(() => {
    mock.__reset();
    seedGates();
  });

  it("createPaymentBatch rejects when currency is empty", async () => {
    await expect(
      createPaymentBatch({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        batchNumber: "B-001",
        currency: "",
        requestedByUserId: USER,
      }),
    ).rejects.toThrow(/invalid_currency_format/);
  });

  it("createPaymentBatch rejects malformed currency codes", async () => {
    await expect(
      createPaymentBatch({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        batchNumber: "B-002",
        currency: "US$",
        requestedByUserId: USER,
      }),
    ).rejects.toThrow(/invalid_currency_format/);
  });

  it("createPaymentBatch uppercases and persists the currency", async () => {
    const out = await createPaymentBatch({
      firmId: FIRM,
      firmClientId: CLIENT,
      engagementId: ENG,
      batchNumber: "B-003",
      currency: "usd",
      requestedByUserId: USER,
    });
    const row = mock.__state.payment_batches.find((b) => b.id === out.batch_id);
    expect(row?.currency).toBe("USD");
  });

  it("addBatchLine rejects when line currency differs from batch currency", async () => {
    // Seed a USD batch directly to bypass createPaymentBatch mocks-of-mocks.
    const BATCH = "00000000-0000-0000-0000-0000000004c21";
    mock.__state.payment_batches.push({
      id: BATCH,
      firm_id: FIRM,
      firm_client_id: CLIENT,
      engagement_id: ENG,
      batch_number: "B-mismatch",
      currency: "USD",
      status: "draft",
      requested_by_user_id: USER,
    });
    await expect(
      addBatchLine({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        batchId: BATCH,
        vendorId: VENDOR,
        grossAmountCents: 1000,
        currencyCode: "EUR",
        actorUserId: USER,
      }),
    ).rejects.toThrow(/batch_line_currency_mismatch/);
  });

  it("addBatchLine writes the line currency when it matches the batch", async () => {
    const BATCH = "00000000-0000-0000-0000-0000000004c22";
    mock.__state.payment_batches.push({
      id: BATCH,
      firm_id: FIRM,
      firm_client_id: CLIENT,
      engagement_id: ENG,
      batch_number: "B-match",
      currency: "USD",
      status: "draft",
      requested_by_user_id: USER,
    });
    const out = await addBatchLine({
      firmId: FIRM,
      firmClientId: CLIENT,
      engagementId: ENG,
      batchId: BATCH,
      vendorId: VENDOR,
      grossAmountCents: 1000,
      currencyCode: "USD",
      actorUserId: USER,
    });
    const row = mock.__state.payment_batch_lines.find((l) => l.id === out.line_id);
    expect(row?.currency).toBe("USD");
  });
});
