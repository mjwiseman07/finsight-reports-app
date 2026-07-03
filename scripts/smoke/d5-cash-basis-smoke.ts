/* eslint-disable no-console */
/**
 * D5.6 smoke — cash-basis review notes.
 *
 * SCENARIOS
 *   1. Cash fire lands with status='cash_basis', amount_override=NULL
 *   2. Memory record mem_cash_basis_client_<firmClientId> exists after fire
 *   3. Idempotent re-fire attempt hits UNIQUE(template_id, period_index)
 *   4. Second cash template fire bumps memory confidence 0.7 → 0.75
 *   5. Flip client back to 'accrual' → next fire lands 'proposed'
 *   6. Historical 'cash_basis' fires remain in status='cash_basis'
 *
 * TEARDOWN
 *   - restore firm_clients.accounting_method to 'accrual'
 *   - delete test memory record
 *   - delete test recurring_fires + recurring_templates created here
 *
 * NOTE (deviation from spec paste): createFixedTemplate uses the real
 * recurring_templates columns (cadence, day_of_month, created_by_user_id, name,
 * start_date). The spec's cadence_type/cadence_config/recurring_auto_post_enabled/
 * created_by columns do not exist on recurring_templates and name/start_date are
 * NOT NULL, so the original insert would fail. Behavior + assertions unchanged.
 */
import { readFileSync } from "node:fs";

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

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FIRM_CLIENT_ID = "71111111-1111-4111-8111-111111111111";
const MEMORY_ID = `mem_cash_basis_client_${FIRM_CLIENT_ID}`;
const NAME_PREFIX = "D5.6-SMOKE-";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

let templateIdA: string | null = null;
let templateIdB: string | null = null;

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
function record(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function createFixedTemplate(nextDate: string): Promise<string> {
  const { data, error } = await supabase
    .from("recurring_templates")
    .insert({
      firm_client_id: FIRM_CLIENT_ID,
      name: `${NAME_PREFIX}${nextDate}`,
      status: "active",
      template_type: "fixed",
      cadence: "monthly",
      day_of_month: 15,
      next_fire_date: nextDate,
      start_date: "2026-01-01",
      periods_elapsed: 0,
      fire_count: 0,
      auto_post: false,
      je_payload_template: {
        description: "D5.6 smoke fixed",
        Line: [
          {
            Amount: 100,
            DetailType: "JournalEntryLineDetail",
            JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { value: "60" } },
          },
          {
            Amount: 100,
            DetailType: "JournalEntryLineDetail",
            JournalEntryLineDetail: { PostingType: "Credit", AccountRef: { value: "10" } },
          },
        ],
      },
      description: "D5.6 smoke fixture",
      created_by_user_id: null,
    })
    .select("template_id")
    .single();
  if (error) throw new Error(`create template failed: ${error.message}`);
  return data.template_id as string;
}

async function flipAccountingMethod(method: "cash" | "accrual"): Promise<void> {
  const { error } = await supabase
    .from("firm_clients")
    .update({ accounting_method: method })
    .eq("id", FIRM_CLIENT_ID);
  if (error) throw new Error(`flip failed: ${error.message}`);
}

async function fireOnce(): Promise<{ fires_created: number; errors: unknown[] }> {
  const { fireDueTemplatesForClient } = await import("@/lib/recurring/scheduler");
  const summary = await fireDueTemplatesForClient(FIRM_CLIENT_ID, new Date("2026-07-15T14:00:00Z"));
  return { fires_created: summary.fires_created, errors: summary.errors };
}

async function readMemoryConfidence(): Promise<number | null> {
  const { data } = await supabase
    .from("company_memory_records")
    .select("confidence_score")
    .eq("memory_id", MEMORY_ID)
    .maybeSingle();
  return typeof data?.confidence_score === "number" ? data.confidence_score : null;
}

async function teardown(): Promise<void> {
  await flipAccountingMethod("accrual").catch(() => {});
  await supabase.from("company_memory_records").delete().eq("memory_id", MEMORY_ID);
  if (templateIdA) {
    await supabase.from("recurring_fires").delete().eq("template_id", templateIdA);
    await supabase.from("recurring_templates").delete().eq("template_id", templateIdA);
  }
  if (templateIdB) {
    await supabase.from("recurring_fires").delete().eq("template_id", templateIdB);
    await supabase.from("recurring_templates").delete().eq("template_id", templateIdB);
  }
}

async function main() {
  try {
    // Clean slate
    await supabase.from("company_memory_records").delete().eq("memory_id", MEMORY_ID);

    // Fixture
    templateIdA = await createFixedTemplate("2026-07-15");
    await flipAccountingMethod("cash");

    // 1. Cash fire
    await fireOnce();
    const { data: fire1 } = await supabase
      .from("recurring_fires")
      .select("status, amount_override")
      .eq("template_id", templateIdA)
      .single();
    record(
      "1. Cash fire lands with status='cash_basis', amount_override=NULL",
      fire1?.status === "cash_basis" && fire1?.amount_override === null,
      `status=${fire1?.status} amount=${fire1?.amount_override}`,
    );

    // 2. Memory record exists
    const conf1 = await readMemoryConfidence();
    record("2. Memory record exists with confidence 0.7", conf1 === 0.7, `confidence=${conf1}`);

    // 3. Idempotent re-fire
    const rerun = await fireOnce();
    record(
      "3. Re-fire is idempotent (no new fire, UNIQUE violation captured)",
      rerun.fires_created === 0 &&
        rerun.errors.some((e: unknown) =>
          String((e as { error: string }).error).includes("already_fired"),
        ),
      `fires_created=${rerun.fires_created}`,
    );

    // 4. Second template fires → memory confidence bumps
    templateIdB = await createFixedTemplate("2026-07-15");
    await fireOnce();
    const conf2 = await readMemoryConfidence();
    record(
      "4. Second cash fire bumps memory confidence 0.7 → 0.75",
      conf2 !== null && Math.abs(conf2 - 0.75) < 0.001,
      `confidence=${conf2}`,
    );

    // 5. Flip back to accrual
    await flipAccountingMethod("accrual");
    // Reset template A so it can fire again for period 2
    await supabase
      .from("recurring_templates")
      .update({ next_fire_date: "2026-08-15" })
      .eq("template_id", templateIdA);
    const summary5 = await (async () => {
      const { fireDueTemplatesForClient } = await import("@/lib/recurring/scheduler");
      return fireDueTemplatesForClient(FIRM_CLIENT_ID, new Date("2026-08-15T14:00:00Z"));
    })();
    const { data: fire5 } = await supabase
      .from("recurring_fires")
      .select("status")
      .eq("template_id", templateIdA)
      .eq("period_index", 2)
      .single();
    record(
      "5. After flip to accrual, next fire lands status='proposed'",
      fire5?.status === "proposed" && summary5.fires_created === 1,
      `status=${fire5?.status}`,
    );

    // 6. Historical cash_basis fire unchanged
    const { data: fire6 } = await supabase
      .from("recurring_fires")
      .select("status")
      .eq("template_id", templateIdA)
      .eq("period_index", 1)
      .single();
    record(
      "6. Historical cash_basis fire remains status='cash_basis'",
      fire6?.status === "cash_basis",
      `status=${fire6?.status}`,
    );

    const passed = results.filter((r) => r.ok).length;
    console.log(`\n${passed}/${results.length} passed`);
    process.exit(passed === results.length ? 0 : 1);
  } finally {
    await teardown();
  }
}

main().catch((err) => {
  console.error("smoke failed:", err);
  teardown().finally(() => process.exit(1));
});
