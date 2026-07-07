import { describe, it, expect } from "vitest";
import { evaluateQc02 } from "@/lib/ap-intake/quarantine/gates/qc-02-bookkeeper-allowlist";

function makeSupabase(row: { id: string } | null) {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        is() {
                          return { maybeSingle: async () => ({ data: row }) };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as Parameters<typeof evaluateQc02>[0]["supabase"];
}

describe("qc-02 bookkeeper allowlist gate", () => {
  it("admin tier auto-passes", async () => {
    const r = await evaluateQc02({
      supabase: makeSupabase(null),
      firmId: "f1",
      releaseActorUserId: "u1",
      releaseActorTier: "admin",
    });
    expect(r.pass).toBe(true);
    expect(r.reason).toBe("not_bookkeeper_tier");
  });

  it("reviewer tier auto-passes", async () => {
    const r = await evaluateQc02({
      supabase: makeSupabase(null),
      firmId: "f1",
      releaseActorUserId: "u1",
      releaseActorTier: "reviewer",
    });
    expect(r.pass).toBe(true);
  });

  it("bookkeeper with allowlist row passes", async () => {
    const r = await evaluateQc02({
      supabase: makeSupabase({ id: "a1" }),
      firmId: "f1",
      releaseActorUserId: "u1",
      releaseActorTier: "bookkeeper",
    });
    expect(r.pass).toBe(true);
    expect(r.reason).toBe("on_allowlist");
  });

  it("bookkeeper without allowlist row fails", async () => {
    const r = await evaluateQc02({
      supabase: makeSupabase(null),
      firmId: "f1",
      releaseActorUserId: "u1",
      releaseActorTier: "bookkeeper",
    });
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("bookkeeper_not_on_allowlist");
  });
});
