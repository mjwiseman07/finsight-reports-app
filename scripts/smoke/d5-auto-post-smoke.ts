/* eslint-disable no-console */
// D5.4 auto-post dispatcher smoke — 8 scenarios.
// Run: npx tsx scripts/smoke/d5-auto-post-smoke.ts
//
// Drives dispatchAutoPostForClient() against the reserved test client, toggling
// firm_clients.recurring_auto_post_enabled / accounting_method and per-template
// auto_post to exercise every gate branch plus the live dispatch path.
// Scenarios 1, 5, 6, 8 POST to the live QBO sandbox and require the reserved
// client's connection to be write-enabled + healthy (same setup as the D5.3
// smoke). Teardown deletes seeded templates (fires cascade) and restores the
// client baseline (auto_post_enabled=true, accounting_method='accrual').
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
import { dispatchAutoPostForClient } from "../../lib/recurring/auto-post-dispatcher";

const TEST_CLIENT = "71111111-1111-4111-8111-111111111111";
const NAME_PREFIX = "D5.4-SMOKE-";

const DR_ACCOUNT = "7"; // Advertising
const CR_ACCOUNT = "35"; // Checking

type Json = Record<string, unknown>;

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
function pass(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

function balancedPayload(amount: number): Json {
  return {
    Line: [
      {
        Amount: amount,
        Description: "D5.4 smoke debit",
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

async function setClient(autoPostEnabled: boolean, accountingMethod: string) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("firm_clients")
    .update({ recurring_auto_post_enabled: autoPostEnabled, accounting_method: accountingMethod })
    .eq("id", TEST_CLIENT);
}

async function seedTemplateWithFire(
  templateOver: Json = {},
  fireOver: Json = {},
): Promise<{ templateId: string; fireId: string }> {
  const supabase = getSupabaseAdmin();
  const tplRow: Json = {
    firm_client_id: TEST_CLIENT,
    name: `${NAME_PREFIX}${randomUUID().slice(0, 8)}`,
    template_type: "fixed",
    je_payload_template: balancedPayload(25),
    cadence: "monthly",
    day_of_month: 15,
    start_date: "2024-01-01",
    next_fire_date: "2024-01-15",
    status: "active",
    auto_post: true,
    ...templateOver,
  };
  const { data: tpl, error: tplErr } = await supabase
    .from("recurring_templates")
    .insert(tplRow)
    .select("template_id")
    .single();
  if (tplErr) throw new Error(`seed template failed: ${tplErr.message}`);
  const templateId = (tpl as Json).template_id as string;

  const fireRow: Json = {
    template_id: templateId,
    firm_client_id: TEST_CLIENT,
    fire_date: "2024-01-15",
    period_index: 1,
    status: "proposed",
    ...fireOver,
  };
  const { data: fire, error: fireErr } = await supabase
    .from("recurring_fires")
    .insert(fireRow)
    .select("fire_id")
    .single();
  if (fireErr) throw new Error(`seed fire failed: ${fireErr.message}`);
  return { templateId, fireId: (fire as Json).fire_id as string };
}

async function getFire(fireId: string): Promise<Json | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("recurring_fires").select("*").eq("fire_id", fireId).maybeSingle();
  return (data as Json) ?? null;
}

async function main() {
  console.log("=== D5.4 auto-post dispatcher smoke ===\n");

  try {
    // --- 1. fully enabled → dispatched + posted ----------------------------
    await cleanup();
    await setClient(true, "accrual");
    {
      const { fireId } = await seedTemplateWithFire({ je_payload_template: balancedPayload(30) });
      const s = await dispatchAutoPostForClient(TEST_CLIENT);
      const fire = await getFire(fireId);
      pass(
        "1. enabled+auto_post → dispatched & posted",
        s.dispatched === 1 && s.posted === 1 && String(fire?.status) === "posted",
        `dispatched=${s.dispatched} posted=${s.posted} status=${fire?.status}`,
      );
    }

    // --- 2. client kill switch off → held client_auto_post_disabled --------
    await cleanup();
    await setClient(false, "accrual");
    {
      const { fireId } = await seedTemplateWithFire();
      const s = await dispatchAutoPostForClient(TEST_CLIENT);
      const fire = await getFire(fireId);
      pass(
        "2. client disabled → held (client_auto_post_disabled), fire untouched",
        s.held === 1 &&
          s.hold_reasons.client_auto_post_disabled === 1 &&
          s.dispatched === 0 &&
          String(fire?.status) === "proposed",
        `held=${s.held} reason=${s.hold_reasons.client_auto_post_disabled} status=${fire?.status}`,
      );
    }

    // --- 3. template auto_post off → held template_auto_post_off -----------
    await cleanup();
    await setClient(true, "accrual");
    {
      await seedTemplateWithFire({ auto_post: false });
      const s = await dispatchAutoPostForClient(TEST_CLIENT);
      pass(
        "3. template auto_post off → held (template_auto_post_off)",
        s.held === 1 && s.hold_reasons.template_auto_post_off === 1 && s.dispatched === 0,
        `held=${s.held} reason=${s.hold_reasons.template_auto_post_off}`,
      );
    }

    // --- 4. cash-basis client → held cash_basis_client (no post) -----------
    await cleanup();
    await setClient(true, "cash");
    {
      const { fireId } = await seedTemplateWithFire();
      const s = await dispatchAutoPostForClient(TEST_CLIENT);
      const fire = await getFire(fireId);
      pass(
        "4. cash-basis client → held (cash_basis_client), no post",
        s.held === 1 &&
          s.hold_reasons.cash_basis_client === 1 &&
          s.dispatched === 0 &&
          String(fire?.status) === "proposed",
        `held=${s.held} reason=${s.hold_reasons.cash_basis_client} status=${fire?.status}`,
      );
    }

    // --- 5. template paused → held template_not_active ---------------------
    await cleanup();
    await setClient(true, "accrual");
    {
      // Seed active first (fire insert is fine), then flip template to paused.
      const { templateId, fireId } = await seedTemplateWithFire();
      const supabase = getSupabaseAdmin();
      await supabase.from("recurring_templates").update({ status: "paused" }).eq("template_id", templateId);
      const s = await dispatchAutoPostForClient(TEST_CLIENT);
      const fire = await getFire(fireId);
      pass(
        "5. paused template → held (template_not_active), no post",
        s.held === 1 &&
          s.hold_reasons.template_not_active === 1 &&
          s.dispatched === 0 &&
          String(fire?.status) === "proposed",
        `held=${s.held} reason=${s.hold_reasons.template_not_active} status=${fire?.status}`,
      );
    }

    // --- 6. mixed batch: one dispatch + one hold ---------------------------
    await cleanup();
    await setClient(true, "accrual");
    {
      const a = await seedTemplateWithFire({ je_payload_template: balancedPayload(11) });
      await seedTemplateWithFire({ auto_post: false }); // held
      const s = await dispatchAutoPostForClient(TEST_CLIENT);
      const fireA = await getFire(a.fireId);
      pass(
        "6. mixed batch → 1 dispatched+posted, 1 held",
        s.fires_scanned === 2 &&
          s.dispatched === 1 &&
          s.posted === 1 &&
          s.held === 1 &&
          s.hold_reasons.template_auto_post_off === 1 &&
          String(fireA?.status) === "posted",
        `scanned=${s.fires_scanned} dispatched=${s.dispatched} posted=${s.posted} held=${s.held}`,
      );
    }

    // --- 7. no proposed fires → empty summary, zeroed hold_reasons ---------
    await cleanup();
    await setClient(true, "accrual");
    {
      const s = await dispatchAutoPostForClient(TEST_CLIENT);
      const allZero = Object.values(s.hold_reasons).every((v) => v === 0);
      pass(
        "7. no proposed fires → zeroed summary with all 5 hold_reasons keys",
        s.fires_scanned === 0 &&
          s.dispatched === 0 &&
          s.held === 0 &&
          allZero &&
          Object.keys(s.hold_reasons).length === 5,
        `scanned=${s.fires_scanned} keys=${Object.keys(s.hold_reasons).length}`,
      );
    }

    // --- 8. idempotency: re-dispatch after post → held fire_not_proposed ---
    await cleanup();
    await setClient(true, "accrual");
    {
      const { fireId } = await seedTemplateWithFire({ je_payload_template: balancedPayload(13) });
      const first = await dispatchAutoPostForClient(TEST_CLIENT);
      // Second run: the fire is now 'posted', so the query for proposed fires
      // returns nothing → no re-post. (Gate would also hold fire_not_proposed.)
      const second = await dispatchAutoPostForClient(TEST_CLIENT);
      const fire = await getFire(fireId);
      pass(
        "8. re-dispatch after post → no double post (idempotent)",
        first.posted === 1 &&
          second.dispatched === 0 &&
          second.posted === 0 &&
          String(fire?.status) === "posted",
        `first_posted=${first.posted} second_dispatched=${second.dispatched} status=${fire?.status}`,
      );
    }
  } finally {
    await cleanup();
    await setClient(true, "accrual");
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
