/**
 * MC-4b (Gap C-2): Currency-equality gate for applyCredit.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "@/tests/entitlements/_mock-supabase";

const mock = makeMockSupabase();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: vi.fn() }));

import { applyCredit, CreditValidationError } from "@/lib/ap-intake/credits/service";
import { publishEvent } from "@/lib/events/publisher";

const FIRM = "00000000-0000-0000-0000-000000004b01";
const CLIENT = "00000000-0000-0000-0000-000000004b02";
const ENG = "00000000-0000-0000-0000-000000004b03";
const VENDOR = "00000000-0000-0000-0000-000000004b04";
const USER = "00000000-0000-0000-0000-000000004b05";
const CREDIT = "00000000-0000-0000-0000-000000004b06";
const BILL = "00000000-0000-0000-0000-000000004b07";

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

function seedCredit(currency: string) {
  mock.__state.vendor_credits.push({
    id: CREDIT,
    firm_id: FIRM,
    remaining_amount_cents: 10000,
    original_amount_cents: 10000,
    status: "open",
    vendor_id: VENDOR,
    currency,
    issued_date: "2026-01-01",
    expiration_date: null,
  });
}

describe("MC-4b :: applyCredit currency-equality gate", () => {
  beforeEach(() => {
    mock.__reset();
    seedGates();
    vi.mocked(publishEvent).mockClear();
  });

  it("rejects when credit currency differs from bill currency", async () => {
    seedCredit("EUR");
    await expect(
      applyCredit({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        creditId: CREDIT,
        billId: BILL,
        billCurrency: "USD",
        appliedAmountCents: 1000,
        appliedBy: "user_manual",
        actorUserId: USER,
      }),
    ).rejects.toBeInstanceOf(CreditValidationError);
    // No application row was written
    expect(mock.__state.credit_applications ?? []).toHaveLength(0);
  });

  it("accepts when credit currency matches bill currency", async () => {
    seedCredit("USD");
    const appId = await applyCredit({
      firmId: FIRM,
      firmClientId: CLIENT,
      engagementId: ENG,
      creditId: CREDIT,
      billId: BILL,
      billCurrency: "USD",
      appliedAmountCents: 4000,
      appliedBy: "user_manual",
      actorUserId: USER,
    });
    expect(appId).toBeTruthy();
    const credit = mock.__state.vendor_credits.find((c) => c.id === CREDIT);
    expect(credit?.status).toBe("partially_applied");
    expect(credit?.remaining_amount_cents).toBe(6000);
  });

  it("emits credit_currency + bill_currency on applied event", async () => {
    seedCredit("USD");
    await applyCredit({
      firmId: FIRM,
      firmClientId: CLIENT,
      engagementId: ENG,
      creditId: CREDIT,
      billId: BILL,
      billCurrency: "USD",
      appliedAmountCents: 1000,
      appliedBy: "user_manual",
      actorUserId: USER,
    });
    expect(publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "vendor_credit.applied",
        payload: expect.objectContaining({
          credit_currency: "USD",
          bill_currency: "USD",
        }),
      }),
    );
  });
});
