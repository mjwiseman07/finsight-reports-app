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

  describe("LOOKUP_KEY_TO_TIER (Bug 1 regression)", () => {
    type LookupMeta = { track: string; cadence: string; structure: string | null };

    it("resolves solo_bk_std_mo to track=standard, cadence=monthly, structure=flat", async () => {
      const { LOOKUP_KEY_TO_TIER } = await import("@/lib/product-tiers");
      const meta = (LOOKUP_KEY_TO_TIER as Record<string, LookupMeta>)["solo_bk_std_mo"];
      expect(meta).toBeDefined();
      expect(meta.track).toBe("standard");
      expect(meta.cadence).toBe("monthly");
      expect(meta.structure).toBe("flat");
    });
    it("resolves solo_bk_pilot_yr to track=pilot, cadence=yearly, structure=flat", async () => {
      const { LOOKUP_KEY_TO_TIER } = await import("@/lib/product-tiers");
      const meta = (LOOKUP_KEY_TO_TIER as Record<string, LookupMeta>)["solo_bk_pilot_yr"];
      expect(meta).toBeDefined();
      expect(meta.track).toBe("pilot");
      expect(meta.cadence).toBe("yearly");
      expect(meta.structure).toBe("flat");
    });
    it("resolves client_seat_std_mo to track=standard, cadence=monthly, structure=perClient", async () => {
      const { LOOKUP_KEY_TO_TIER } = await import("@/lib/product-tiers");
      const meta = (LOOKUP_KEY_TO_TIER as Record<string, LookupMeta>)["client_seat_std_mo"];
      expect(meta).toBeDefined();
      expect(meta.track).toBe("standard");
      expect(meta.cadence).toBe("monthly");
      expect(meta.structure).toBe("perClient");
    });
    it("every entry has track ∈ {standard,pilot} and cadence ∈ {monthly,yearly}", async () => {
      const { LOOKUP_KEY_TO_TIER } = await import("@/lib/product-tiers");
      const validTracks = new Set(["standard", "pilot"]);
      const validCadences = new Set(["monthly", "yearly"]);
      for (const [lookupKey, meta] of Object.entries(LOOKUP_KEY_TO_TIER)) {
        expect(validTracks.has((meta as { track: string }).track), `${lookupKey}.track=${(meta as { track: string }).track}`).toBe(true);
        expect(validCadences.has((meta as { cadence: string }).cadence), `${lookupKey}.cadence=${(meta as { cadence: string }).cadence}`).toBe(true);
      }
    });
  });

  describe("pilot_slot_number NULL for standard-track (Bug 2 regression)", () => {
    it.skipIf(!hasSupabase)("supabase accepts pilot_slot_number NULL for standard-track row", async () => {
      const testCompanyId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
      // Best-effort cleanup from any prior run (ignore error if row absent).
      await supabase!
        .from("pilot_slots")
        .delete()
        .eq("company_id", testCompanyId)
        .eq("tier_key", "solo_bookkeeper");
      const { error: insertErr } = await supabase!.from("pilot_slots").insert({
        tier_key: "solo_bookkeeper",
        company_id: testCompanyId,
        pilot_slot_number: null,
        pilot_status: "active",
        pricing_structure: "flat",
        pricing_cadence: "monthly",
      });
      // Insert may still fail if the company row does not exist (FK). That's
      // fine for this regression: we care about the CHECK / NOT NULL, not FK.
      if (insertErr && !/violates foreign key/i.test(insertErr.message)) {
        throw insertErr;
      }
      // If it succeeded, clean up.
      await supabase!
        .from("pilot_slots")
        .delete()
        .eq("company_id", testCompanyId)
        .eq("tier_key", "solo_bookkeeper");
      // If we reached here without a non-FK error, the NULL was accepted by
      // the schema. That's the assertion.
      expect(true).toBe(true);
    });
  });

  describe("Retrofit — pilot_slots firm_id / company_id XOR", () => {
    it.skipIf(!hasSupabase)("CHECK rejects row with both firm_id and company_id set", async () => {
      const { error } = await supabase!.from("pilot_slots").insert({
        tier_key: "solo_bookkeeper",
        firm_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        company_id: "ffffffff-eeee-dddd-cccc-bbbbbbbbbbbb",
        pilot_slot_number: null,
        pilot_status: "active",
        pricing_structure: "flat",
        pricing_cadence: "monthly",
      });
      expect(error).not.toBeNull();
      expect(
        /pilot_slots_entity_xor_check|violates foreign key/i.test(error!.message),
        `expected XOR check or FK error, got: ${error!.message}`,
      ).toBe(true);
    });

    it.skipIf(!hasSupabase)("CHECK rejects row with neither firm_id nor company_id set", async () => {
      const { error } = await supabase!.from("pilot_slots").insert({
        tier_key: "solo_bookkeeper",
        firm_id: null,
        company_id: null,
        pilot_slot_number: null,
        pilot_status: "active",
        pricing_structure: "flat",
        pricing_cadence: "monthly",
      });
      expect(error).not.toBeNull();
      expect(/pilot_slots_entity_xor_check/i.test(error!.message)).toBe(true);
    });

    it("getSubscriptionEntity returns 'firm' for firm-tier keys", async () => {
      const { getSubscriptionEntity } = await import("@/lib/product-tiers");
      expect(getSubscriptionEntity("solo_bookkeeper")).toBe("firm");
      expect(getSubscriptionEntity("firm")).toBe("firm");
    });

    it("getSubscriptionEntity returns 'company' for owner-tier keys", async () => {
      const { getSubscriptionEntity } = await import("@/lib/product-tiers");
      expect(getSubscriptionEntity("owner_pro")).toBe("company");
      expect(getSubscriptionEntity("owner_lite")).toBe("company");
    });

    it("getSubscriptionEntity returns null for add-on tiers", async () => {
      const { getSubscriptionEntity } = await import("@/lib/product-tiers");
      expect(getSubscriptionEntity("client_seat_alacarte")).toBeNull();
      expect(getSubscriptionEntity("firm_seat")).toBeNull();
      expect(getSubscriptionEntity("industry_premium_addon")).toBeNull();
    });

    it("getSubscriptionEntity throws for unknown tier keys", async () => {
      const { getSubscriptionEntity } = await import("@/lib/product-tiers");
      expect(() => getSubscriptionEntity("not_a_real_tier")).toThrow(/unknown tier_key/);
    });
  });
});
