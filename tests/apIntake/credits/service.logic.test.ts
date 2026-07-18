import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "@/tests/entitlements/_mock-supabase";

const mock = makeMockSupabase();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: vi.fn() }));

import {
  applyCredit,
  reverseCreditApplication,
  voidCredit,
  evaluateAutoApply,
  CreditValidationError,
} from "@/lib/ap-intake/credits/service";

const FIRM = "00000000-0000-0000-0000-000000007b01";
const CLIENT = "00000000-0000-0000-0000-000000007b02";
const ENG = "00000000-0000-0000-0000-000000007b03";
const VENDOR = "00000000-0000-0000-0000-000000007b04";
const USER = "00000000-0000-0000-0000-000000007b05";
const CREDIT = "00000000-0000-0000-0000-000000007b06";
const BILL = "00000000-0000-0000-0000-000000007b07";
const APP = "00000000-0000-0000-0000-000000007b08";

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

function seedOpenCredit(remaining = 10000, overrides: Record<string, unknown> = {}) {
  mock.__state.vendor_credits.push({
    id: CREDIT,
    firm_id: FIRM,
    remaining_amount_cents: remaining,
    original_amount_cents: 10000,
    status: "open",
    vendor_id: VENDOR,
    currency: "USD",
    issued_date: "2026-01-01",
    expiration_date: null,
    ...overrides,
  });
}

describe("credits/service :: logic", () => {
  beforeEach(() => {
    mock.__reset();
    seedGates();
  });

  it("applyCredit throws when appliedAmountCents exceeds remaining", async () => {
    seedOpenCredit(1000);
    await expect(
      applyCredit({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        creditId: CREDIT,
        billId: BILL,
        billCurrency: "USD",
        appliedAmountCents: 5000,
        appliedBy: "user_manual",
        actorUserId: USER,
      }),
    ).rejects.toBeInstanceOf(CreditValidationError);
  });

  it("applyCredit transitions open → partially_applied → fully_applied", async () => {
    seedOpenCredit(10000);
    await applyCredit({
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
    const credit = mock.__state.vendor_credits.find((c) => c.id === CREDIT);
    expect(credit?.status).toBe("partially_applied");
    expect(credit?.remaining_amount_cents).toBe(6000);
    await applyCredit({
      firmId: FIRM,
      firmClientId: CLIENT,
      engagementId: ENG,
      creditId: CREDIT,
      billId: BILL,
      billCurrency: "USD",
      appliedAmountCents: 6000,
      appliedBy: "user_manual",
      actorUserId: USER,
    });
    const done = mock.__state.vendor_credits.find((c) => c.id === CREDIT);
    expect(done?.status).toBe("fully_applied");
    expect(done?.remaining_amount_cents).toBe(0);
  });

  it("reverseCreditApplication throws on already-reversed application", async () => {
    seedOpenCredit(5000, { status: "partially_applied" });
    mock.__state.credit_applications.push({
      id: APP,
      firm_id: FIRM,
      vendor_credit_id: CREDIT,
      applied_amount_cents: 5000,
      reversed_at: "2026-07-01T00:00:00Z",
    });
    await expect(
      reverseCreditApplication({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        applicationId: APP,
        reversalReason: "dup",
        actorUserId: USER,
      }),
    ).rejects.toBeInstanceOf(CreditValidationError);
  });

  it("voidCredit throws on already-voided credit", async () => {
    seedOpenCredit(10000, { status: "voided" });
    await expect(
      voidCredit({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        creditId: CREDIT,
        reason: "dup",
        actorUserId: USER,
      }),
    ).rejects.toBeInstanceOf(CreditValidationError);
  });

  it("evaluateAutoApply orders oldest-first and skips expired credits", async () => {
    mock.__state.vendor_credits.push(
      {
        id: "c-new",
        firm_id: FIRM,
        vendor_id: VENDOR,
        currency: "USD",
        remaining_amount_cents: 3000,
        issued_date: "2026-06-01",
        expiration_date: null,
        status: "open",
      },
      {
        id: "c-old",
        firm_id: FIRM,
        vendor_id: VENDOR,
        currency: "USD",
        remaining_amount_cents: 2000,
        issued_date: "2026-01-01",
        expiration_date: null,
        status: "open",
      },
      {
        id: "c-exp",
        firm_id: FIRM,
        vendor_id: VENDOR,
        currency: "USD",
        remaining_amount_cents: 9000,
        issued_date: "2025-01-01",
        expiration_date: "2026-01-01",
        status: "open",
      },
    );
    const r = await evaluateAutoApply({
      firmId: FIRM,
      firmClientId: CLIENT,
      engagementId: ENG,
      vendorId: VENDOR,
      billId: BILL,
      billAmountCents: 3500,
      currency: "USD",
    });
    expect(r.eligibleApplications.map((x) => x.creditId)).toEqual(["c-old", "c-new"]);
    expect(r.eligibleApplications[0].appliedAmountCents).toBe(2000);
    expect(r.eligibleApplications[1].appliedAmountCents).toBe(1500);
    expect(r.remainingBillAmountCents).toBe(0);
  });
});
