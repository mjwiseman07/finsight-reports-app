import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "@/tests/entitlements/_mock-supabase";

const mock = makeMockSupabase();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: vi.fn() }));

import { rejectAmendment } from "@/lib/ap-intake/amendments/service";
import { PilotFeatureDenied } from "@/lib/entitlements/pilot-features";

const FIRM = "00000000-0000-0000-0000-000000000f01";
const ENG = "00000000-0000-0000-0000-000000000e01";
const REQ = "00000000-0000-0000-0000-000000000r01";
const AMEND = "00000000-0000-0000-0000-000000000a01";
const APPROVER = "00000000-0000-0000-0000-000000000b01";

describe("amendments/service :: two-layer gate", () => {
  beforeEach(() => {
    mock.__reset();
    mock.__state.requisition_amendments.push({
      id: AMEND,
      requisition_id: REQ,
      firm_id: FIRM,
      firm_client_id: "00000000-0000-0000-0000-000000000fc01",
      status: "pending",
    });
    mock.__state.requisitions.push({
      id: REQ,
      firm_id: FIRM,
      firm_client_id: "00000000-0000-0000-0000-000000000fc01",
      engagement_id: ENG,
      status: "approved",
      total_cents: 1000,
    });
    mock.__state.engagement_addons.push({
      engagement_id: ENG,
      addon_code: "ap_requisitions",
      is_active: true,
    });
  });

  it("rejectAmendment rejects when pilot_feature_allowlist row is missing", async () => {
    await expect(
      rejectAmendment({
        amendmentId: AMEND,
        approverUserId: APPROVER,
        reason: "not needed",
      }),
    ).rejects.toBeInstanceOf(PilotFeatureDenied);
  });
});
