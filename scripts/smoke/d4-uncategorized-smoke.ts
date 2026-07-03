/* eslint-disable no-console */
// D4 uncategorized cleanup smoke — 13 cases.
// Run: npx tsx scripts/smoke/d4-uncategorized-smoke.ts
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

import { getQboForFirmClient } from "../../lib/qbo-for-firm-client.js";
import { findUncategorizedAccounts } from "../../lib/learning/uncategorized-detector";
import { composeProposals } from "../../lib/learning/proposal-composer";
import {
  acceptProposal,
  bulkAcceptProposals,
  rejectProposal,
  runUncategorizedScan,
} from "../../lib/learning/proposal-service";
import { upsertMemory } from "../../lib/memory/client-memory-service";
import { getSupabaseAdmin } from "../../lib/supabase-admin.js";
import type { UncategorizedTxn } from "../../lib/learning/uncategorized-detector";

const ACCRUAL_CLIENT = "71111111-1111-4111-8111-111111111111";

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
function pass(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

async function insertTestProposal(
  firmClientId: string,
  junkAccount: { account_id: string; account_name: string },
  overrides: Record<string, unknown> = {},
) {
  const supabase = getSupabaseAdmin();
  const row = {
    firm_client_id: firmClientId,
    scan_run_id: randomUUID(),
    txn_id: `smoke_${randomUUID().slice(0, 8)}`,
    txn_type: "Purchase",
    txn_date: new Date().toISOString().slice(0, 10),
    txn_amount: 42.5,
    txn_memo: "d4 smoke",
    vendor_id: "56",
    vendor_name: "Test Vendor",
    current_account_id: junkAccount.account_id,
    current_account_name: junkAccount.account_name,
    suggested_account_id: "7",
    suggested_account_name: "Advertising",
    suggested_account_type: "Expense",
    suggested_account_subtype: "AdvertisingPromotional",
    source: "vendor_gl_mapping",
    memory_id: `mem_${firmClientId}_vendor_gl_56_7`,
    confidence: 0.92,
    confidence_bucket: "green",
    sample_count: 5,
    status: "pending",
    ...overrides,
  };
  const { data, error } = await supabase
    .from("uncategorized_proposals")
    .insert(row)
    .select("proposal_id")
    .single();
  if (error) throw new Error(error.message);
  return { ...row, proposal_id: data.proposal_id as string };
}

async function cleanupProposal(proposalId: string) {
  const supabase = getSupabaseAdmin();
  await supabase.from("uncategorized_proposals").delete().eq("proposal_id", proposalId);
}

async function main() {
  console.log("=== D4 uncategorized cleanup smoke test ===\n");
  const supabase = getSupabaseAdmin();

  const { data: fcRow } = await supabase
    .from("firm_clients")
    .select("owner_user_id")
    .eq("id", ACCRUAL_CLIENT)
    .maybeSingle();
  const reviewerUserId = fcRow?.owner_user_id as string | undefined;
  if (!reviewerUserId) {
    console.error("firm_client has no owner_user_id — cannot run action cases");
    process.exit(1);
  }

  const { accessToken, realmId } = await getQboForFirmClient(ACCRUAL_CLIENT);
  const uncategorizedAccounts = await findUncategorizedAccounts(accessToken, realmId);
  const junkAccount = uncategorizedAccounts[0];
  if (!junkAccount) {
    console.error("no uncategorized accounts in sandbox");
    process.exit(1);
  }

  await supabase.from("firm_clients").update({ accounting_method: "accrual" }).eq("id", ACCRUAL_CLIENT);

  // Case 1 — findUncategorizedAccounts returns ≥1 on sandbox
  let case1 = false;
  let case1Detail = "";
  try {
    const { accessToken, realmId } = await getQboForFirmClient(ACCRUAL_CLIENT);
    const accounts = await findUncategorizedAccounts(accessToken, realmId);
    case1 = accounts.length >= 1;
    case1Detail = `count=${accounts.length} first=${accounts[0]?.account_name ?? "n/a"}`;
  } catch (err) {
    case1Detail = err instanceof Error ? err.message : String(err);
  }
  pass("findUncategorizedAccounts returns ≥1 account", case1, case1Detail);

  // Case 2 — scan generates proposals (may be 0 if no junk-drawer txns; pass if scan completes)
  let case2 = false;
  let case2Detail = "";
  let case2Scan: Awaited<ReturnType<typeof runUncategorizedScan>> | null = null;
  try {
    case2Scan = await runUncategorizedScan(ACCRUAL_CLIENT);
    case2 = typeof case2Scan.run_id === "string";
    case2Detail = `generated=${case2Scan.proposals_generated} buckets=${JSON.stringify(case2Scan.by_bucket)}`;
  } catch (err) {
    case2Detail = err instanceof Error ? err.message : String(err);
  }
  pass("runUncategorizedScan completes on accrual client", case2, case2Detail);

  // Case 2b — by_bucket sum matches proposals_generated (identity invariant)
  const bucketsSum = case2Scan
    ? case2Scan.by_bucket.green + case2Scan.by_bucket.yellow + case2Scan.by_bucket.red
    : -1;
  pass(
    "by_bucket sum matches proposals_generated (identity invariant)",
    !!case2Scan && case2Scan.proposals_generated === bucketsSum,
    `generated=${case2Scan?.proposals_generated} buckets_sum=${bucketsSum}`,
  );

  // Case 3 — green bucketing via composer
  await upsertMemory({
    firmClientId: ACCRUAL_CLIENT,
    memoryType: "vendor_gl_mapping",
    memoryId: `mem_${ACCRUAL_CLIENT}_vendor_gl_99_7`,
    entityType: "vendor",
    entityId: "99",
    confidenceScore: 0.95,
    payload: {
      vendor_id: "99",
      vendor_name: "Green Vendor",
      account_id: "7",
      account_name: "Advertising",
      sample_count: 25,
      matching_count: 25,
      confidence: 0.95,
      weak: false,
      first_seen_date: "2024-01-01",
      last_seen_date: "2025-01-01",
      source: "history",
    },
  });
  const greenTxn: UncategorizedTxn = {
    txn_id: "txn_green",
    txn_type: "Purchase",
    txn_date: "2025-06-01",
    txn_amount: 100,
    txn_memo: null,
    vendor_id: "99",
    vendor_name: "Green Vendor",
    current_account_id: junkAccount.account_id,
    current_account_name: junkAccount.account_name,
  };
  const composedGreen = await composeProposals({
    firmClientId: ACCRUAL_CLIENT,
    scanRunId: randomUUID(),
    txns: [greenTxn],
  });
  const greenRow = composedGreen[0];
  pass(
    "green-eligible pattern → confidence_bucket=green",
    greenRow?.confidence_bucket === "green" && greenRow.source === "vendor_gl_mapping",
    `bucket=${greenRow?.confidence_bucket} conf=${greenRow?.confidence}`,
  );

  // Case 4 — no pattern → red / no_pattern
  const redTxn: UncategorizedTxn = {
    txn_id: "txn_red",
    txn_type: "Purchase",
    txn_date: "2025-06-01",
    txn_amount: 50,
    txn_memo: null,
    vendor_id: "no_such_vendor",
    vendor_name: "Unknown",
    current_account_id: junkAccount.account_id,
    current_account_name: junkAccount.account_name,
  };
  const composedRed = await composeProposals({
    firmClientId: ACCRUAL_CLIENT,
    scanRunId: randomUUID(),
    txns: [redTxn],
  });
  const redRow = composedRed[0];
  pass(
    "no pattern → red / no_pattern",
    redRow?.confidence_bucket === "red" && redRow.source === "no_pattern",
    `bucket=${redRow?.confidence_bucket} source=${redRow?.source}`,
  );

  // Case 5 — idempotency: second scan adds 0 new rows
  const before = await supabase
    .from("uncategorized_proposals")
    .select("proposal_id", { count: "exact", head: true })
    .eq("firm_client_id", ACCRUAL_CLIENT);
  const scan2 = await runUncategorizedScan(ACCRUAL_CLIENT);
  pass(
    "re-scan generates zero new proposals",
    scan2.proposals_generated === 0,
    `delta=${scan2.proposals_generated} total_before=${before.count ?? 0}`,
  );

  // Case 6 — accept posts JE + reinforces memory
  const acceptRow = await insertTestProposal(ACCRUAL_CLIENT, junkAccount, {
    txn_id: `accept_${randomUUID().slice(0, 8)}`,
  });
  const acceptResult = await acceptProposal(acceptRow.proposal_id, reviewerUserId);
  const { data: accepted } = await supabase
    .from("uncategorized_proposals")
    .select("status, posted_je_id")
    .eq("proposal_id", acceptRow.proposal_id)
    .single();
  const { data: memAfterAccept } = await supabase
    .from("company_memory_records")
    .select("payload")
    .eq("memory_id", acceptRow.memory_id as string)
    .maybeSingle();
  const payload = (memAfterAccept?.payload as Record<string, unknown>) ?? {};
  pass(
    "accept: JE posted, status accepted, memory reinforced",
    acceptResult.status === "accepted" &&
      accepted?.status === "accepted" &&
      !!accepted?.posted_je_id &&
      Number(payload.matching_count) >= 1,
    `result=${acceptResult.status} status=${accepted?.status} je=${accepted?.posted_je_id ?? "null"} reason=${acceptResult.status === "rejected_by_d2" ? acceptResult.reason : "n/a"}`,
  );

  // Case 7 — reject: no JE, memory sample_count rises
  const rejectRow = await insertTestProposal(ACCRUAL_CLIENT, junkAccount, {
    txn_id: `reject_${randomUUID().slice(0, 8)}`,
  });
  const { data: memBeforeReject } = await supabase
    .from("company_memory_records")
    .select("payload")
    .eq("memory_id", rejectRow.memory_id as string)
    .maybeSingle();
  const sampleBefore = Number((memBeforeReject?.payload as Record<string, unknown>)?.sample_count) || 0;
  await rejectProposal(rejectRow.proposal_id, reviewerUserId, { reject_reason: "smoke test" });
  const { data: rejected } = await supabase
    .from("uncategorized_proposals")
    .select("status, posted_je_id")
    .eq("proposal_id", rejectRow.proposal_id)
    .single();
  const { data: memAfterReject } = await supabase
    .from("company_memory_records")
    .select("payload")
    .eq("memory_id", rejectRow.memory_id as string)
    .maybeSingle();
  const sampleAfter = Number((memAfterReject?.payload as Record<string, unknown>)?.sample_count) || 0;
  pass(
    "reject: no JE, status rejected, sample_count incremented",
    rejected?.status === "rejected" &&
      !rejected?.posted_je_id &&
      sampleAfter > sampleBefore,
    `sample ${sampleBefore}→${sampleAfter}`,
  );

  // Case 8 — modify: posts to final account, two memory writes
  const modifyRow = await insertTestProposal(ACCRUAL_CLIENT, junkAccount, {
    txn_id: `modify_${randomUUID().slice(0, 8)}`,
    suggested_account_id: "7",
    suggested_account_name: "Advertising",
    memory_id: `mem_${ACCRUAL_CLIENT}_vendor_gl_56_7`,
  });
  const modifyResult = await acceptProposal(modifyRow.proposal_id, reviewerUserId, {
    final_account_id: "35",
  });
  const { data: modified } = await supabase
    .from("uncategorized_proposals")
    .select("status, final_account_id")
    .eq("proposal_id", modifyRow.proposal_id)
    .single();
  pass(
    "modify: JE to final account, status modified",
    (modifyResult.status === "accepted" || modifyResult.status === "cash_basis") &&
      modified?.status === "modified" &&
      modified?.final_account_id === "35",
    `status=${modified?.status} final=${modified?.final_account_id}`,
  );

  // Case 9 — bulk accept 3 green (use 3 inserts; bulk requires green bucket)
  await new Promise((r) => setTimeout(r, 2000));
  const bulkIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const row = await insertTestProposal(ACCRUAL_CLIENT, junkAccount, {
      txn_id: `bulk_${i}_${randomUUID().slice(0, 6)}`,
      txn_amount: 10 + i,
      txn_date: new Date(Date.now() - (i + 1) * 86400000).toISOString().slice(0, 10),
    });
    bulkIds.push(row.proposal_id);
  }
  const bulk = await bulkAcceptProposals(reviewerUserId, { proposal_ids: bulkIds });
  const bulkDetail = `batch=${bulk.batch_id} accepted=${bulk.accepted} failed=${bulk.failed} errors=${bulk.results.filter((r) => r.status === "failed").map((r) => r.error).join(";")}`;
  pass(
    "bulk accept 3 green proposals under one batch_id",
    bulk.accepted === 3 && bulk.failed === 0 && bulk.batch_id.startsWith("bulk_"),
    bulkDetail,
  );

  // Case 10 — bulk accept rejects yellow/red
  const yellowRow = await insertTestProposal(ACCRUAL_CLIENT, junkAccount, {
    confidence_bucket: "yellow",
    confidence: 0.7,
    txn_id: `yellow_${randomUUID().slice(0, 6)}`,
  });
  let bulkRejectOk = false;
  let bulkRejectDetail = "";
  try {
    await bulkAcceptProposals(reviewerUserId, { proposal_ids: [yellowRow.proposal_id] });
    bulkRejectDetail = "no error thrown";
  } catch (err) {
    bulkRejectOk = /green_bucket/i.test(err instanceof Error ? err.message : String(err));
    bulkRejectDetail = err instanceof Error ? err.message : String(err);
  }
  pass("bulk accept rejects non-green bucket", bulkRejectOk, bulkRejectDetail);
  await cleanupProposal(yellowRow.proposal_id);

  // Case 11 — decision immutability on accepted proposal
  const { error: immutErr } = await supabase
    .from("uncategorized_proposals")
    .update({ status: "pending" })
    .eq("proposal_id", acceptRow.proposal_id);
  pass(
    "decision immutability blocks status mutation",
    !!immutErr && /immutable/i.test(immutErr.message),
    immutErr?.message ?? "no error",
  );

  // Case 12 — cash-basis accept returns cash_basis flag, no JE
  await supabase.from("firm_clients").update({ accounting_method: "cash" }).eq("id", ACCRUAL_CLIENT);
  const cashRow = await insertTestProposal(ACCRUAL_CLIENT, junkAccount, {
    txn_id: `cash_${randomUUID().slice(0, 6)}`,
  });
  const cashResult = await acceptProposal(cashRow.proposal_id, reviewerUserId);
  const { data: cashProposal } = await supabase
    .from("uncategorized_proposals")
    .select("status, posted_je_id")
    .eq("proposal_id", cashRow.proposal_id)
    .single();
  pass(
    "cash-basis accept: cash_basis flag, no JE posted",
    cashResult.status === "cash_basis" &&
      cashProposal?.status === "accepted" &&
      cashProposal?.posted_je_id == null,
    `result=${cashResult.status}`,
  );

  // Case 13 — modified_cash posts JE normally
  await supabase
    .from("firm_clients")
    .update({ accounting_method: "modified_cash" })
    .eq("id", ACCRUAL_CLIENT);
  await new Promise((r) => setTimeout(r, 2000));
  const mcRow = await insertTestProposal(ACCRUAL_CLIENT, junkAccount, {
    txn_id: `mc_${randomUUID().slice(0, 6)}`,
    txn_date: "2024-08-15",
  });
  const mcResult = await acceptProposal(mcRow.proposal_id, reviewerUserId);
  pass(
    "modified_cash client accept posts JE (D2 parity)",
    mcResult.status === "accepted" && !!mcResult.posted_je_id,
    `status=${mcResult.status} je=${mcResult.status === "accepted" ? mcResult.posted_je_id : "n/a"} reason=${mcResult.status === "rejected_by_d2" ? mcResult.reason : "n/a"}`,
  );

  await supabase.from("firm_clients").update({ accounting_method: "accrual" }).eq("id", ACCRUAL_CLIENT);

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
