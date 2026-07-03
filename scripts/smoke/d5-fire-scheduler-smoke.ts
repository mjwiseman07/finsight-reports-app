/* eslint-disable no-console */
// D5.2 fire scheduler smoke — 13 scenarios.
// Run: npx tsx scripts/smoke/d5-fire-scheduler-smoke.ts
//
// Seeds recurring_templates with a "D5.2-SMOKE-" name prefix against the
// reserved test client. Teardown deletes those templates (fires + schedule
// lines cascade via ON DELETE CASCADE). Prints PASS/FAIL per scenario and
// exits 1 on any FAIL.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

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

import { getSupabaseAdmin } from "../../lib/supabase-admin.js";
import { fireDueTemplatesForClient } from "../../lib/recurring/scheduler";
import { rowToRecurringTemplate } from "../../lib/recurring/db-mapper";
import { wallClockToday } from "../../lib/recurring/tz";

const TEST_CLIENT = "71111111-1111-4111-8111-111111111111";
const NAME_PREFIX = "D5.2-SMOKE-";

type Json = Record<string, unknown>;

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
function pass(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

async function cleanup() {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("recurring_templates")
    .delete()
    .eq("firm_client_id", TEST_CLIENT)
    .like("name", `${NAME_PREFIX}%`);
}

async function seedTemplate(over: Json = {}): Promise<string> {
  const supabase = getSupabaseAdmin();
  const row: Json = {
    firm_client_id: TEST_CLIENT,
    name: `${NAME_PREFIX}${randomUUID().slice(0, 8)}`,
    template_type: "fixed",
    je_payload_template: { Line: [{ Amount: 100 }] },
    cadence: "monthly",
    day_of_month: 15,
    start_date: "2020-01-01",
    next_fire_date: "2020-01-15",
    status: "active",
    ...over,
  };
  const { data, error } = await supabase
    .from("recurring_templates")
    .insert(row)
    .select("template_id")
    .single();
  if (error) throw new Error(`seed failed: ${error.message}`);
  return (data as Json).template_id as string;
}

async function getTemplateRow(templateId: string): Promise<Json | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("recurring_templates")
    .select("*")
    .eq("template_id", templateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Json) ?? null;
}

async function getFireRows(templateId: string): Promise<Json[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("recurring_fires")
    .select("*")
    .eq("template_id", templateId);
  if (error) throw new Error(error.message);
  return (data as Json[]) ?? [];
}

async function main() {
  console.log("=== D5.2 fire scheduler smoke ===\n");
  const supabase = getSupabaseAdmin();

  // Capture + restore the test client's timezone (scenario 10 mutates it).
  const { data: clientRow } = await supabase
    .from("firm_clients")
    .select("timezone")
    .eq("id", TEST_CLIENT)
    .maybeSingle();
  const originalTz = (clientRow as Json | null)?.timezone as string | undefined;

  try {
    // --- Scenario 1: due fixed template fires; amount_override null ---------
    await cleanup();
    {
      const id = await seedTemplate({ template_type: "fixed", cadence: "monthly", day_of_month: 15 });
      const summary = await fireDueTemplatesForClient(TEST_CLIENT);
      const fires = await getFireRows(id);
      const tpl = await getTemplateRow(id);
      pass(
        "1. due fixed template fires (proposed, amount null)",
        fires.length === 1 &&
          String(fires[0].status) === "proposed" &&
          fires[0].amount_override == null &&
          summary.fires_created >= 1,
        `fires=${fires.length} status=${fires[0]?.status} amount=${fires[0]?.amount_override}`,
      );
      pass(
        "1b. template advanced (fire_count=1, periods_elapsed=1, next_fire moved)",
        Number(tpl?.fire_count) === 1 &&
          Number(tpl?.periods_elapsed) === 1 &&
          String(tpl?.next_fire_date) > "2020-01-15",
        `fire_count=${tpl?.fire_count} periods=${tpl?.periods_elapsed} next=${tpl?.next_fire_date}`,
      );
    }

    // --- Scenario 2: not-due template does not fire ------------------------
    await cleanup();
    {
      const id = await seedTemplate({ next_fire_date: "2999-01-15" });
      await fireDueTemplatesForClient(TEST_CLIENT);
      const fires = await getFireRows(id);
      const tpl = await getTemplateRow(id);
      pass(
        "2. not-due template does not fire",
        fires.length === 0 && Number(tpl?.fire_count) === 0,
        `fires=${fires.length} fire_count=${tpl?.fire_count}`,
      );
    }

    // --- Scenario 3: paused due template excluded by status filter ---------
    await cleanup();
    {
      const id = await seedTemplate({ status: "paused" });
      await fireDueTemplatesForClient(TEST_CLIENT);
      const fires = await getFireRows(id);
      pass("3. paused due template does not fire", fires.length === 0, `fires=${fires.length}`);
    }

    // --- Scenario 4: idempotency — pre-existing fire → 23505 no-op ----------
    await cleanup();
    {
      const id = await seedTemplate({ next_fire_date: "2020-01-15" });
      // Manually pre-insert the fire for period_index 1 (periods_elapsed 0 + 1).
      await supabase.from("recurring_fires").insert({
        template_id: id,
        firm_client_id: TEST_CLIENT,
        fire_date: "2020-01-15",
        period_index: 1,
        status: "proposed",
      });
      const summary = await fireDueTemplatesForClient(TEST_CLIENT);
      const fires = await getFireRows(id);
      const tpl = await getTemplateRow(id);
      const hadNoop = summary.errors.some((e) => e.error === "already_fired_this_period");
      pass(
        "4. idempotent 23505 no-op (no double fire, no advance)",
        fires.length === 1 && Number(tpl?.fire_count) === 0 && hadNoop,
        `fires=${fires.length} fire_count=${tpl?.fire_count} noop=${hadNoop}`,
      );
    }

    // --- Scenario 5: straight_line even split amount -----------------------
    await cleanup();
    {
      const id = await seedTemplate({
        template_type: "straight_line",
        starting_balance: 1200,
        total_periods: 12,
      });
      await fireDueTemplatesForClient(TEST_CLIENT);
      const fires = await getFireRows(id);
      pass(
        "5. straight_line amount_override = per-period (1200/12 = 100.00)",
        fires.length === 1 && Number(fires[0].amount_override) === 100,
        `amount=${fires[0]?.amount_override}`,
      );
    }

    // --- Scenario 6: straight_line residual in period 1 (1000/12) ----------
    await cleanup();
    {
      const id = await seedTemplate({
        template_type: "straight_line",
        starting_balance: 1000,
        total_periods: 12,
      });
      await fireDueTemplatesForClient(TEST_CLIENT);
      const fires = await getFireRows(id);
      pass(
        "6. straight_line period-1 amount = 83.33 (residual lands in final period)",
        fires.length === 1 && Number(fires[0].amount_override) === 83.33,
        `amount=${fires[0]?.amount_override}`,
      );
    }

    // --- Scenario 7: schedule template amount from schedule line -----------
    await cleanup();
    {
      const id = await seedTemplate({ template_type: "schedule" });
      await supabase.from("recurring_schedule_lines").insert({
        template_id: id,
        period_index: 1,
        amount: 500.25,
      });
      await fireDueTemplatesForClient(TEST_CLIENT);
      const fires = await getFireRows(id);
      pass(
        "7. schedule amount_override from schedule line (500.25)",
        fires.length === 1 && Number(fires[0].amount_override) === 500.25,
        `amount=${fires[0]?.amount_override}`,
      );
    }

    // --- Scenario 8: schedule template with no lines → null amount ---------
    await cleanup();
    {
      const id = await seedTemplate({ template_type: "schedule" });
      await fireDueTemplatesForClient(TEST_CLIENT);
      const fires = await getFireRows(id);
      pass(
        "8. schedule with no lines fires with null amount_override",
        fires.length === 1 && fires[0].amount_override == null,
        `fires=${fires.length} amount=${fires[0]?.amount_override}`,
      );
    }

    // --- Scenario 9: end_date terminal → template ends ---------------------
    await cleanup();
    {
      const injectedNow = new Date("2026-07-16T12:00:00Z");
      const id = await seedTemplate({
        template_type: "fixed",
        cadence: "monthly",
        day_of_month: 15,
        next_fire_date: "2026-07-15",
        end_date: "2026-07-31",
      });
      const summary = await fireDueTemplatesForClient(TEST_CLIENT, injectedNow);
      const fires = await getFireRows(id);
      const tpl = await getTemplateRow(id);
      pass(
        "9. end_date terminal: fires once then status=ended",
        fires.length === 1 &&
          String(tpl?.status) === "ended" &&
          tpl?.ended_at != null &&
          String(tpl?.next_fire_date) === "2026-07-15" &&
          summary.templates_terminated >= 1,
        `status=${tpl?.status} ended_at=${tpl?.ended_at != null} next=${tpl?.next_fire_date} terminated=${summary.templates_terminated}`,
      );
    }

    // --- Scenario 10: today is client wall-clock, NOT server UTC ------------
    await cleanup();
    {
      await supabase.from("firm_clients").update({ timezone: "America/New_York" }).eq("id", TEST_CLIENT);
      // 03:30 UTC Jul 3 == 23:30 EDT Jul 2. NY "today" is Jul 2; UTC is Jul 3.
      const injectedNow = new Date("2026-07-03T03:30:00Z");
      const expectedToday = wallClockToday("America/New_York", injectedNow); // 2026-07-02
      const id = await seedTemplate({ cadence: "weekly", next_fire_date: "2026-07-03" });
      const summary = await fireDueTemplatesForClient(TEST_CLIENT, injectedNow);
      const fires = await getFireRows(id);
      pass(
        "10. today uses client tz (NY 2026-07-02, not UTC 2026-07-03)",
        summary.today === expectedToday &&
          summary.today === "2026-07-02" &&
          fires.length === 0, // next_fire_date 2026-07-03 > NY today → not due
        `today=${summary.today} fires=${fires.length}`,
      );
    }
    // Restore tz for remaining scenarios.
    if (originalTz) {
      await supabase.from("firm_clients").update({ timezone: originalTz }).eq("id", TEST_CLIENT);
    }

    // --- Scenario 11: amount rounding to 2dp (100/3 = 33.33) ---------------
    await cleanup();
    {
      const id = await seedTemplate({
        template_type: "straight_line",
        starting_balance: 100,
        total_periods: 3,
      });
      await fireDueTemplatesForClient(TEST_CLIENT);
      const fires = await getFireRows(id);
      pass(
        "11. straight_line amount rounds to 33.33 (100/3)",
        fires.length === 1 && Number(fires[0].amount_override) === 33.33,
        `amount=${fires[0]?.amount_override}`,
      );
    }

    // --- Scenario 12: db-mapper throws on missing field --------------------
    {
      const badRow: Json = {
        template_id: "x",
        firm_client_id: "y",
        name: "n",
        template_type: "fixed",
        je_payload_template: {},
        // cadence intentionally omitted
        timezone: "UTC",
        periods_elapsed: 0,
        start_date: "2020-01-01",
        next_fire_date: "2020-01-15",
        status: "active",
        auto_post: false,
        origin: "user",
        fire_count: 0,
        post_count: 0,
        skip_count: 0,
        reject_count: 0,
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2020-01-01T00:00:00Z",
      };
      let msg = "";
      try {
        rowToRecurringTemplate(badRow);
      } catch (e) {
        msg = e instanceof Error ? e.message : String(e);
      }
      pass("12. db-mapper throws missing_field:cadence", msg === "d5.mapper.missing_field:cadence", msg);
    }

    // --- Scenario 13: db-mapper throws on invalid enum ---------------------
    {
      const badRow: Json = {
        template_id: "x",
        firm_client_id: "y",
        name: "n",
        template_type: "bogus",
        je_payload_template: {},
        cadence: "monthly",
        timezone: "UTC",
        periods_elapsed: 0,
        start_date: "2020-01-01",
        next_fire_date: "2020-01-15",
        status: "active",
        auto_post: false,
        origin: "user",
        fire_count: 0,
        post_count: 0,
        skip_count: 0,
        reject_count: 0,
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2020-01-01T00:00:00Z",
      };
      let msg = "";
      try {
        rowToRecurringTemplate(badRow);
      } catch (e) {
        msg = e instanceof Error ? e.message : String(e);
      }
      pass("13. db-mapper throws invalid_field:template_type", msg === "d5.mapper.invalid_field:template_type", msg);
    }
  } finally {
    await cleanup();
    if (originalTz) {
      await supabase.from("firm_clients").update({ timezone: originalTz }).eq("id", TEST_CLIENT);
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
