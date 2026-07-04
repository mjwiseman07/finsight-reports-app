#!/usr/bin/env tsx
/**
 * Rerunnable smoke verification for D-Assertions Part 2.
 */
import { readFileSync } from "node:fs";
import { createServiceClient } from "@/lib/supabase/service";
import { runProjectionWorker } from "@/lib/assertions/projection-worker";

function loadEnv(path: string) {
  try {
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const eq = trimmed.indexOf("=");
        if (eq === -1) return;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
      });
  } catch {
    // optional
  }
}

loadEnv(".env.local");
loadEnv(".env");

interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const results: CheckResult[] = [];

function record(name: string, passed: boolean, detail?: string) {
  results.push({ name, passed, detail });
  const flag = passed ? "PASS" : "FAIL";
  console.log(`[${flag}] ${name}${detail ? " — " + detail : ""}`);
}

async function ensureFixtures(db: ReturnType<typeof createServiceClient>): Promise<{
  firmClientId: string;
  closePeriodId: string;
}> {
  const { data: existing } = await db
    .from("firm_clients")
    .select("id")
    .eq("is_demo", true)
    .limit(1);
  let firmClientId = existing?.[0]?.id as string | undefined;
  if (!firmClientId) {
    const { data: firm } = await db.from("firms").select("id").limit(1).maybeSingle();
    if (!firm) throw new Error("no firm exists — cannot seed smoke fixtures");
    const { data: newClient, error } = await db
      .from("firm_clients")
      .insert({
        firm_id: firm.id,
        name: "SMOKE — D-Assertions Part 2",
        is_demo: true,
        industry_vertical: "general",
        accounting_method: "accrual",
        subscription_status: "active",
      })
      .select("id")
      .single();
    if (error) throw error;
    firmClientId = newClient.id as string;
  }

  const { data: cp } = await db
    .from("close_periods")
    .select("id")
    .eq("firm_client_id", firmClientId)
    .limit(1)
    .maybeSingle();
  let closePeriodId = cp?.id as string | undefined;
  if (!closePeriodId) {
    const { data: newCp, error } = await db
      .from("close_periods")
      .insert({
        firm_client_id: firmClientId,
        period_start: "2026-06-01",
        period_end: "2026-06-30",
        status: "prep",
      })
      .select("id")
      .single();
    if (error) throw error;
    closePeriodId = newCp.id as string;
  }
  return { firmClientId, closePeriodId };
}

async function main() {
  const db = createServiceClient();

  const { count: cacRows } = await db
    .from("close_assertion_coverage")
    .select("*", { count: "exact", head: true });
  record("close_assertion_coverage table exists", cacRows !== null, `pre-existing rows=${cacRows}`);

  const { count: eventCount } = await db
    .from("close_assertion_coverage_events")
    .select("*", { count: "exact", head: true });
  record("close_assertion_coverage_events table exists", eventCount !== null);

  const { data: rootCauses } = await db
    .from("assertion_gap_root_causes")
    .select("root_cause_code");
  record(
    "assertion_gap_root_causes seeded",
    (rootCauses?.length ?? 0) >= 7,
    `count=${rootCauses?.length ?? 0}`,
  );

  const { data: flag } = await db
    .from("advisacor_flags")
    .select("flag_key, flag_value")
    .in("flag_key", ["assertions_gap_reasoning_enabled", "assertions_projection_worker_enabled"]);
  record("advisacor_flags seeded", (flag?.length ?? 0) === 2, JSON.stringify(flag ?? []));

  const { firmClientId, closePeriodId } = await ensureFixtures(db);
  record("fixtures resolved", true, `firm_client=${firmClientId} close_period=${closePeriodId}`);

  const result = await runProjectionWorker(firmClientId, closePeriodId);
  record(
    "projection worker wrote 144 rows",
    result.rowsWritten === 144,
    `rowsWritten=${result.rowsWritten}`,
  );

  const { data: events } = await db
    .from("close_assertion_coverage_events")
    .select("event_type")
    .eq("worker_run_id", result.workerRunId);
  const types = new Set((events ?? []).map((e) => e.event_type));
  record("projection_started emitted", types.has("projection_started"));
  record("projection_completed emitted", types.has("projection_completed"));
  record(
    "reasoner skip event emitted when flag off",
    types.has("gap_reasoner_skipped_flag_off") || result.reasonerEnabled,
  );

  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.error(`\n${failed.length} smoke check(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${results.length} smoke checks passed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
