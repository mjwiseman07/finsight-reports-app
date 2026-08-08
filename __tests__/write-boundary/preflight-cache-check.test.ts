import { describe, it, expect, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  checkQboCacheForWrite,
  checkXeroCacheForWrite,
} from "@/lib/accounting/write-boundary/preflight-cache-check";

type Terminal = { data: unknown; error?: { message: string } | null };

/**
 * Fluent supabase-js mock. Terminals: `.in()` resolves for miss lookups;
 * `.maybeSingle()` resolves for age lookups. Queue shifts on each terminal.
 */
function makeAdmin(terminals: Terminal[]): SupabaseClient {
  const queue = [...terminals];
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.order = vi.fn(self);
  chain.limit = vi.fn(self);
  chain.in = vi.fn(() => {
    const next = queue.shift() ?? { data: [], error: null };
    return Promise.resolve(next);
  });
  chain.maybeSingle = vi.fn(async () => queue.shift() ?? { data: null, error: null });
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient;
}

describe("checkQboCacheForWrite", () => {
  afterEach(() => {
    delete process.env.ACCOUNTS_CACHE_MAX_AGE_HOURS;
  });

  it("returns preflight-miss when referenced account_id absent from cache", async () => {
    const admin = makeAdmin([{ data: [{ account_id: "1", active: true }] }]);
    const r = await checkQboCacheForWrite({
      admin,
      connectionId: "c1",
      referencedAccountIds: ["1", "2"],
    });
    expect(r.shouldRefresh).toBe(true);
    if (r.shouldRefresh) expect(r.trigger).toBe("preflight-miss");
  });

  it("returns preflight-stale when all accounts present but cache old", async () => {
    process.env.ACCOUNTS_CACHE_MAX_AGE_HOURS = "24";
    const stale = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const admin = makeAdmin([
      { data: [{ account_id: "1", active: true }] },
      { data: { cached_at: stale } },
    ]);
    const r = await checkQboCacheForWrite({
      admin,
      connectionId: "c1",
      referencedAccountIds: ["1"],
    });
    expect(r.shouldRefresh).toBe(true);
    if (r.shouldRefresh) expect(r.trigger).toBe("preflight-stale");
  });

  it("returns fresh when all accounts present and cache young", async () => {
    process.env.ACCOUNTS_CACHE_MAX_AGE_HOURS = "24";
    const fresh = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    const admin = makeAdmin([
      { data: [{ account_id: "1", active: true }] },
      { data: { cached_at: fresh } },
    ]);
    const r = await checkQboCacheForWrite({
      admin,
      connectionId: "c1",
      referencedAccountIds: ["1"],
    });
    expect(r.shouldRefresh).toBe(false);
  });

  it("empty cache treated as preflight-miss", async () => {
    const admin = makeAdmin([{ data: [] }]);
    const r = await checkQboCacheForWrite({
      admin,
      connectionId: "c1",
      referencedAccountIds: ["1"],
    });
    expect(r.shouldRefresh).toBe(true);
    if (r.shouldRefresh) expect(r.trigger).toBe("preflight-miss");
  });

  it("respects env override on threshold", async () => {
    process.env.ACCOUNTS_CACHE_MAX_AGE_HOURS = "1";
    const twoHoursOld = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const admin = makeAdmin([
      { data: [{ account_id: "1", active: true }] },
      { data: { cached_at: twoHoursOld } },
    ]);
    const r = await checkQboCacheForWrite({
      admin,
      connectionId: "c1",
      referencedAccountIds: ["1"],
    });
    expect(r.shouldRefresh).toBe(true);
    if (r.shouldRefresh) expect(r.trigger).toBe("preflight-stale");
  });
});

describe("checkXeroCacheForWrite", () => {
  it("keys on account_code and status='ACTIVE'", async () => {
    const admin = makeAdmin([{ data: [{ account_code: "090", status: "ACTIVE" }] }]);
    const r = await checkXeroCacheForWrite({
      admin,
      connectionId: "c1",
      referencedAccountCodes: ["090", "091"],
    });
    expect(r.shouldRefresh).toBe(true);
    if (r.shouldRefresh) expect(r.trigger).toBe("preflight-miss");
  });

  it("treats ARCHIVED cached rows as missing", async () => {
    const admin = makeAdmin([{ data: [{ account_code: "090", status: "ARCHIVED" }] }]);
    const r = await checkXeroCacheForWrite({
      admin,
      connectionId: "c1",
      referencedAccountCodes: ["090"],
    });
    expect(r.shouldRefresh).toBe(true);
    if (r.shouldRefresh) expect(r.trigger).toBe("preflight-miss");
  });
});
