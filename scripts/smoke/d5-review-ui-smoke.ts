/* eslint-disable no-console */
// D5.5 recurring review UI smoke — 10 end-to-end scenarios (HTTP + DB).
// Run (with `npm run dev` live in another terminal):
//   SMOKE_ACCESS_TOKEN=<jwt> npx tsx scripts/smoke/d5-review-ui-smoke.ts
//
// Exercises the review API surface end-to-end:
//   GET  /api/recurring/fires?firm_client_id=...
//   POST /api/recurring/fires/:id/{post,skip,reject}
// Seeds proposed fires via supabaseAdmin, calls the HTTP routes with a bearer
// token, and asserts both the JSON responses and the resulting DB state.
// Scenario 7 posts to the live QBO sandbox (needs a write-enabled connection,
// same as the D5.3/D5.4 smokes). Every scenario cleans up after itself; the
// client baseline (recurring_auto_post_enabled=true, accounting_method='accrual')
// is restored in finally.
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

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const ACCESS_TOKEN = process.env.SMOKE_ACCESS_TOKEN ?? "";
const TEST_CLIENT = "71111111-1111-4111-8111-111111111111";
const NAME_PREFIX = "D5.5-SMOKE-";

const DR_ACCOUNT = "7"; // Advertising
const CR_ACCOUNT = "35"; // Checking

if (!ACCESS_TOKEN) {
  console.error(
    "SMOKE_ACCESS_TOKEN is required. Grab a user JWT from the browser " +
      "(localStorage 'supabase_access_token' after signing in as a firm member " +
      "with access to the test client) or a service token, then re-run:\n" +
      "  SMOKE_ACCESS_TOKEN=<jwt> npx tsx scripts/smoke/d5-review-ui-smoke.ts",
  );
  process.exit(1);
}

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
        Description: "D5.5 smoke debit",
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

async function apiGet(path: string): Promise<{ status: number; body: Json }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  const body = (await res.json().catch(() => ({}))) as Json;
  return { status: res.status, body };
}

async function apiPost(path: string, body?: Json): Promise<{ status: number; body: Json }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const respBody = (await res.json().catch(() => ({}))) as Json;
  return { status: res.status, body: respBody };
}

async function cleanup() {
  const supabase = getSupabaseAdmin();
  // Never DELETE fires by hand in prod, but the smoke owns its seeded templates;
  // deleting the template cascades its fires (test-only teardown).
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
  const { data } = await supabase
    .from("recurring_fires")
    .select("*")
    .eq("fire_id", fireId)
    .maybeSingle();
  return (data as Json) ?? null;
}

function findRow(body: Json, fireId: string): Json | undefined {
  const rows = Array.isArray(body.rows) ? (body.rows as Json[]) : [];
  return rows.find((r) => r.fire_id === fireId);
}

async function main() {
  console.log("=== D5.5 recurring review UI smoke ===\n");
  console.log(`  base: ${BASE_URL}  client: ${TEST_CLIENT}\n`);

  try {
    // --- 1. GET list: proposed fire enriched, gate=dispatch ----------------
    await cleanup();
    await setClient(true, "accrual");
    {
      const { fireId } = await seedTemplateWithFire({ je_payload_template: balancedPayload(100) });
      const { status, body } = await apiGet(
        `/api/recurring/fires?firm_client_id=${TEST_CLIENT}`,
      );
      const row = findRow(body, fireId);
      pass(
        "1. GET list → row present, amount=100, gate=dispatch",
        status === 200 &&
          !!row &&
          row.amount === 100 &&
          (row.gate_decision as Json)?.action === "dispatch",
        `status=${status} amount=${row?.amount} gate=${JSON.stringify(row?.gate_decision)}`,
      );
    }

    // --- 2. gate=cash_basis_client on cash client --------------------------
    await cleanup();
    await setClient(true, "cash");
    {
      const { fireId } = await seedTemplateWithFire();
      const { body } = await apiGet(`/api/recurring/fires?firm_client_id=${TEST_CLIENT}`);
      const row = findRow(body, fireId);
      const g = row?.gate_decision as Json | undefined;
      pass(
        "2. cash client → gate hold cash_basis_client",
        g?.action === "hold" && g?.reason === "cash_basis_client",
        JSON.stringify(g),
      );
    }

    // --- 3. gate=client_auto_post_disabled ---------------------------------
    await cleanup();
    await setClient(false, "accrual");
    {
      const { fireId } = await seedTemplateWithFire();
      const { body } = await apiGet(`/api/recurring/fires?firm_client_id=${TEST_CLIENT}`);
      const g = findRow(body, fireId)?.gate_decision as Json | undefined;
      pass(
        "3. client disabled → gate hold client_auto_post_disabled",
        g?.action === "hold" && g?.reason === "client_auto_post_disabled",
        JSON.stringify(g),
      );
    }

    // --- 4. gate=template_auto_post_off ------------------------------------
    await cleanup();
    await setClient(true, "accrual");
    {
      const { fireId } = await seedTemplateWithFire({ auto_post: false });
      const { body } = await apiGet(`/api/recurring/fires?firm_client_id=${TEST_CLIENT}`);
      const g = findRow(body, fireId)?.gate_decision as Json | undefined;
      pass(
        "4. template auto_post off → gate hold template_auto_post_off",
        g?.action === "hold" && g?.reason === "template_auto_post_off",
        JSON.stringify(g),
      );
    }

    // --- 5. straight_line amount is engine truth, not override -------------
    await cleanup();
    await setClient(true, "accrual");
    {
      const { fireId } = await seedTemplateWithFire(
        {
          template_type: "straight_line",
          starting_balance: 1200,
          total_periods: 12,
          je_payload_template: balancedPayload(999), // ignored for straight_line
        },
        { amount_override: 7777, period_index: 1 },
      );
      const { body } = await apiGet(`/api/recurring/fires?firm_client_id=${TEST_CLIENT}`);
      const row = findRow(body, fireId);
      pass(
        "5. straight_line period 1 of 1200/12 → amount=100, override=7777 shown separately",
        row?.amount === 100 && row?.amount_override === 7777,
        `amount=${row?.amount} override=${row?.amount_override}`,
      );
    }

    // --- 6. skip requires a reason (400) -----------------------------------
    await cleanup();
    await setClient(true, "accrual");
    {
      const { fireId } = await seedTemplateWithFire();
      const empty = await apiPost(`/api/recurring/fires/${fireId}/skip`, {});
      const fire = await getFire(fireId);
      pass(
        "6. skip without reason → 400, fire still proposed",
        empty.status === 400 &&
          empty.body.error === "skip_reason_required" &&
          String(fire?.status) === "proposed",
        `status=${empty.status} error=${empty.body.error} fire=${fire?.status}`,
      );
    }

    // --- 7. manual post bypasses gate → posts live (QBO sandbox) -----------
    await cleanup();
    // Deliberately disable auto-post everywhere; manual post must still work.
    await setClient(false, "accrual");
    {
      const { fireId } = await seedTemplateWithFire({
        auto_post: false,
        je_payload_template: balancedPayload(42),
      });
      const res = await apiPost(`/api/recurring/fires/${fireId}/post`);
      const fire = await getFire(fireId);
      pass(
        "7. manual post bypasses gate → fire posted, reviewer stamped",
        res.status === 200 &&
          String(fire?.status) === "posted" &&
          !!fire?.qbo_je_id &&
          !!fire?.reviewer_user_id,
        `status=${res.status} fire=${fire?.status} qbo=${fire?.qbo_je_id ?? "none"}`,
      );
    }

    // --- 8. skip → status skipped, reason + reviewer recorded --------------
    await cleanup();
    await setClient(true, "accrual");
    {
      const { fireId } = await seedTemplateWithFire();
      const res = await apiPost(`/api/recurring/fires/${fireId}/skip`, {
        skip_reason: "duplicate this month",
      });
      const fire = await getFire(fireId);
      pass(
        "8. skip with reason → status skipped, audit fields set",
        res.status === 200 &&
          String(fire?.status) === "skipped" &&
          fire?.skip_reason === "duplicate this month" &&
          !!fire?.reviewer_user_id &&
          !!fire?.reviewed_at,
        `status=${res.status} fire=${fire?.status} reason=${fire?.skip_reason}`,
      );
    }

    // --- 9. reject → status rejected, reason recorded ----------------------
    await cleanup();
    await setClient(true, "accrual");
    {
      const { fireId } = await seedTemplateWithFire();
      const res = await apiPost(`/api/recurring/fires/${fireId}/reject`, {
        reject_reason: "wrong client",
      });
      const fire = await getFire(fireId);
      pass(
        "9. reject with reason → status rejected, audit fields set",
        res.status === 200 &&
          String(fire?.status) === "rejected" &&
          fire?.reject_reason === "wrong client" &&
          !!fire?.reviewer_user_id,
        `status=${res.status} fire=${fire?.status} reason=${fire?.reject_reason}`,
      );
    }

    // --- 10. non-proposed fire → 409; unknown fire → 404 -------------------
    await cleanup();
    await setClient(true, "accrual");
    {
      const { fireId } = await seedTemplateWithFire();
      // First skip succeeds.
      await apiPost(`/api/recurring/fires/${fireId}/skip`, { skip_reason: "first" });
      // Second skip on the now-skipped fire → 409.
      const dup = await apiPost(`/api/recurring/fires/${fireId}/skip`, { skip_reason: "second" });
      // Unknown fire → 404.
      const missing = await apiPost(`/api/recurring/fires/${randomUUID()}/skip`, {
        skip_reason: "x",
      });
      pass(
        "10. re-skip → 409 fire_not_proposed; unknown → 404 fire_not_found",
        dup.status === 409 &&
          dup.body.error === "fire_not_proposed" &&
          missing.status === 404 &&
          missing.body.error === "fire_not_found",
        `dup=${dup.status}/${dup.body.error} missing=${missing.status}/${missing.body.error}`,
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
