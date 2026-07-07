/**
 * Phase D6.5 Part 2 — Block 3
 * NY Pilot Allowlist Seed — MANUAL STEP AT GO-LIVE.
 *
 * Usage (from repo root):
 *   NY_PILOT_USER_ID=<uuid> WISEMAN_FIRM_ID=<uuid> npx tsx scripts/seed-ny-pilot-allowlist.ts
 *
 * This script NEVER contains real UUIDs in source control. It reads env vars,
 * upserts one row into bookkeeper_release_allowlist, and exits.
 *
 * Idempotent — safe to run multiple times.
 */
import { createServiceClient } from "../lib/supabase/service";

async function main(): Promise<void> {
  const userId = process.env.NY_PILOT_USER_ID;
  const firmId = process.env.WISEMAN_FIRM_ID;
  if (!userId || !firmId) {
    throw new Error(
      "NY_PILOT_USER_ID and WISEMAN_FIRM_ID env vars are required. " +
        "See D6.5 Part 2 Block 3 spec for details.",
    );
  }

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("bookkeeper_release_allowlist")
    .select("id, revoked_at")
    .eq("firm_id", firmId)
    .eq("user_id", userId)
    .eq("scope", "quarantine_release")
    .maybeSingle();

  if (existing) {
    if (existing.revoked_at) {
      const { error } = await supabase
        .from("bookkeeper_release_allowlist")
        .update({ revoked_at: null, granted_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
      console.log("[ny-pilot] Re-activated existing allowlist row:", existing.id);
    } else {
      console.log("[ny-pilot] Allowlist row already active:", existing.id);
    }
    return;
  }

  const { data, error } = await supabase
    .from("bookkeeper_release_allowlist")
    .insert({
      firm_id: firmId,
      user_id: userId,
      scope: "quarantine_release",
      note: "NY contractor pilot — activated at Block 3 go-live",
    })
    .select("id")
    .single();
  if (error) throw error;

  console.log("[ny-pilot] Created allowlist row:", data?.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
