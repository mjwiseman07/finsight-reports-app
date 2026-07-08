import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "@/tests/entitlements/_mock-supabase";

const mock = makeMockSupabase();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: vi.fn() }));

import {
  recordPrepayment,
  applyPrepayment,
  runAgingSweep,
  reviewRefundDraft,
} from "@/lib/ap-intake/prepayment/service";
import { EntitlementDenied } from "@/lib/entitlements/gate";
import { PilotFeatureDenied } from "@/lib/entitlements/pilot-features";

const FIRM = "00000000-0000-0000-0000-000000007c01";
const CLIENT = "00000000-0000-0000-0000-000000007c02";
const ENG = "00000000-0000-0000-0000-000000007c03";
const VENDOR = "00000000-0000-0000-0000-000000007c04";
const USER = "00000000-0000-0000-0000-000000007c05";
const BILL = "00000000-0000-0000-0000-000000007c06";
const DRAFT = "00000000-0000-0000-0000-000000007c07";

function seedEntitlement() {
  mock.__state.engagement_addons.push({
    engagement_id: ENG,
    addon_code: "ap_credit_prepayment",
    is_active: true,
  });
  mock.__state.engagements.push({ id: ENG, firm_id: FIRM });
}

function seedPilot() {
  mock.__state.pilot_feature_allowlist.push({
    firm_id: FIRM,
    feature_code: "ap_credit_prepayment",
    revoked_at: null,
  });
}

describe("prepayment/service :: two-layer gate", () => {
  beforeEach(() => mock.__reset());

  it("recordPrepayment rejects when engagement_addons row is missing", async () => {
    await expect(
      recordPrepayment({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        vendorId: VENDOR,
        amountCents: 10000,
        currency: "USD",
        actorUserId: USER,
      }),
    ).rejects.toBeInstanceOf(EntitlementDenied);
  });

  it("recordPrepayment rejects when pilot_feature_allowlist row is missing", async () => {
    seedEntitlement();
    await expect(
      recordPrepayment({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        vendorId: VENDOR,
        amountCents: 10000,
        currency: "USD",
        actorUserId: USER,
      }),
    ).rejects.toBeInstanceOf(PilotFeatureDenied);
  });

  it("applyPrepayment rejects when engagement_addons row is missing", async () => {
    await expect(
      applyPrepayment({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        vendorId: VENDOR,
        billId: BILL,
        amountCents: 1000,
        currency: "USD",
        actorUserId: USER,
      }),
    ).rejects.toBeInstanceOf(EntitlementDenied);
  });

  it("applyPrepayment rejects when pilot_feature_allowlist row is missing", async () => {
    seedEntitlement();
    await expect(
      applyPrepayment({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        vendorId: VENDOR,
        billId: BILL,
        amountCents: 1000,
        currency: "USD",
        actorUserId: USER,
      }),
    ).rejects.toBeInstanceOf(PilotFeatureDenied);
  });

  it("runAgingSweep rejects when engagement_addons row is missing", async () => {
    await expect(runAgingSweep({ firmId: FIRM })).rejects.toBeInstanceOf(EntitlementDenied);
  });

  it("runAgingSweep rejects when pilot_feature_allowlist row is missing", async () => {
    seedEntitlement();
    await expect(runAgingSweep({ firmId: FIRM })).rejects.toBeInstanceOf(PilotFeatureDenied);
  });

  it("reviewRefundDraft rejects when engagement_addons row is missing", async () => {
    await expect(
      reviewRefundDraft({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        draftId: DRAFT,
        decision: "approved",
        reviewerUserId: USER,
      }),
    ).rejects.toBeInstanceOf(EntitlementDenied);
  });

  it("reviewRefundDraft rejects when pilot_feature_allowlist row is missing", async () => {
    seedEntitlement();
    await expect(
      reviewRefundDraft({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        draftId: DRAFT,
        decision: "approved",
        reviewerUserId: USER,
      }),
    ).rejects.toBeInstanceOf(PilotFeatureDenied);
  });
});
