import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { resolveEntitlementsForFirmClient, canAddClient } from "@/lib/entitlements";
import { POST as waitlistPost } from "@/app/api/waitlist/route";
import { soloBkStepsEstimatedTotal } from "@/lib/onboarding-solo-bk-steps";

const hasSupabase =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = hasSupabase
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  : null;

const NY_COMPANY_ID = process.env.TEST_NY_COMPANY_ID ?? "00000000-0000-0000-0000-000000000001";

describe("Phase TCP1 W1 — Solo Bookkeeper", () => {
  describe("pilot_slot_number > 0 filter", () => {
    it.skipIf(!hasSupabase)("public_pilot_slot_count excludes slot 0", async () => {
      const { data, error } = await supabase!.rpc("public_pilot_slot_count", {
        p_tier_key: "solo_bookkeeper",
      });
      expect(error).toBeNull();
      expect(typeof data).toBe("number");
      expect(data).toBeGreaterThanOrEqual(0);
      expect(data).toBeLessThanOrEqual(10);
    });
  });

  describe("Entitlements resolver", () => {
    it.skipIf(!hasSupabase)("resolves NY contractor as complimentary with 3-client cap", async () => {
      const ent = await resolveEntitlementsForFirmClient(NY_COMPANY_ID);
      expect(ent).not.toBeNull();
      expect(ent!.tier_key).toBe("solo_bookkeeper");
      expect(ent!.pricing_track).toBe("complimentary");
      expect(ent!.is_complimentary).toBe(true);
      expect(ent!.complimentary_client_cap).toBe(3);
      expect(ent!.max_entities).toBe(3);
    });

    it.skipIf(!hasSupabase)("returns null for a firm-client with no pilot_slots row", async () => {
      const fakeId = "ffffffff-ffff-ffff-ffff-ffffffffffff";
      const ent = await resolveEntitlementsForFirmClient(fakeId);
      expect(ent).toBeNull();
    });
  });

  describe("canAddClient enforcement", () => {
    it.skipIf(!hasSupabase)("returns shaped response for capacity checks", async () => {
      const result = await canAddClient(NY_COMPANY_ID);
      expect(result).toHaveProperty("allowed");
      expect(result).toHaveProperty("capacity_remaining");
      if (!result.allowed) {
        expect(["complimentary_cap_reached", "tier_max_entities_reached", "no_active_plan"]).toContain(
          result.reason,
        );
      }
    });
  });

  describe("Waitlist API", () => {
    it("rejects invalid email", async () => {
      const req = new Request("http://localhost/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku_key: "owner_pro", email: "not-an-email" }),
      });
      const res = await waitlistPost(req);
      expect(res.status).toBe(400);
    });

    it("rejects invalid sku_key", async () => {
      const req = new Request("http://localhost/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku_key: "solo_bookkeeper", email: "test@example.com" }),
      });
      const res = await waitlistPost(req);
      expect(res.status).toBe(400);
    });

    it.skipIf(!hasSupabase)("accepts a valid Owner Pro capture", async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const req = new Request("http://localhost/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku_key: "owner_pro",
          email: uniqueEmail,
          submitted_from: "test_suite",
        }),
      });
      const res = await waitlistPost(req);
      expect(res.ok).toBe(true);
      const { data } = await supabase!
        .from("sku_launch_waitlist")
        .select("*")
        .eq("email", uniqueEmail)
        .eq("sku_key", "owner_pro")
        .maybeSingle();
      expect(data).not.toBeNull();
      await supabase!.from("sku_launch_waitlist").delete().eq("email", uniqueEmail);
    });
  });

  describe("Onboarding total estimate ≤ 15 min", () => {
    it("SOLO_BK_STEPS estimated seconds sum ≤ 900", () => {
      expect(soloBkStepsEstimatedTotal()).toBeLessThanOrEqual(900);
      expect(soloBkStepsEstimatedTotal()).toBe(870);
    });
  });
});
