/**
 * CI/manual verification: confirms the D-Platform foundation is intact after
 * the migration is applied to live Supabase.
 *
 * Usage: npx tsx scripts/verify-d-platform.ts
 */
import { createServiceClient } from "@/lib/supabase/service";

async function verify(): Promise<void> {
  const supabase = createServiceClient();

  const checks: Array<{ name: string; check: () => Promise<boolean> }> = [
    {
      name: "ledger_events table exists and has expected columns",
      check: async () => {
        const { error } = await supabase
          .from("ledger_events")
          .select("event_id, event_sequence, event_type, event_category")
          .limit(1);
        return !error;
      },
    },
    {
      name: "event_projections has _healthcheck row",
      check: async () => {
        const { data } = await supabase
          .from("event_projections")
          .select("projection_name")
          .eq("projection_name", "_healthcheck")
          .single();
        return Boolean(data);
      },
    },
    {
      name: "ai_action_log table exists",
      check: async () => {
        const { error } = await supabase.from("ai_action_log").select("action_id").limit(1);
        return !error;
      },
    },
    {
      name: "vector_index table exists",
      check: async () => {
        const { error } = await supabase.from("vector_index").select("vector_id").limit(1);
        return !error;
      },
    },
    {
      name: "engagements + portcos tables exist",
      check: async () => {
        const { error: e1 } = await supabase.from("engagements").select("id").limit(1);
        const { error: e2 } = await supabase.from("portcos").select("id").limit(1);
        return !e1 && !e2;
      },
    },
    {
      name: "platform_metrics table exists",
      check: async () => {
        const { error } = await supabase.from("platform_metrics").select("metric_id").limit(1);
        return !error;
      },
    },
  ];

  let ok = true;
  for (const c of checks) {
    try {
      const passed = await c.check();
      console.log(`${passed ? "PASS" : "FAIL"} ${c.name}`);
      if (!passed) ok = false;
    } catch (err) {
      console.log(`FAIL ${c.name} — threw: ${(err as Error).message}`);
      ok = false;
    }
  }

  if (!ok) process.exit(1);
  console.log("\nAll D-Platform foundation checks passed.");
}

void verify();
