/**
 * MC-4b (Gap C-2): Currency-equality gate for applyPrepayment.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "@/tests/entitlements/_mock-supabase";

const mock = makeMockSupabase();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: vi.fn() }));

import { applyPrepayment, PrepaymentValidationError } from "@/lib/ap-intake/prepayment/service";
import { publishEvent } from "@/lib/events/publisher";

const FIRM = "00000000-0000-0000-0000-000000004b11";
const CLIENT = "00000000-0000-0000-0000-000000004b12";
const ENG = "00000000-0000-0000-0000-000000004b13";
const VENDOR = "00000000-0000-0000-0000-000000004b14";
const USER = "00000000-0000-0000-0000-000000004b15";
const BILL = "00000000-0000-0000-0000-000000004b16";
const BALANCE = "00000000-0000-0000-0000-000000004b17";

function seedGates() {
  mock.__state.engagement_addons.push({
    engagement_id: ENG,
    addon_code: "ap_credit_prepayment",
    is_active: true,
  });
  mock.__state.pilot_feature_allowlist.push({
    firm_id: FIRM,
    feature_code: "ap_credit_prepayment",
    revoked_at: null,
  });
}

function seedBalance(currency: string) {
  mock.__state.vendor_prepayment_balances.push({
    id: BALANCE,
    firm_id: FIRM,
    firm_client_id: CLIENT,
    vendor_id: VENDOR,
    currency,
    total_paid_cents: 10000,
    total_applied_cents: 0,
    balance_cents: 10000,
    oldest_open_prepayment_date: "2026-01-01",
  });
}

describe("MC-4b :: applyPrepayment currency-equality gate", () => {
  beforeEach(() => {
    mock.__reset();
    seedGates();
    vi.mocked(publishEvent).mockClear();
  });

  it("rejects when input.currency differs from billCurrency", async () => {
    seedBalance("EUR");
    await expect(
      applyPrepayment({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        vendorId: VENDOR,
        billId: BILL,
        billCurrency: "USD",
        amountCents: 1000,
        currency: "EUR",
        actorUserId: USER,
      }),
    ).rejects.toBeInstanceOf(PrepaymentValidationError);
    // No ledger row was written
    expect(mock.__state.prepayment_ledger ?? []).toHaveLength(0);
  });

  it("accepts when currency matches billCurrency", async () => {
    seedBalance("USD");
    const ledgerId = await applyPrepayment({
      firmId: FIRM,
      firmClientId: CLIENT,
      engagementId: ENG,
      vendorId: VENDOR,
      billId: BILL,
      billCurrency: "USD",
      amountCents: 4000,
      currency: "USD",
      actorUserId: USER,
    });
    expect(ledgerId).toBeTruthy();
  });

  it("emits bill_currency on applied event payload", async () => {
    seedBalance("USD");
    await applyPrepayment({
      firmId: FIRM,
      firmClientId: CLIENT,
      engagementId: ENG,
      vendorId: VENDOR,
      billId: BILL,
      billCurrency: "USD",
      amountCents: 1000,
      currency: "USD",
      actorUserId: USER,
    });
    expect(publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "prepayment.applied",
        payload: expect.objectContaining({
          currency: "USD",
          bill_currency: "USD",
        }),
      }),
    );
  });
});
