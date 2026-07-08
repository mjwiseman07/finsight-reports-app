import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "@/tests/entitlements/_mock-supabase";

const mock = makeMockSupabase();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: vi.fn() }));

import { accumulateVendorSpend } from "@/lib/ap-intake/budget/vendor-spend-service";
import { EntitlementDenied } from "@/lib/entitlements/gate";
import { PilotFeatureDenied } from "@/lib/entitlements/pilot-features";

const FIRM = "00000000-0000-0000-0000-000000000f01";
const ENG = "00000000-0000-0000-0000-000000000e01";
const ACTOR = "00000000-0000-0000-0000-000000000a01";

const baseInput = {
  firmId: FIRM,
  firmClientId: "00000000-0000-0000-0000-000000000fc01",
  companyId: "00000000-0000-0000-0000-000000000co01",
  vendorId: "00000000-0000-0000-0000-000000000v01",
  glAccountCode: "6100",
  periodYear: 2026,
  periodMonth: 7,
  amountCents: 5000,
  actorUserId: ACTOR,
  engagementId: ENG,
};

describe("vendor-spend-service :: two-layer gate", () => {
  beforeEach(() => {
    mock.__reset();
  });

  it("accumulateVendorSpend rejects when engagement_addons row is missing", async () => {
    await expect(accumulateVendorSpend(baseInput)).rejects.toBeInstanceOf(EntitlementDenied);
  });

  it("accumulateVendorSpend rejects when pilot_feature_allowlist row is missing", async () => {
    mock.__state.engagement_addons.push({
      engagement_id: ENG,
      addon_code: "ap_budget_controls",
      is_active: true,
    });
    await expect(accumulateVendorSpend(baseInput)).rejects.toBeInstanceOf(PilotFeatureDenied);
  });
});
