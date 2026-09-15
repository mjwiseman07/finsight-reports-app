import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RA_PRO_FIRM_SEATS,
  RA_PRO_INCLUDED_CLIENT_COMPANIES,
  RA_PRO_PILOT_COHORT_CAP,
  RA_PRO_TIER_KEY,
} from "@/lib/review-assist-pro/limits";
import {
  REVIEW_ASSIST_PRO_BASE_LIMITS,
  TIERS,
} from "@/lib/product-tiers";

const fromMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: fromMock }),
}));

import { resolveEntitlementsForCompany } from "@/lib/entitlements";

function thenableQuery(data: unknown, error: null | object = null) {
  const result = Promise.resolve({ data, error });
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.eq = self;
  chain.in = self;
  chain.gt = self;
  chain.order = self;
  chain.maybeSingle = () =>
    result.then((r) => ({
      data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data,
      error: r.error,
    }));
  chain.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    result.then(onFulfilled, onRejected);
  return chain;
}

describe("RA Pro Phase B — canonical limits", () => {
  it("exports decision 1A/2A/3A constants", () => {
    expect(RA_PRO_INCLUDED_CLIENT_COMPANIES).toBe(2);
    expect(RA_PRO_FIRM_SEATS).toBe(5);
    expect(RA_PRO_PILOT_COHORT_CAP).toBe(10);
    expect(RA_PRO_TIER_KEY).toBe("review_assist_pro");
  });

  it("product-tiers REVIEW_ASSIST_PRO_BASE_LIMITS and TIERS stay in sync", () => {
    expect(REVIEW_ASSIST_PRO_BASE_LIMITS.max_entities).toBe(2);
    expect(TIERS.review_assist_pro.entitlements.max_entities).toBe(2);
    expect(TIERS.review_assist_pro.entitlements.firm_seats).toBe(5);
    expect(REVIEW_ASSIST_PRO_BASE_LIMITS.max_auditor_users).toBe(RA_PRO_FIRM_SEATS);
  });

  describe("lib/entitlements.ts TIER_META path", () => {
    beforeEach(() => {
      fromMock.mockReset();
    });

    it("resolveEntitlementsForCompany uses RA Pro included-client cap (=2)", async () => {
      const companyId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
      const firmId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

      fromMock.mockImplementation((table: string) => {
        if (table === "pilot_slots") {
          return thenableQuery({
            tier_key: "review_assist_pro",
            pilot_slot_number: 1,
            pilot_status: "active",
            complimentary_client_cap: null,
            pilot_converts_at: null,
            pricing_structure: "flat",
          });
        }
        if (table === "firms") {
          return thenableQuery({ id: firmId });
        }
        if (table === "firm_clients") {
          // count path: select("*", { count: "exact", head: true })
          const chain: Record<string, unknown> = {};
          const self = () => chain;
          chain.select = self;
          chain.eq = self;
          chain.then = (onFulfilled: (v: unknown) => unknown) =>
            onFulfilled({ data: null, error: null, count: 0 });
          return chain;
        }
        return thenableQuery(null);
      });

      const ent = await resolveEntitlementsForCompany(companyId);
      expect(ent).not.toBeNull();
      expect(ent!.tier_key).toBe("review_assist_pro");
      expect(ent!.max_entities).toBe(RA_PRO_INCLUDED_CLIENT_COMPANIES);
      expect(ent!.max_entities).toBe(2);
      expect(ent!.entitlement_flags.firm_seats).toBe(5);
      expect(ent!.entitlement_flags.max_entities).toBe(2);
    });
  });
});
