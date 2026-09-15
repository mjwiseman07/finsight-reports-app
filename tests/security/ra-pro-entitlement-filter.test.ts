import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: fromMock }),
}));

import { filterReviewerAuthorizedFirmIds } from "@/lib/review-assist-pro/entitlement";

function thenableQuery(data: unknown, error: null | object = null) {
  const result = Promise.resolve({ data, error });
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.eq = self;
  chain.in = self;
  chain.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    result.then(onFulfilled, onRejected);
  return chain;
}

describe("filterReviewerAuthorizedFirmIds", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("returns empty for empty memberships", async () => {
    await expect(filterReviewerAuthorizedFirmIds([])).resolves.toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("lets unlinked firms (no billing_company_id) pass through", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "firms") {
        return thenableQuery([
          { id: "firm-unlinked-1", billing_company_id: null },
          { id: "firm-unlinked-2", billing_company_id: null },
        ]);
      }
      throw new Error(`unexpected table ${table}`);
    });

    await expect(
      filterReviewerAuthorizedFirmIds(["firm-unlinked-1", "firm-unlinked-2"]),
    ).resolves.toEqual(["firm-unlinked-1", "firm-unlinked-2"]);
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("firms");
  });

  it("keeps linked firm with active RA Pro slot", async () => {
    const companyId = "company-active";
    fromMock.mockImplementation((table: string) => {
      if (table === "firms") {
        return thenableQuery([{ id: "firm-linked", billing_company_id: companyId }]);
      }
      if (table === "pilot_slots") {
        return thenableQuery([{ company_id: companyId, pilot_status: "active" }]);
      }
      throw new Error(`unexpected table ${table}`);
    });

    await expect(filterReviewerAuthorizedFirmIds(["firm-linked"])).resolves.toEqual([
      "firm-linked",
    ]);
  });

  it("drops linked firm with cancelled RA Pro slot", async () => {
    const companyId = "company-cancelled";
    fromMock.mockImplementation((table: string) => {
      if (table === "firms") {
        return thenableQuery([{ id: "firm-cancelled", billing_company_id: companyId }]);
      }
      if (table === "pilot_slots") {
        return thenableQuery([{ company_id: companyId, pilot_status: "cancelled" }]);
      }
      throw new Error(`unexpected table ${table}`);
    });

    await expect(filterReviewerAuthorizedFirmIds(["firm-cancelled"])).resolves.toEqual([]);
  });

  it("mixes unlinked pass-through with linked entitlement filtering", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "firms") {
        return thenableQuery([
          { id: "firm-legacy", billing_company_id: null },
          { id: "firm-ok", billing_company_id: "co-ok" },
          { id: "firm-bad", billing_company_id: "co-bad" },
        ]);
      }
      if (table === "pilot_slots") {
        return thenableQuery([
          { company_id: "co-ok", pilot_status: "active" },
          { company_id: "co-bad", pilot_status: "cancelled" },
        ]);
      }
      throw new Error(`unexpected table ${table}`);
    });

    await expect(
      filterReviewerAuthorizedFirmIds(["firm-legacy", "firm-ok", "firm-bad"]),
    ).resolves.toEqual(["firm-legacy", "firm-ok"]);
  });
});
