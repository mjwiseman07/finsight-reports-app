import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "@/tests/entitlements/_mock-supabase";

const mock = makeMockSupabase();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: vi.fn() }));

import {
  ingestMessage,
  updateAutonomyConfig,
  sendDraftedResponse,
  PermanentExclusionError,
} from "@/lib/ap-intake/inbox/service";

const FIRM = "00000000-0000-0000-0000-000000007b01";
const CLIENT = "00000000-0000-0000-0000-000000007b02";
const ENG = "00000000-0000-0000-0000-000000007b03";
const MSG = "00000000-0000-0000-0000-000000007b04";
const DRAFT = "00000000-0000-0000-0000-000000007b05";
const USER = "00000000-0000-0000-0000-000000000000";

function seedGates() {
  mock.__state.engagement_addons.push({
    engagement_id: ENG,
    addon_code: "ap_multimodal_inbox",
    is_active: true,
  });
  mock.__state.pilot_feature_allowlist.push({
    firm_id: FIRM,
    feature_code: "ap_multimodal_inbox",
    revoked_at: null,
  });
}

describe("inbox service integration", () => {
  beforeEach(() => {
    mock.__reset();
    seedGates();
  });

  it("ingestMessage for non-excluded intent drafts with needs_approval under approve_all default", async () => {
    const result = await ingestMessage({
      firmId: FIRM,
      firmClientId: CLIENT,
      engagementId: ENG,
      channel: "email",
      bodyText: "Please find attached invoice for services",
      senderAddress: "vendor@example.com",
      rawPayload: {},
      subject: "Invoice",
    });
    expect(result.intent).toBe("invoice_submission");
    expect(result.draft_id).toBeTruthy();
    expect(result.autonomy_decision).toBe("needs_approval");
    expect(mock.__state.vendor_ap_inbox_messages.length).toBe(1);
    expect(mock.__state.ap_inbox_drafted_responses.length).toBe(1);
  });

  it("ingestMessage for bank_change_request creates permanent_exclusion_hold and logs draft_hold", async () => {
    const result = await ingestMessage({
      firmId: FIRM,
      firmClientId: CLIENT,
      engagementId: ENG,
      channel: "email",
      bodyText: "Please change bank account for remittance",
      senderAddress: "vendor@example.com",
      rawPayload: {},
      subject: "Bank update",
    });
    expect(result.intent).toBe("bank_change_request");
    expect(result.autonomy_decision).toBe("permanent_exclusion_hold");
    const log = mock.__state.ap_inbox_permanent_exclusions_log.find(
      (r) => r.enforcement_path === "draft_hold",
    );
    expect(log).toBeTruthy();
    expect(log?.intent).toBe("bank_change_request");
  });

  it("updateAutonomyConfig rejects permanent intent in allowlist with server_config_reject", async () => {
    await expect(
      updateAutonomyConfig({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        mode: "allowlist_auto_send",
        allowlistIntents: ["bank_change_request"],
        actorUserId: USER,
      }),
    ).rejects.toBeInstanceOf(PermanentExclusionError);
    const log = mock.__state.ap_inbox_permanent_exclusions_log.find(
      (r) => r.enforcement_path === "server_config_reject",
    );
    expect(log).toBeTruthy();
  });

  it("sendDraftedResponse rejects refund_request at send time with no outbound row", async () => {
    mock.__state.vendor_ap_inbox_messages.push({
      id: MSG,
      firm_id: FIRM,
      firm_client_id: CLIENT,
      direction: "inbound",
      channel: "email",
      body_text: "refund please",
      sender_address: "vendor@example.com",
      raw_payload: {},
    });
    mock.__state.ap_inbox_drafted_responses.push({
      id: DRAFT,
      firm_id: FIRM,
      message_id: MSG,
      intent_at_draft_time: "refund_request",
      autonomy_decision: "auto_send_pending",
      draft_body_text: "draft",
      autonomy_reason: "test",
      model_id: "template-v1",
    });
    const outboundBefore = mock.__state.vendor_ap_inbox_messages.filter(
      (m) => m.direction === "outbound",
    ).length;
    await expect(
      sendDraftedResponse({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        draftId: DRAFT,
      }),
    ).rejects.toBeInstanceOf(PermanentExclusionError);
    const outboundAfter = mock.__state.vendor_ap_inbox_messages.filter(
      (m) => m.direction === "outbound",
    ).length;
    expect(outboundAfter).toBe(outboundBefore);
    const log = mock.__state.ap_inbox_permanent_exclusions_log.find(
      (r) => r.enforcement_path === "send_time_reject",
    );
    expect(log).toBeTruthy();
    expect(log?.intent).toBe("refund_request");
  });
});
