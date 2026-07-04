/**
 * D6.4c-1 verification. Run after the migration is applied to live Supabase and
 * before merge sign-off.
 *
 * Verifies:
 *   1. pre_close_review_items table exists and is selectable.
 *   2. JE-balance trigger rejects an unbalanced draft insert.
 *   3. ai_action_log CHECK accepts directive_apply (real column contract).
 *
 * Run with: npx tsx scripts/verify-d6-4c-1.ts
 */
import { createServiceClient } from "@/lib/supabase/service";
import { randomUUID } from "node:crypto";

async function main() {
  const supabase = createServiceClient();
  const errors: string[] = [];

  // 1. Table presence
  const { error: tableErr } = await supabase
    .from("pre_close_review_items")
    .select("id", { count: "exact", head: true })
    .limit(0);
  if (tableErr) errors.push(`table missing/unselectable: ${tableErr.message}`);

  // 2. JE-balance trigger — an intentionally unbalanced draft must be rejected
  const badDraft = {
    narration: "verify",
    transactionDate: "2026-07-06",
    lines: [
      { lineIndex: 0, accountId: "a", accountName: "A", drAmountCents: 100, crAmountCents: 0, memo: "" },
      { lineIndex: 1, accountId: "b", accountName: "B", drAmountCents: 0, crAmountCents: 99, memo: "" },
    ],
  };
  const { error: badErr } = await supabase.from("pre_close_review_items").insert({
    fire_id: randomUUID(),
    firm_client_id: randomUUID(),
    engagement_id: randomUUID(),
    close_period_id: null,
    rule_id: "verify.dummy",
    rule_version: 1,
    accounting_method: "accrual",
    je_draft: badDraft,
    je_draft_total_debit_cents: 100,
    je_draft_total_credit_cents: 99,
    je_draft_line_count: 2,
    rule_reason_code: "verify",
    rule_reason_detail: {},
    severity: "info",
    evidence_refs: [],
  });
  if (!badErr) {
    errors.push("expected unbalanced insert to be rejected by trigger/constraint, but it succeeded");
  }

  // 3. ai_action_log CHECK widening — insert a directive_apply row (real columns)
  const verifyMarker = `verify-d6-4c-1-${randomUUID()}`;
  const { error: aiErr } = await supabase.from("ai_action_log").insert({
    firm_client_id: null,
    action_type: verifyMarker,
    action_category: "directive_apply",
    model_name: "system:verify",
    model_provider: "local",
    input_summary: verifyMarker,
  });
  if (aiErr) {
    errors.push(`ai_action_log directive_apply insert failed: ${aiErr.message}`);
  } else {
    await supabase.from("ai_action_log").delete().eq("action_type", verifyMarker);
  }

  if (errors.length > 0) {
    console.error("D6.4c-1 verification FAILED");
    for (const e of errors) console.error(" -", e);
    process.exit(1);
  }
  console.log("D6.4c-1 verification OK");
}

main().catch((e) => {
  console.error("D6.4c-1 verification threw:", e);
  process.exit(1);
});
