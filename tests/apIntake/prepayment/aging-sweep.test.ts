import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "@/tests/entitlements/_mock-supabase";

const mock = makeMockSupabase();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: vi.fn() }));

import { runAgingSweep } from "@/lib/ap-intake/prepayment/service";
import { publishEvent } from "@/lib/events/publisher";

const FIRM = "00000000-0000-0000-0000-000000007d01";
const CLIENT = "00000000-0000-0000-0000-000000007d02";
const ENG = "00000000-0000-0000-0000-000000007d03";
const VENDOR = "00000000-0000-0000-0000-000000007d04";
const BAL = "00000000-0000-0000-0000-000000007d05";

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

describe("prepayment aging sweep", () => {
  beforeEach(() => {
    mock.__reset();
    vi.mocked(publishEvent).mockClear();
    mock.__state.engagement_addons.push({
      engagement_id: ENG,
      addon_code: "ap_credit_prepayment",
      is_active: true,
    });
    mock.__state.engagements.push({ id: ENG, firm_id: FIRM });
    mock.__state.pilot_feature_allowlist.push({
      firm_id: FIRM,
      feature_code: "ap_credit_prepayment",
      revoked_at: null,
    });
    mock.__state.vendor_prepayment_balances.push({
      id: BAL,
      firm_id: FIRM,
      firm_client_id: CLIENT,
      vendor_id: VENDOR,
      currency: "USD",
      total_paid_cents: 50000,
      total_applied_cents: 0,
      balance_cents: 50000,
      oldest_open_prepayment_date: daysAgo(200),
    });
  });

  it("flags aged balances and creates refund drafts without send-side surface", async () => {
    const result = await runAgingSweep({ firmId: FIRM });
    expect(result.drafted).toBe(1);
    expect(result.vendorsScanned).toBe(1);
    expect(result.draftIds).toHaveLength(1);

    const draft = mock.__state.refund_request_drafts[0];
    expect(draft.status).toBe("pending_reviewer");
    expect(draft.draft_amount_cents).toBe(50000);
    expect(draft.aging_days).toBeGreaterThanOrEqual(199);
    expect(draft.aging_days).toBeLessThanOrEqual(201);

    const eventTypes = vi.mocked(publishEvent).mock.calls.map((c) => c[0].eventType);
    expect(eventTypes).toContain("prepayment.aged_flagged");
    expect(eventTypes).toContain("prepayment.refund_draft_created");

    const stateKeys = Object.keys(mock.__state);
    const sendKeys = stateKeys.filter((k) =>
      /refund_sent|refund_transmitted|refund_disbursed|payment_sent/.test(k),
    );
    expect(sendKeys).toEqual([]);
  });
});
