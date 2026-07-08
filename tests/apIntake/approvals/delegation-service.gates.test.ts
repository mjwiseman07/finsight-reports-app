import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "@/tests/entitlements/_mock-supabase";

const mock = makeMockSupabase();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: vi.fn() }));

import { createDelegation, revokeDelegation } from "@/lib/ap-intake/approvals/delegation-service";
import { EntitlementDenied } from "@/lib/entitlements/gate";
import { PilotFeatureDenied } from "@/lib/entitlements/pilot-features";

const FIRM = "00000000-0000-0000-0000-000000000f01";
const ENG = "00000000-0000-0000-0000-000000000e01";
const ACTOR = "00000000-0000-0000-0000-000000000a01";

const baseCreateInput = {
  firmId: FIRM,
  delegatorUserId: ACTOR,
  delegateUserId: "00000000-0000-0000-0000-000000000a02",
  scope: "ap_requisitions" as const,
  effectiveTo: new Date("2026-08-01T00:00:00Z"),
  actorUserId: ACTOR,
  engagementId: ENG,
};

describe("delegation-service :: two-layer gate", () => {
  beforeEach(() => {
    mock.__reset();
  });

  it("createDelegation rejects when engagement_addons row is missing", async () => {
    await expect(createDelegation(baseCreateInput)).rejects.toBeInstanceOf(EntitlementDenied);
  });

  it("createDelegation rejects when pilot_feature_allowlist row is missing", async () => {
    mock.__state.engagement_addons.push({
      engagement_id: ENG,
      addon_code: "ap_requisitions",
      is_active: true,
    });
    await expect(createDelegation(baseCreateInput)).rejects.toBeInstanceOf(PilotFeatureDenied);
  });

  it("revokeDelegation rejects when engagement_addons row is missing", async () => {
    await expect(
      revokeDelegation({
        firmId: FIRM,
        delegationId: "00000000-0000-0000-0000-000000000d01",
        actorUserId: ACTOR,
        engagementId: ENG,
      }),
    ).rejects.toBeInstanceOf(EntitlementDenied);
  });

  it("revokeDelegation rejects when pilot_feature_allowlist row is missing", async () => {
    mock.__state.engagement_addons.push({
      engagement_id: ENG,
      addon_code: "ap_requisitions",
      is_active: true,
    });
    await expect(
      revokeDelegation({
        firmId: FIRM,
        delegationId: "00000000-0000-0000-0000-000000000d01",
        actorUserId: ACTOR,
        engagementId: ENG,
      }),
    ).rejects.toBeInstanceOf(PilotFeatureDenied);
  });
});
