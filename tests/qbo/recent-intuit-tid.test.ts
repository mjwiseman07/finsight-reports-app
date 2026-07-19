import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/supabase", () => {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn();
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const order = vi.fn().mockReturnValue({ limit });
  const gte = vi.fn().mockReturnValue({ order });
  const eq = vi.fn().mockReturnValue({ gte });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockImplementation((tbl: string) => {
    if (tbl === "qbo_recent_intuit_tid") return { upsert, select };
    throw new Error("unexpected table");
  });
  return { supabaseAdmin: { from }, __mocks: { upsert, maybeSingle } };
});

import {
  persistRecentIntuitTid,
  getRecentIntuitTidForUser,
} from "../../lib/qbo/recent-intuit-tid";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { __mocks } = (await import("../../lib/supabase")) as any;

describe("recent-intuit-tid helper", () => {
  beforeEach(() => {
    __mocks.upsert.mockClear();
    __mocks.maybeSingle.mockReset();
  });

  it("persistRecentIntuitTid upserts on (user_id, realm_id)", async () => {
    await persistRecentIntuitTid({
      userId: "u1",
      realmId: "r1",
      intuit_tid: "tid-abc",
      endpoint: "/v3/company/r1/query",
      status_code: 200,
    });
    expect(__mocks.upsert).toHaveBeenCalledTimes(1);
    const [payload, opts] = __mocks.upsert.mock.calls[0];
    expect(payload.user_id).toBe("u1");
    expect(payload.realm_id).toBe("r1");
    expect(payload.intuit_tid).toBe("tid-abc");
    expect(opts.onConflict).toBe("user_id,realm_id");
  });

  it("getRecentIntuitTidForUser returns the most recent row or null", async () => {
    __mocks.maybeSingle.mockResolvedValueOnce({
      data: {
        realm_id: "r1",
        intuit_tid: "tid-xyz",
        endpoint: "/v3/query",
        status_code: 200,
        captured_at: "2026-07-18T00:00:00.000Z",
      },
      error: null,
    });
    const result = await getRecentIntuitTidForUser("u1");
    expect(result?.intuit_tid).toBe("tid-xyz");

    __mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const empty = await getRecentIntuitTidForUser("u2");
    expect(empty).toBeNull();
  });
});
