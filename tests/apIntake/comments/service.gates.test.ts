import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "@/tests/entitlements/_mock-supabase";

const mock = makeMockSupabase();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: vi.fn() }));

import { addComment, editComment, deleteComment } from "@/lib/ap-intake/comments/service";
import { EntitlementDenied } from "@/lib/entitlements/gate";
import { PilotFeatureDenied } from "@/lib/entitlements/pilot-features";

const FIRM = "00000000-0000-0000-0000-000000000f01";
const ENG = "00000000-0000-0000-0000-000000000e01";
const REQ = "00000000-0000-0000-0000-000000000r01";
const COMMENT = "00000000-0000-0000-0000-000000000c01";
const AUTHOR = "00000000-0000-0000-0000-000000000a01";

function seedRequisition() {
  mock.__state.requisitions.push({
    id: REQ,
    firm_id: FIRM,
    firm_client_id: "00000000-0000-0000-0000-000000000fc01",
    engagement_id: ENG,
  });
}

function seedEntitlement() {
  mock.__state.engagement_addons.push({
    engagement_id: ENG,
    addon_code: "ap_requisitions",
    is_active: true,
  });
}

describe("comments/service :: two-layer gate", () => {
  beforeEach(() => {
    mock.__reset();
  });

  it("addComment rejects when pilot_feature_allowlist row is missing", async () => {
    seedRequisition();
    seedEntitlement();
    await expect(
      addComment({
        requisitionId: REQ,
        authorUserId: AUTHOR,
        body: "hello",
      }),
    ).rejects.toBeInstanceOf(PilotFeatureDenied);
  });

  it("editComment rejects when engagement_addons row is missing", async () => {
    await expect(
      editComment({
        commentId: COMMENT,
        authorUserId: AUTHOR,
        body: "updated",
        firmId: FIRM,
        engagementId: ENG,
      }),
    ).rejects.toBeInstanceOf(EntitlementDenied);
  });

  it("editComment rejects when pilot_feature_allowlist row is missing", async () => {
    seedEntitlement();
    await expect(
      editComment({
        commentId: COMMENT,
        authorUserId: AUTHOR,
        body: "updated",
        firmId: FIRM,
        engagementId: ENG,
      }),
    ).rejects.toBeInstanceOf(PilotFeatureDenied);
  });

  it("deleteComment rejects when engagement_addons row is missing", async () => {
    await expect(
      deleteComment({
        commentId: COMMENT,
        authorUserId: AUTHOR,
        firmId: FIRM,
        engagementId: ENG,
      }),
    ).rejects.toBeInstanceOf(EntitlementDenied);
  });

  it("deleteComment rejects when pilot_feature_allowlist row is missing", async () => {
    seedEntitlement();
    await expect(
      deleteComment({
        commentId: COMMENT,
        authorUserId: AUTHOR,
        firmId: FIRM,
        engagementId: ENG,
      }),
    ).rejects.toBeInstanceOf(PilotFeatureDenied);
  });
});
