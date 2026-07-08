import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "@/tests/entitlements/_mock-supabase";

const mock = makeMockSupabase();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: vi.fn() }));

import {
  issueCredit,
  applyCredit,
  reverseCreditApplication,
  voidCredit,
  evaluateAutoApply,
} from "@/lib/ap-intake/credits/service";
import { EntitlementDenied } from "@/lib/entitlements/gate";
import { PilotFeatureDenied } from "@/lib/entitlements/pilot-features";

const FIRM = "00000000-0000-0000-0000-000000007a01";
const CLIENT = "00000000-0000-0000-0000-000000007a02";
const ENG = "00000000-0000-0000-0000-000000007a03";
const VENDOR = "00000000-0000-0000-0000-000000007a04";
const USER = "00000000-0000-0000-0000-000000007a05";
const CREDIT = "00000000-0000-0000-0000-000000007a06";
const BILL = "00000000-0000-0000-0000-000000007a07";
const APP = "00000000-0000-0000-0000-000000007a08";

const baseIssue = {
  firmId: FIRM,
  firmClientId: CLIENT,
  engagementId: ENG,
  vendorId: VENDOR,
  creditType: "credit_memo" as const,
  sourceDocumentType: "vendor_issued" as const,
  originalAmountCents: 10000,
  currency: "USD",
  issuedDate: "2026-07-01",
  actorUserId: USER,
};

function seedEntitlement() {
  mock.__state.engagement_addons.push({
    engagement_id: ENG,
    addon_code: "ap_credit_prepayment",
    is_active: true,
  });
}

function seedPilot() {
  mock.__state.pilot_feature_allowlist.push({
    firm_id: FIRM,
    feature_code: "ap_credit_prepayment",
    revoked_at: null,
  });
}

describe("credits/service :: two-layer gate", () => {
  beforeEach(() => mock.__reset());

  it("issueCredit rejects when engagement_addons row is missing", async () => {
    await expect(issueCredit(baseIssue)).rejects.toBeInstanceOf(EntitlementDenied);
  });

  it("issueCredit rejects when pilot_feature_allowlist row is missing", async () => {
    seedEntitlement();
    await expect(issueCredit(baseIssue)).rejects.toBeInstanceOf(PilotFeatureDenied);
  });

  it("applyCredit rejects when engagement_addons row is missing", async () => {
    await expect(
      applyCredit({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        creditId: CREDIT,
        billId: BILL,
        appliedAmountCents: 1000,
        appliedBy: "user_manual",
        actorUserId: USER,
      }),
    ).rejects.toBeInstanceOf(EntitlementDenied);
  });

  it("applyCredit rejects when pilot_feature_allowlist row is missing", async () => {
    seedEntitlement();
    await expect(
      applyCredit({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        creditId: CREDIT,
        billId: BILL,
        appliedAmountCents: 1000,
        appliedBy: "user_manual",
        actorUserId: USER,
      }),
    ).rejects.toBeInstanceOf(PilotFeatureDenied);
  });

  it("reverseCreditApplication rejects when engagement_addons row is missing", async () => {
    await expect(
      reverseCreditApplication({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        applicationId: APP,
        reversalReason: "test",
        actorUserId: USER,
      }),
    ).rejects.toBeInstanceOf(EntitlementDenied);
  });

  it("reverseCreditApplication rejects when pilot_feature_allowlist row is missing", async () => {
    seedEntitlement();
    await expect(
      reverseCreditApplication({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        applicationId: APP,
        reversalReason: "test",
        actorUserId: USER,
      }),
    ).rejects.toBeInstanceOf(PilotFeatureDenied);
  });

  it("voidCredit rejects when engagement_addons row is missing", async () => {
    await expect(
      voidCredit({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        creditId: CREDIT,
        reason: "test",
        actorUserId: USER,
      }),
    ).rejects.toBeInstanceOf(EntitlementDenied);
  });

  it("voidCredit rejects when pilot_feature_allowlist row is missing", async () => {
    seedEntitlement();
    await expect(
      voidCredit({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        creditId: CREDIT,
        reason: "test",
        actorUserId: USER,
      }),
    ).rejects.toBeInstanceOf(PilotFeatureDenied);
  });

  it("evaluateAutoApply rejects when engagement_addons row is missing", async () => {
    await expect(
      evaluateAutoApply({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        vendorId: VENDOR,
        billId: BILL,
        billAmountCents: 5000,
        currency: "USD",
      }),
    ).rejects.toBeInstanceOf(EntitlementDenied);
  });

  it("evaluateAutoApply rejects when pilot_feature_allowlist row is missing", async () => {
    seedEntitlement();
    await expect(
      evaluateAutoApply({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        vendorId: VENDOR,
        billId: BILL,
        billAmountCents: 5000,
        currency: "USD",
      }),
    ).rejects.toBeInstanceOf(PilotFeatureDenied);
  });
});
