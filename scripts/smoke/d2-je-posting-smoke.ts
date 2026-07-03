/* eslint-disable no-console */
// D2 smoke — uses QBO sandbox realm 9341457151063823
// Account IDs: 7 = Advertising (Expense), 84 = Accounts Receivable (Asset)
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
const CR_ACCOUNT = "84"; // Accounts Receivable (Asset)

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
    .select("audit_id, status, rejection_reason")
    .eq("firm_client_id", FIRM_CLIENT_ID)
    .order("created_at", { ascending: false })
    .limit(10);
  pass(
    "audit rows written for recent attempts",
    !!auditRows && auditRows.length >= 4,
    `rows=${auditRows?.length ?? 0}`,
  );

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
