import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => new Map<string, Record<string, unknown>>());

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        store.set(String(row.token_hash), { ...row, consumed_at: null });
        return { error: null };
      },
      select: () => ({
        eq: (_c: string, hash: string) => ({
          maybeSingle: async () => ({ data: store.get(hash) ?? null, error: null }),
        }),
      }),
      update: (patch: Record<string, unknown>) => ({
        eq: (_c: string, hash: string) => ({
          is: async () => {
            const row = store.get(hash);
            if (row) Object.assign(row, patch);
            return { error: null };
          },
        }),
      }),
    }),
  }),
}));

import { issuePurgeToken, verifyAndConsumePurgeToken } from "../purge-tokens";

describe("gap2 purge tokens", () => {
  beforeEach(() => store.clear());

  it("issue + verifyConsume works once", async () => {
    const raw = await issuePurgeToken("firm-1", "user-1");
    const first = await verifyAndConsumePurgeToken(raw);
    expect(first).toEqual({ firm_id: "firm-1", user_id: "user-1" });
    const second = await verifyAndConsumePurgeToken(raw);
    expect(second).toBeNull();
  });
});
