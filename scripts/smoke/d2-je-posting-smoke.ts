/* eslint-disable no-console */
// D2 smoke — uses QBO sandbox realm 9341457151063823
// Account IDs: 7 = Advertising (Expense), 35 = Checking (Bank)
// Note: 84 (A/R) requires a customer entity in QBO sandbox — do not use for smoke tests.
//
// NOTE: this posts REAL journal entries to the QBO sandbox (idempotency +
// balanced cases). Requires the D2 migration applied and a healthy QBO
// connection for the test firm_client.
//
// Run:  npx tsx scripts/smoke/d2-je-posting-smoke.ts
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

function loadEnv(path: string) {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv(".env.local");
loadEnv(".env");

import { qboJournalEntryPoster } from "../../lib/erp/quickbooks/journal-entry-poster";
import { getSupabaseAdmin } from "../../lib/supabase-admin.js";

const FIRM_CLIENT_ID = "71111111-1111-4111-8111-111111111111";
const DR_ACCOUNT = "7"; // Advertising (Expense)
const CR_ACCOUNT = "35"; // Checking (Bank)

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
function pass(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

async function main() {
  console.log("=== D2 JE posting smoke test ===\n");
  const supabase = getSupabaseAdmin();

  // Case 1: cash-basis client rejects
  await supabase.from("firm_clients").update({ accounting_method: "cash" }).eq("id", FIRM_CLIENT_ID);
  const cashResult = await qboJournalEntryPoster.post({
    firm_client_id: FIRM_CLIENT_ID,
    idempotency_key: `smoke_cash_${randomUUID()}`,
    source_type: "manual",
    posted_by: "human",
    payload: {
      transaction_date: "2026-07-01",
      lines: [
        { account_id: DR_ACCOUNT, amount: 1.0, posting_type: "Debit" },
        { account_id: CR_ACCOUNT, amount: 1.0, posting_type: "Credit" },
      ],
    },
  });
  pass(
    "cash basis client rejects with cash_basis_notes_only",
    cashResult.status === "rejected" && cashResult.reason === "cash_basis_notes_only",
    `status=${cashResult.status} reason=${cashResult.status === "rejected" ? cashResult.reason : "n/a"}`,
  );

  // Restore to accrual
  await supabase.from("firm_clients").update({ accounting_method: "accrual" }).eq("id", FIRM_CLIENT_ID);

  // Case 2: write disabled
  await supabase.from("firm_clients").update({ qbo_write_enabled: false }).eq("id", FIRM_CLIENT_ID);
  const disabledResult = await qboJournalEntryPoster.post({
    firm_client_id: FIRM_CLIENT_ID,
    idempotency_key: `smoke_disabled_${randomUUID()}`,
    source_type: "manual",
    posted_by: "human",
    payload: {
      transaction_date: "2026-07-01",
      lines: [
        { account_id: DR_ACCOUNT, amount: 1.0, posting_type: "Debit" },
        { account_id: CR_ACCOUNT, amount: 1.0, posting_type: "Credit" },
      ],
    },
  });
  pass(
    "write disabled rejects with write_disabled",
    disabledResult.status === "rejected" && disabledResult.reason === "write_disabled",
    `status=${disabledResult.status}`,
  );

  // Enable write for remaining tests
  await supabase.from("firm_clients").update({ qbo_write_enabled: true }).eq("id", FIRM_CLIENT_ID);

  // Case 3: unbalanced rejected
  const unbalanced = await qboJournalEntryPoster.post({
    firm_client_id: FIRM_CLIENT_ID,
    idempotency_key: `smoke_unbal_${randomUUID()}`,
    source_type: "manual",
    posted_by: "human",
    payload: {
      transaction_date: "2026-07-01",
      lines: [
        { account_id: DR_ACCOUNT, amount: 1.0, posting_type: "Debit" },
        { account_id: CR_ACCOUNT, amount: 0.9, posting_type: "Credit" },
      ],
    },
  });
  pass(
    "unbalanced payload rejects with unbalanced",
    unbalanced.status === "rejected" && unbalanced.reason === "unbalanced",
    `status=${unbalanced.status}`,
  );

  // Case 4: idempotency — same key posted twice
  const idemKey = `smoke_idem_${randomUUID()}`;
  const payload = {
    transaction_date: "2026-07-01",
    narration: "D2 smoke idempotency test",
    lines: [
      { account_id: DR_ACCOUNT, amount: 1.0, posting_type: "Debit" as const },
      { account_id: CR_ACCOUNT, amount: 1.0, posting_type: "Credit" as const },
    ],
  };
  const first = await qboJournalEntryPoster.post({
    firm_client_id: FIRM_CLIENT_ID,
    idempotency_key: idemKey,
    source_type: "manual",
    posted_by: "human",
    payload,
  });
  const second = await qboJournalEntryPoster.post({
    firm_client_id: FIRM_CLIENT_ID,
    idempotency_key: idemKey,
    source_type: "manual",
    posted_by: "human",
    payload,
  });
  const idemOk =
    (first.status === "posted" &&
      second.status === "posted" &&
      (first as { qbo_je_id: string }).qbo_je_id === (second as { qbo_je_id: string }).qbo_je_id) ||
    (first.status !== "posted" &&
      second.status === "rejected" &&
      (second as { reason: string }).reason === "duplicate_idempotency_key");
  pass(
    "same idempotency_key returns same outcome (no double-post)",
    idemOk,
    `first=${first.status}${first.status === "posted" ? " je=" + first.qbo_je_id : ""} second=${second.status}`,
  );

  // Case 5: audit rows present
  const { data: auditRows } = await supabase
    .from("je_posting_audit")
    .select("audit_id, status, rejection_reason, assertions_addressed")
    .eq("firm_client_id", FIRM_CLIENT_ID)
    .order("created_at", { ascending: false })
    .limit(10);
  pass(
    "audit rows written for recent attempts",
    !!auditRows && auditRows.length >= 4,
    `rows=${auditRows?.length ?? 0}`,
  );
  pass(
    "je_posting_audit.assertions_addressed column readable (defaults to empty array)",
    !!auditRows && auditRows.every((r: { assertions_addressed?: unknown }) => Array.isArray(r.assertions_addressed)),
    `sample=${JSON.stringify(auditRows?.[0]?.assertions_addressed ?? null)}`,
  );

  // Case 6: MC-3 — CurrencyRef + ExchangeRate=1 on USD-home sandbox
  // Adapted to this smoke's pass() helper (paste used t.test / assert naming).
  const todayIso = new Date().toISOString().slice(0, 10);
  const mc3Key = `mc3_smoke_${Date.now()}`;
  const mc3Result = await qboJournalEntryPoster.post({
    firm_client_id: FIRM_CLIENT_ID,
    idempotency_key: mc3Key,
    source_type: "manual",
    posted_by: "human",
    payload: {
      transaction_date: todayIso,
      narration: "MC-3 smoke — currency writeback",
      currency: "USD",
      lines: [
        { account_id: DR_ACCOUNT, amount: 10.0, posting_type: "Debit", description: "MC-3 test DR" },
        { account_id: CR_ACCOUNT, amount: 10.0, posting_type: "Credit", description: "MC-3 test CR" },
      ],
    },
  });
  pass(
    "MC-3: JE posts with CurrencyRef + ExchangeRate=1 on USD-home sandbox",
    mc3Result.status === "posted",
    `status=${mc3Result.status}${mc3Result.status === "posted" ? " je=" + mc3Result.qbo_je_id : " reason=" + (mc3Result as { reason?: string }).reason}`,
  );

  if (mc3Result.status === "posted") {
    const { data: mc3Audit } = await supabase
      .from("je_posting_audit")
      .select("currency, exchange_rate, home_currency_at_post")
      .eq("idempotency_key", mc3Key)
      .single();
    pass(
      "MC-3: audit row captured currency + exchange_rate + home_currency_at_post",
      mc3Audit?.currency === "USD" &&
        Number(mc3Audit?.exchange_rate) === 1 &&
        mc3Audit?.home_currency_at_post === "USD",
      `currency=${mc3Audit?.currency} rate=${mc3Audit?.exchange_rate} home=${mc3Audit?.home_currency_at_post}`,
    );
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
