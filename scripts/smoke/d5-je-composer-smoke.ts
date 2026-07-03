/* eslint-disable no-console */
// D5.3 JE composer + poster smoke — 12 scenarios.
// Run: npx tsx scripts/smoke/d5-je-composer-smoke.ts
//
// Seeds recurring_templates with a "D5.3-SMOKE-" name prefix against the
// reserved test client, creates proposed recurring_fires directly, then drives
// postFire() end to end. Happy-path scenarios (6-10) POST to the live QBO
// sandbox and therefore require the reserved client's QBO connection to be
// write-enabled + healthy (same setup used by the D4 live proof). Teardown
// deletes seeded templates (fires + schedule lines cascade). Prints PASS/FAIL
// per scenario; exits 1 on any FAIL.
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
import { postFire } from "../../lib/recurring/je-poster";
import { composeJEPayloadForFire } from "../../lib/recurring/je-composer";

const TEST_CLIENT = "71111111-1111-4111-8111-111111111111";
const NAME_PREFIX = "D5.3-SMOKE-";

// Sandbox accounts proven to post cleanly in the D2/D4 proofs.
const DR_ACCOUNT = "7"; // Advertising
const CR_ACCOUNT = "35"; // Checking

type Json = Record<string, unknown>;

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
function pass(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

function balancedFixedPayload(amount: number): Json {
  return {
    Line: [
      {
        Amount: amount,
        Description: "D5.3 smoke debit",
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { value: DR_ACCOUNT } },
      },
      {
        Amount: amount,
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: { PostingType: "Credit", AccountRef: { value: CR_ACCOUNT } },
      },
    ],
  };
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
    je_payload_template: balancedFixedPayload(50),
    cadence: "monthly",
    day_of_month: 15,
    start_date: "2024-01-01",
    next_fire_date: "2024-01-15",
    status: "active",
    ...over,
  };
  const { data, error } = await supabase
    .from("recurring_templates")
    .insert(row)
    .select("template_id")
    .single();
  if (error) throw new Error(`seed template failed: ${error.message}`);
  return (data as Json).template_id as string;
}

async function seedFire(templateId: string, over: Json = {}): Promise<string> {
  const supabase = getSupabaseAdmin();
  const row: Json = {
    template_id: templateId,
    firm_client_id: TEST_CLIENT,
    fire_date: "2024-01-15",
    period_index: 1,
    status: "proposed",
    ...over,
  };
  const { data, error } = await supabase
    .from("recurring_fires")
    .insert(row)
    .select("fire_id")
    .single();
  if (error) throw new Error(`seed fire failed: ${error.message}`);
  return (data as Json).fire_id as string;
}

async function getFire(fireId: string): Promise<Json | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("recurring_fires").select("*").eq("fire_id", fireId).maybeSingle();
  return (data as Json) ?? null;
}

async function getTemplate(templateId: string): Promise<Json | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("recurring_templates")
    .select("*")
    .eq("template_id", templateId)
    .maybeSingle();
  return (data as Json) ?? null;
}

async function main() {
  console.log("=== D5.3 JE composer + poster smoke ===\n");
  const supabase = getSupabaseAdmin();

  // Preserve accounting_method (scenario 11 mutates it).
  const { data: clientRow } = await supabase
    .from("firm_clients")
    .select("accounting_method")
    .eq("id", TEST_CLIENT)
    .maybeSingle();
  const originalMethod = (clientRow as Json | null)?.accounting_method as string | undefined;

  try {
    await cleanup();

    // --- 1. fire_not_found (no side effects) -------------------------------
    {
      const r = await postFire(randomUUID());
      pass(
        "1. fire_not_found returns proposed/no-op",
        r.final_fire_status === "proposed" && r.reason === "fire_not_found",
        `status=${r.final_fire_status} reason=${r.reason}`,
      );
    }

    // --- 2. not_proposed: settled fire is never re-posted ------------------
    {
      const t = await seedTemplate();
      const fireId = await seedFire(t, { status: "failed", period_index: 2 });
      const r = await postFire(fireId);
      const fire = await getFire(fireId);
      pass(
        "2. not_proposed: failed fire untouched",
        r.reason === "not_proposed" && String(fire?.status) === "failed",
        `reason=${r.reason} status=${fire?.status}`,
      );
    }

    // --- 3. compose fail: template_missing_lines → failed ------------------
    {
      const t = await seedTemplate({ je_payload_template: {} });
      const fireId = await seedFire(t);
      const r = await postFire(fireId);
      const fire = await getFire(fireId);
      pass(
        "3. empty payload → failed reason:template_missing_lines",
        r.final_fire_status === "failed" &&
          String(fire?.status) === "failed" &&
          String(fire?.error_detail) === "reason:template_missing_lines",
        `status=${fire?.status} detail=${fire?.error_detail}`,
      );
    }

    // --- 4. compose fail: unbalanced_template → failed ---------------------
    {
      const payload = balancedFixedPayload(50);
      (payload.Line as Json[])[1].Amount = 40; // break balance
      const t = await seedTemplate({ je_payload_template: payload });
      const fireId = await seedFire(t);
      const r = await postFire(fireId);
      const fire = await getFire(fireId);
      pass(
        "4. unbalanced fixed → failed reason:unbalanced_template",
        r.final_fire_status === "failed" &&
          String(fire?.error_detail) === "reason:unbalanced_template",
        `detail=${fire?.error_detail}`,
      );
    }

    // --- 5. compose fail: line_missing_posting_type → failed ---------------
    {
      const payload: Json = {
        Line: [
          {
            Amount: 50,
            DetailType: "JournalEntryLineDetail",
            JournalEntryLineDetail: { AccountRef: { value: DR_ACCOUNT } }, // no PostingType
          },
        ],
      };
      const t = await seedTemplate({ je_payload_template: payload });
      const fireId = await seedFire(t);
      const r = await postFire(fireId);
      const fire = await getFire(fireId);
      pass(
        "5. missing PostingType → failed reason:line_missing_posting_type",
        r.final_fire_status === "failed" &&
          String(fire?.error_detail) === "reason:line_missing_posting_type",
        `detail=${fire?.error_detail}`,
      );
    }

    // Ensure accrual for the happy-path posts.
    await supabase.from("firm_clients").update({ accounting_method: "accrual" }).eq("id", TEST_CLIENT);

    // --- 6. happy path fixed → posted + qbo_je_id + post_count bump --------
    let postedFireId = "";
    {
      const t = await seedTemplate({ je_payload_template: balancedFixedPayload(42.5) });
      postedFireId = await seedFire(t);
      const r = await postFire(postedFireId);
      const fire = await getFire(postedFireId);
      const tpl = await getTemplate(t);
      pass(
        "6. fixed happy path → posted with qbo_je_id, post_count=1",
        r.final_fire_status === "posted" &&
          !!r.qbo_je_id &&
          String(fire?.status) === "posted" &&
          fire?.qbo_je_id != null &&
          fire?.je_attempt_id != null &&
          Number(tpl?.post_count) === 1,
        `status=${r.final_fire_status} je=${r.qbo_je_id} post_count=${tpl?.post_count} reason=${r.reason ?? "n/a"}`,
      );
    }

    // --- 7. re-run postFire on posted fire → not_proposed (no double post) -
    {
      const r = await postFire(postedFireId);
      pass(
        "7. re-run posted fire → not_proposed (idempotent, no double post)",
        r.final_fire_status === "posted" && r.reason === "not_proposed",
        `status=${r.final_fire_status} reason=${r.reason}`,
      );
    }

    // --- 8. straight_line → posted, amount re-derived from engine ----------
    {
      const t = await seedTemplate({
        template_type: "straight_line",
        starting_balance: 1200,
        total_periods: 12,
        je_payload_template: balancedFixedPayload(9999), // payload amount is ignored
      });
      // amount_override deliberately wrong to prove re-derivation.
      const fireId = await seedFire(t, { amount_override: 7777 });
      const r = await postFire(fireId);
      // Read the D2 audit row for the derived DR total (should be 100.00).
      const attemptId = (await getFire(fireId))?.je_attempt_id as string | undefined;
      let drTotal: number | null = null;
      if (attemptId) {
        const { data: audit } = await supabase
          .from("je_posting_audit")
          .select("dr_total")
          .eq("attempt_id", attemptId)
          .maybeSingle();
        drTotal = (audit as Json | null)?.dr_total as number | null;
      }
      pass(
        "8. straight_line posts engine-derived amount (1200/12=100.00), not amount_override",
        r.final_fire_status === "posted" && Number(drTotal) === 100,
        `status=${r.final_fire_status} dr_total=${drTotal} reason=${r.reason ?? "n/a"}`,
      );
    }

    // --- 9. schedule → posted with schedule-line amount --------------------
    {
      const t = await seedTemplate({
        template_type: "schedule",
        je_payload_template: balancedFixedPayload(1),
      });
      await supabase.from("recurring_schedule_lines").insert({
        template_id: t,
        period_index: 1,
        amount: 321.0,
      });
      const fireId = await seedFire(t);
      const r = await postFire(fireId);
      const attemptId = (await getFire(fireId))?.je_attempt_id as string | undefined;
      let drTotal: number | null = null;
      if (attemptId) {
        const { data: audit } = await supabase
          .from("je_posting_audit")
          .select("dr_total")
          .eq("attempt_id", attemptId)
          .maybeSingle();
        drTotal = (audit as Json | null)?.dr_total as number | null;
      }
      pass(
        "9. schedule posts schedule-line amount (321.00)",
        r.final_fire_status === "posted" && Number(drTotal) === 321,
        `status=${r.final_fire_status} dr_total=${drTotal} reason=${r.reason ?? "n/a"}`,
      );
    }

    // --- 10. idempotency key format (pure composer, no DB) -----------------
    {
      const t = await seedTemplate();
      const tpl = await getTemplate(t);
      const composed = composeJEPayloadForFire({
        template: {
          template_id: String(tpl?.template_id),
          firm_client_id: TEST_CLIENT,
          name: "x",
          description: null,
          template_type: "fixed",
          je_payload_template: balancedFixedPayload(10),
          cadence: "monthly",
          custom_days: null,
          day_of_month: 15,
          day_of_week: null,
          month_of_year: null,
          timezone: "America/New_York",
          starting_balance: null,
          total_periods: null,
          periods_elapsed: 0,
          start_date: "2024-01-01",
          end_date: null,
          next_fire_date: "2024-01-15",
          last_fired_at: null,
          status: "active",
          auto_post: false,
          origin: "user",
          origin_memory_id: null,
          fire_count: 0,
          post_count: 0,
          skip_count: 0,
          reject_count: 0,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          created_by_user_id: null,
          ended_by_user_id: null,
          ended_at: null,
        },
        period_index: 3,
        fire_date: "2024-03-15",
      });
      pass(
        "10. composer idempotency key = recurring_<template>_<period>",
        composed.ok && composed.idempotency_key === `recurring_${tpl?.template_id}_3`,
        composed.ok ? composed.idempotency_key : `not ok: ${(composed as { reason: string }).reason}`,
      );
    }

    // --- 11. cash-basis client → rejected ----------------------------------
    {
      await supabase.from("firm_clients").update({ accounting_method: "cash" }).eq("id", TEST_CLIENT);
      const t = await seedTemplate({ je_payload_template: balancedFixedPayload(60) });
      const fireId = await seedFire(t);
      const r = await postFire(fireId);
      const fire = await getFire(fireId);
      pass(
        "11. cash-basis client → rejected reason:cash_basis_notes_only",
        r.final_fire_status === "rejected" &&
          String(fire?.status) === "rejected" &&
          String(fire?.error_detail) === "reason:cash_basis_notes_only",
        `status=${r.final_fire_status} detail=${fire?.error_detail}`,
      );
      await supabase
        .from("firm_clients")
        .update({ accounting_method: originalMethod ?? "accrual" })
        .eq("id", TEST_CLIENT);
    }

    // --- 12. compose fail: line_missing_account_id → failed ----------------
    {
      const payload: Json = {
        Line: [
          {
            Amount: 50,
            DetailType: "JournalEntryLineDetail",
            JournalEntryLineDetail: { PostingType: "Debit", AccountRef: {} }, // no value
          },
        ],
      };
      const t = await seedTemplate({ je_payload_template: payload });
      const fireId = await seedFire(t);
      const r = await postFire(fireId);
      const fire = await getFire(fireId);
      pass(
        "12. missing AccountRef.value → failed reason:line_missing_account_id",
        r.final_fire_status === "failed" &&
          String(fire?.error_detail) === "reason:line_missing_account_id",
        `detail=${fire?.error_detail}`,
      );
    }
  } finally {
    await cleanup();
    await supabase
      .from("firm_clients")
      .update({ accounting_method: originalMethod ?? "accrual" })
      .eq("id", TEST_CLIENT);
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
