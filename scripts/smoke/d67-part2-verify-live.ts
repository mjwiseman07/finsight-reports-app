/**
 * D6.7 Part 2 — live smoke: Layer 2 orchestration against Supabase.
 * Run: npx tsx scripts/smoke/d67-part2-verify-live.ts --cleanup
 */
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { createServiceClient } from "@/lib/supabase/service";
import { runLayer2ForUnmatchedPayment } from "@/lib/cash-app/pipeline";

const CLEANUP = process.argv.includes("--cleanup");

function loadEnv(filePath: string) {
  try {
    readFileSync(filePath, "utf8")
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

async function main() {
  const supabase = createServiceClient();

  const { data: firm } = await supabase.from("firms").select("id").limit(1).maybeSingle();
  if (!firm?.id) throw new Error("No firm in database");

  const firmId = firm.id;
  const companyId = randomUUID();
  const paymentId = randomUUID();

  console.log(`[smoke] Using synthetic firmId=${firmId} companyId=${companyId}`);

  const { error: fcErr } = await supabase.from("firm_clients").insert({
    firm_id: firmId,
    name: `d67-p2-smoke-${companyId.slice(0, 8)}`,
    company_id: companyId,
    is_demo: true,
    industry_vertical: "general",
    accounting_method: "accrual",
    subscription_status: "active",
  });
  if (fcErr) throw new Error(`firm_client insert: ${fcErr.message}`);

  const { error: paymentInsertError } = await supabase.from("ar_cash_app_payments").insert({
    id: paymentId,
    firm_id: firmId,
    company_id: companyId,
    payment_source: "manual_entry",
    payer_name_raw: "AMBIGUOUS PAYER LLC",
    amount_received: 987.65,
    currency: "USD",
    payment_date: "2026-07-05",
    match_status: "unmatched",
    pairing_method: "unpaired",
  });
  if (paymentInsertError) {
    throw new Error(`Failed to insert synthetic payment: ${paymentInsertError.message}`);
  }

  const invoiceIds = [randomUUID(), randomUUID(), randomUUID()];
  const candidateInvoices = [
    {
      id: invoiceIds[0],
      invoiceNumber: "SMOKE-001",
      customerId: randomUUID(),
      customerName: "Totally Unrelated Corp ZZZ",
      amount: 12.34,
      dueDate: "2020-01-01",
      currency: "USD",
    },
    {
      id: invoiceIds[1],
      invoiceNumber: "SMOKE-002",
      customerId: randomUUID(),
      customerName: "Another Mismatch LLC",
      amount: 56.78,
      dueDate: "2019-06-15",
      currency: "USD",
    },
    {
      id: invoiceIds[2],
      invoiceNumber: "SMOKE-003",
      customerId: randomUUID(),
      customerName: "Third Wrong Customer Inc",
      amount: 99.99,
      dueDate: "2018-01-01",
      currency: "USD",
    },
  ];

  const payment = {
    id: paymentId,
    payerNameRaw: "AMBIGUOUS PAYER LLC",
    amountReceived: 987.65,
    currency: "USD",
    paymentDateIso: "2026-07-05",
    memoRaw: null,
  };

  await runLayer2ForUnmatchedPayment(supabase, payment, candidateInvoices, {
    firmId,
    companyId,
  });

  const { data: events, error: eventsError } = await supabase
    .from("ledger_events")
    .select("event_type")
    .eq("firm_id", firmId)
    .like("event_type", "cash_app.layer2_%");

  if (eventsError) throw new Error(`Failed to query ledger_events: ${eventsError.message}`);
  if (!events || events.length === 0) {
    throw new Error("ASSERTION FAILED: expected at least one cash_app.layer2_* event, found none");
  }
  console.log(
    `[smoke] PASS: found ${events.length} layer2 event(s): ${events.map((e) => e.event_type).join(", ")}`,
  );

  const { data: matchScoreRows } = await supabase
    .from("ar_cash_app_match_scores")
    .select("verdict, llm_tier_used")
    .eq("payment_id", paymentId);

  const { data: reviewItemRows } = await supabase
    .from("ar_cash_app_review_items")
    .select("id, status")
    .eq("payment_id", paymentId);

  const hasOutcome =
    (matchScoreRows && matchScoreRows.length > 0) ||
    (reviewItemRows && reviewItemRows.length > 0);
  if (!hasOutcome) {
    throw new Error("ASSERTION FAILED: payment produced neither a match score row nor a review item");
  }
  console.log(
    `[smoke] PASS: matchScoreRows=${matchScoreRows?.length ?? 0} reviewItemRows=${reviewItemRows?.length ?? 0}`,
  );

  if (reviewItemRows && reviewItemRows.length > 0) {
    console.log("[smoke] PASS: low-confidence scenario correctly routed to Layer 4 review queue");
  } else if (matchScoreRows && matchScoreRows.some((r) => r.llm_tier_used)) {
    console.log(
      `[smoke] PASS: LLM was invoked (tier=${matchScoreRows.find((r) => r.llm_tier_used)?.llm_tier_used})`,
    );
  }

  if (CLEANUP) {
    await supabase.from("ar_cash_app_review_items").delete().eq("payment_id", paymentId);
    await supabase.from("ar_cash_app_match_scores").delete().eq("payment_id", paymentId);
    await supabase.from("ledger_events").delete().eq("firm_id", firmId);
    await supabase.from("ar_cash_app_payments").delete().eq("id", paymentId);
    await supabase.from("firm_clients").delete().eq("company_id", companyId);
    console.log("[smoke] Cleanup complete.");
  } else {
    console.log("[smoke] Synthetic data left in place. Re-run with --cleanup to remove it.");
  }

  console.log("[smoke] ALL ASSERTIONS PASSED");
  process.exit(0);
}

main().catch((err) => {
  console.error("[smoke] FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
