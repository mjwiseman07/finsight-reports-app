/* eslint-disable no-console */
// D2 Step 8 — live sandbox JE post + reversal + memory verification
// Account IDs: 7 = Advertising (Expense), 35 = Checking (Bank)
// Run after migration applied: npx tsx scripts/smoke/d2-live-je-test.ts
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

import { qboJournalEntryPoster } from "../../lib/erp/quickbooks/journal-entry-poster";
import { getSupabaseAdmin } from "../../lib/supabase-admin.js";

const FIRM_CLIENT_ID = "71111111-1111-4111-8111-111111111111";
const ADMIN_USER_ID = "a4ebf834-a698-4f79-a945-8498f2e6c45d";
const DR_ACCOUNT = "7";
const CR_ACCOUNT = "35";

async function main() {
  console.log("=== D2 live sandbox JE test ===\n");
  const supabase = getSupabaseAdmin();

  // Ensure accrual + write enabled
  await supabase
    .from("firm_clients")
    .update({ accounting_method: "accrual", qbo_write_enabled: true })
    .eq("id", FIRM_CLIENT_ID);

  const today = new Date().toISOString().slice(0, 10);
  const idemKey = `d2_live_test_${Date.now()}`;

  const postResult = await qboJournalEntryPoster.post({
    firm_client_id: FIRM_CLIENT_ID,
    idempotency_key: idemKey,
    source_type: "manual",
    posted_by: "human",
    posted_by_user_id: ADMIN_USER_ID,
    payload: {
      transaction_date: today,
      narration: "D2 live sandbox test",
      lines: [
        { account_id: DR_ACCOUNT, amount: 1.0, posting_type: "Debit" },
        { account_id: CR_ACCOUNT, amount: 1.0, posting_type: "Credit" },
      ],
    },
  });

  console.log("POST:", JSON.stringify(postResult, null, 2));
  if (postResult.status !== "posted") {
    console.error("Live post failed");
    process.exit(1);
  }

  const { data: audit } = await supabase
    .from("je_posting_audit")
    .select("audit_id, status, qbo_je_id")
    .eq("attempt_id", postResult.attempt_id)
    .single();
  console.log("AUDIT:", audit);

  const { data: memories } = await supabase
    .from("company_memory_records")
    .select("memory_id, memory_type, persistence_status, payload")
    .eq("memory_type", "posted_je")
    .contains("payload", { qbo_je_id: postResult.qbo_je_id })
    .limit(1);
  console.log("MEMORY:", memories?.[0] ?? "(not found)");

  const reverseResult = await qboJournalEntryPoster.reverse(
    postResult.attempt_id,
    "smoke test cleanup",
    ADMIN_USER_ID,
  );
  console.log("\nREVERSE:", JSON.stringify(reverseResult, null, 2));

  const { data: originalAttempt } = await supabase
    .from("je_post_attempts")
    .select("status, qbo_je_id")
    .eq("attempt_id", postResult.attempt_id)
    .single();
  console.log("ORIGINAL_ATTEMPT_STATUS:", originalAttempt?.status);

  console.log("\n=== LIVE TEST SUMMARY ===");
  console.log(`  posted JE ID:    ${postResult.qbo_je_id}`);
  console.log(
    `  reversal JE ID:  ${reverseResult.status === "posted" ? reverseResult.qbo_je_id : "n/a"}`,
  );
  console.log(`  memory_id:       ${memories?.[0]?.memory_id ?? "n/a"}`);
  console.log(`  attempt_id:      ${postResult.attempt_id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
