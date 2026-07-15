/* eslint-disable no-console */
// D4 live sandbox proof — full end-to-end against real QBO sandbox + Supabase.
// Seeds 3 Purchases into Uncategorized Expense, runs the production scan, accepts
// 2 / rejects 1 through the production service, then verifies proposal state, QBO
// JE creation, and D3 memory reinforcement. No mocks, no fixtures bypassing prod.
//
// Realm: 9341457151063823 · Firm client: 71111111-1111-4111-8111-111111111111
// Run: npx tsx scripts/smoke/d4-live-sandbox-proof.ts
import { readFileSync } from "node:fs";

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
import { qboQuery, extractQueryEntities } from "../../lib/qbo-rest";
import { getQuotaGuardUndiciDispatcher } from "../../lib/network/quotaguard-proxy";
import { findUncategorizedAccounts } from "../../lib/learning/uncategorized-detector";
import {
  runUncategorizedScan,
  listProposals,
  acceptProposal,
  rejectProposal,
} from "../../lib/learning/proposal-service";
import { upsertMemory } from "../../lib/memory/client-memory-service";
import { wilsonScoreLower } from "../../lib/learning/confidence";
import { getSupabaseAdmin } from "../../lib/supabase-admin.js";

const FIRM_CLIENT_ID = "71111111-1111-4111-8111-111111111111";
const REVIEWER_USER_ID = "a4ebf834-a698-4f79-a945-8498f2e6c45d";
const VENDOR_NAME = "D4 Proof Vendor";
// Seed counts. NOTE (spec deviation): the paste block specified 20/20 → green,
// but wilsonScoreLower(20,20)=0.8389 is below the §4 green gate (wilson ≥ 0.85).
// wilson(n,n)=n/(n+z²) only clears 0.85 at n≥22, so 20/20 buckets YELLOW. We seed
// 40/40 (wilson≈0.912) to genuinely produce green; all after-decision expectations
// are derived from these constants, not hardcoded.
const SEED_SAMPLE = 40;
const SEED_MATCHING = 40;
const AMOUNTS = [42.17, 87.5, 156.99];
const ACCEPT_AMOUNTS = [42.17, 87.5];
const REJECT_AMOUNT = 156.99;
const REJECT_REASON = "D4 live proof — this vendor should stay uncategorized in this case";

function qboApiBase(): string {
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
function pass(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableQbo(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b429\b/.test(msg) || /too many requests/i.test(msg) || /application error/i.test(msg);
}

// Retry-wrapped query for the script's direct setup/verify reads (production
// code paths already have their own retry).
async function query(
  accessToken: string,
  realmId: string,
  sql: string,
  entityName: string,
): Promise<Record<string, unknown>[]> {
  const maxAttempts = 4;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return extractQueryEntities(await qboQuery(accessToken, realmId, sql), entityName);
    } catch (err) {
      lastErr = err;
      if (!isRetryableQbo(err) || attempt === maxAttempts) throw err;
      await sleep(1500 * attempt);
    }
  }
  throw lastErr;
}

async function qboPost(
  accessToken: string,
  realmId: string,
  entity: string,
  body: unknown,
): Promise<Record<string, unknown>> {
  const dispatcher = getQuotaGuardUndiciDispatcher();
  const resp = await fetch(`${qboApiBase()}/v3/company/${realmId}/${entity}?minorversion=73`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    ...(dispatcher ? { dispatcher } : {}),
  } as RequestInit);
  const text = await resp.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!resp.ok) {
    throw new Error(
      `QBO POST ${entity} failed (${resp.status}): ${
        (json as { Fault?: { Error?: Array<{ Message?: string }> } })?.Fault?.Error?.[0]?.Message ??
        text
      }`,
    );
  }
  return json;
}

async function main() {
  console.log("=== D4 live sandbox proof (setup) ===\n");
  const scriptStart = new Date().toISOString();
  const supabase = getSupabaseAdmin();

  // Ensure accrual so JEs post (parity with D2/D3 test harness).
  await supabase
    .from("firm_clients")
    .update({ accounting_method: "accrual" })
    .eq("id", FIRM_CLIENT_ID);

  const { accessToken, realmId } = await getQboForFirmClient(FIRM_CLIENT_ID);

  // --- Phase 1: setup ---
  // 1. Uncategorized Expense account via production discovery.
  const uncategorizedAccounts = await findUncategorizedAccounts(accessToken, realmId);
  const uncategorized = uncategorizedAccounts.find((a) =>
    a.account_name.toLowerCase().includes("uncategorized expense"),
  );
  if (!uncategorized) {
    console.error("FATAL: no 'Uncategorized Expense' account found in sandbox");
    process.exit(1);
  }

  // 2. Test vendor (find-or-create).
  let vendorId = "";
  const existingVendor = await query(
    accessToken,
    realmId,
    `SELECT Id, DisplayName FROM Vendor WHERE DisplayName = '${VENDOR_NAME}' MAXRESULTS 1`,
    "Vendor",
  );
  if (existingVendor[0]?.Id) {
    vendorId = String(existingVendor[0].Id);
  } else {
    const created = await qboPost(accessToken, realmId, "vendor", { DisplayName: VENDOR_NAME });
    vendorId = String((created?.Vendor as { Id?: string })?.Id ?? "");
  }
  if (!vendorId) {
    console.error("FATAL: could not resolve/create vendor");
    process.exit(1);
  }

  // 3. Target reclass account (Meals & Entertainment, else first Expense).
  let target = (
    await query(
      accessToken,
      realmId,
      "SELECT Id, Name FROM Account WHERE Name = 'Meals and Entertainment' MAXRESULTS 1",
      "Account",
    )
  )[0];
  if (!target?.Id) {
    target = (
      await query(
        accessToken,
        realmId,
        "SELECT Id, Name FROM Account WHERE AccountType = 'Expense' AND Classification = 'Expense' MAXRESULTS 1",
        "Account",
      )
    )[0];
  }
  const targetAccountId = String(target?.Id ?? "");
  const targetAccountName = String(target?.Name ?? "");
  if (!targetAccountId) {
    console.error("FATAL: no target expense account found");
    process.exit(1);
  }

  // Bank account for the Purchase credit side.
  const bank = (
    await query(accessToken, realmId, "SELECT Id, Name FROM Account WHERE AccountType = 'Bank' MAXRESULTS 1", "Account")
  )[0];
  const bankAccountId = String(bank?.Id ?? "");
  if (!bankAccountId) {
    console.error("FATAL: no Bank account found");
    process.exit(1);
  }

  // 4. Seed D3 green pattern.
  const memoryId = `mem_${FIRM_CLIENT_ID}_vendor_gl_${vendorId}_${targetAccountId}`;
  const seedConfidence = wilsonScoreLower(SEED_MATCHING, SEED_SAMPLE);
  await upsertMemory({
    firmClientId: FIRM_CLIENT_ID,
    memoryType: "vendor_gl_mapping",
    memoryId,
    entityType: "vendor",
    entityId: vendorId,
    confidenceScore: seedConfidence,
    payload: {
      vendor_id: vendorId,
      vendor_name: VENDOR_NAME,
      account_id: targetAccountId,
      account_name: targetAccountName,
      sample_count: SEED_SAMPLE,
      matching_count: SEED_MATCHING,
      confidence: Number(seedConfidence.toFixed(3)),
      weak: false,
      first_seen_date: "2025-01-01",
      last_seen_date: today(),
      source: "d4_live_proof_seed",
    },
  });

  console.log(`  vendor=${VENDOR_NAME} (${vendorId})`);
  console.log(`  target=${targetAccountName} (${targetAccountId})`);
  console.log(`  uncategorized=${uncategorized.account_name} (${uncategorized.account_id})`);
  console.log(`  bank=${bank?.Name} (${bankAccountId})`);
  console.log(
    `  seed memory=${memoryId} wilson(${SEED_MATCHING},${SEED_SAMPLE})=${seedConfidence.toFixed(4)}\n`,
  );

  // --- Phase 2: seed 3 Purchases into Uncategorized Expense ---
  const seededPurchaseIds: string[] = [];
  for (const amount of AMOUNTS) {
    const body = {
      PaymentType: "Cash",
      AccountRef: { value: bankAccountId },
      EntityRef: { value: vendorId, type: "Vendor" },
      TxnDate: today(),
      PrivateNote: `D4 live proof — ${amount}`,
      Line: [
        {
          Amount: amount,
          DetailType: "AccountBasedExpenseLineDetail",
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: uncategorized.account_id },
          },
        },
      ],
    };
    const created = await qboPost(accessToken, realmId, "purchase", body);
    const pid = String((created?.Purchase as { Id?: string })?.Id ?? "");
    seededPurchaseIds.push(pid);
    console.log(`  seeded Purchase ${pid} — $${amount}`);
  }
  pass("seeded 3 Purchases into Uncategorized Expense", seededPurchaseIds.filter(Boolean).length === 3);

  // --- Phase 3: run scan (production entry point) ---
  const scan = await runUncategorizedScan(FIRM_CLIENT_ID);
  console.log(
    `\n  scan run_id=${scan.run_id} generated=${scan.proposals_generated} by_bucket=${JSON.stringify(scan.by_bucket)}`,
  );
  pass("scan produced >=3 green proposals", scan.by_bucket.green >= 3, `green=${scan.by_bucket.green}`);

  // 9. Fetch pending green proposals, filter to our vendor + amounts + created since start.
  const green = await listProposals(FIRM_CLIENT_ID, { status: "pending", bucket: "green", limit: 200 });
  const ours = green.filter(
    (p) =>
      p.vendor_id === vendorId &&
      AMOUNTS.some((a) => Math.abs(p.txn_amount - a) < 0.005) &&
      p.created_at >= scriptStart,
  );
  const byAmount = new Map<number, (typeof ours)[number]>();
  for (const p of ours) {
    const amt = AMOUNTS.find((a) => Math.abs(p.txn_amount - a) < 0.005);
    if (amt != null && !byAmount.has(amt)) byAmount.set(amt, p);
  }
  pass("found exactly 3 matching green proposals", byAmount.size === 3, `matched=${byAmount.size}`);
  if (byAmount.size !== 3) {
    summarizeAndExit({ realmId, vendorId, targetAccountId, targetAccountName, uncategorized, seededPurchaseIds, scan, memBefore: null, memAfter: null, jeIds: [], decisions: [] });
    return;
  }

  // --- Phase 4: decide (accept 2, reject 1) ---
  // 10. Snapshot memory before.
  const memBefore = await fetchMemory(memoryId);
  pass(
    `memory before: sample=${SEED_SAMPLE}, matching=${SEED_MATCHING}`,
    Number(memBefore?.sample_count) === SEED_SAMPLE &&
      Number(memBefore?.matching_count) === SEED_MATCHING,
    `sample=${memBefore?.sample_count} matching=${memBefore?.matching_count}`,
  );

  const decisions: Array<{ amount: number; status: string; jeAttemptId: string | null }> = [];
  const jeIds: string[] = [];

  for (const amount of ACCEPT_AMOUNTS) {
    const proposal = byAmount.get(amount)!;
    const res = await acceptProposal(proposal.proposal_id, REVIEWER_USER_ID, {});
    const attemptId = res.status === "accepted" ? res.posted_je_id : null;
    decisions.push({ amount, status: res.status, jeAttemptId: attemptId });
    console.log(`  accept $${amount} → ${res.status} attempt=${attemptId ?? "n/a"}`);
    pass(`accept $${amount} returned accepted with posted_je_id`, res.status === "accepted" && !!attemptId);
  }

  const rejectProposalRow = byAmount.get(REJECT_AMOUNT)!;
  await rejectProposal(rejectProposalRow.proposal_id, REVIEWER_USER_ID, { reject_reason: REJECT_REASON });
  console.log(`  reject $${REJECT_AMOUNT}`);

  // --- Phase 5: verify Supabase state ---
  for (const amount of ACCEPT_AMOUNTS) {
    const p = await fetchProposal(byAmount.get(amount)!.proposal_id);
    pass(
      `proposal $${amount} accepted + posted_je_id + reviewer + decided_at`,
      p?.status === "accepted" &&
        !!p?.posted_je_id &&
        p?.reviewer_user_id === REVIEWER_USER_ID &&
        !!p?.decided_at,
      `status=${p?.status} je=${p?.posted_je_id}`,
    );
  }
  const rejected = await fetchProposal(rejectProposalRow.proposal_id);
  pass(
    `proposal $${REJECT_AMOUNT} rejected + null je + reason + decided_at`,
    rejected?.status === "rejected" &&
      rejected?.posted_je_id == null &&
      rejected?.reject_reason === REJECT_REASON &&
      !!rejected?.decided_at,
    `status=${rejected?.status} reason=${rejected?.reject_reason}`,
  );

  // --- Phase 6: verify QBO JE creation ---
  for (const d of decisions) {
    if (!d.jeAttemptId) continue;
    // posted_je_id holds the D2 attempt_id; je_post_attempts.qbo_je_id holds the JE Id.
    const { data: attempt } = await supabase
      .from("je_post_attempts")
      .select("qbo_je_id, status")
      .eq("attempt_id", d.jeAttemptId)
      .maybeSingle();
    const jeId = attempt?.qbo_je_id as string | undefined;
    console.log(`  $${d.amount} attempt=${d.jeAttemptId} qbo_je_id=${jeId ?? "null"} d2status=${attempt?.status}`);
    if (!jeId) {
      pass(`QBO JE resolved for $${d.amount}`, false, "no qbo_je_id in je_post_attempts");
      continue;
    }
    jeIds.push(jeId);

    const je = (
      await query(
        accessToken,
        realmId,
        `SELECT * FROM JournalEntry WHERE Id = '${jeId}' MAXRESULTS 1`,
        "JournalEntry",
      )
    )[0] as
      | {
          Id?: string;
          TotalAmt?: number;
          Line?: Array<{
            Amount?: number;
            JournalEntryLineDetail?: {
              PostingType?: string;
              AccountRef?: { value?: string };
            };
          }>;
        }
      | undefined;

    const lines = (je?.Line ?? []).filter((l) => l.JournalEntryLineDetail);
    const debit = lines.find((l) => l.JournalEntryLineDetail?.PostingType === "Debit");
    const credit = lines.find((l) => l.JournalEntryLineDetail?.PostingType === "Credit");
    const debitOk = debit?.JournalEntryLineDetail?.AccountRef?.value === targetAccountId;
    const creditOk = credit?.JournalEntryLineDetail?.AccountRef?.value === uncategorized.account_id;
    const amountOk = Math.abs(Number(debit?.Amount ?? 0) - d.amount) < 0.005;

    pass(
      `QBO JE ${jeId} for $${d.amount}: 2 lines, DR target / CR uncategorized, amount matches`,
      !!je?.Id && lines.length === 2 && debitOk && creditOk && amountOk,
      `lines=${lines.length} DR=${debit?.JournalEntryLineDetail?.AccountRef?.value} CR=${credit?.JournalEntryLineDetail?.AccountRef?.value} amt=${debit?.Amount}`,
    );
  }

  // --- Phase 7: verify memory reinforcement ---
  // 2 accepts bank sample+matching; 1 reject banks sample only.
  const expectedSample = SEED_SAMPLE + 3;
  const expectedMatching = SEED_MATCHING + 2;
  const memAfter = await fetchMemory(memoryId);
  const expectedConfidence = wilsonScoreLower(expectedMatching, expectedSample);
  pass(
    `memory after: sample=${expectedSample}`,
    Number(memAfter?.sample_count) === expectedSample,
    `sample=${memAfter?.sample_count}`,
  );
  pass(
    `memory after: matching=${expectedMatching}`,
    Number(memAfter?.matching_count) === expectedMatching,
    `matching=${memAfter?.matching_count}`,
  );
  pass(
    `memory after: confidence = wilson(${expectedMatching},${expectedSample})`,
    Math.abs(Number(memAfter?.confidence) - Number(expectedConfidence.toFixed(3))) < 0.002,
    `confidence=${memAfter?.confidence} expected=${expectedConfidence.toFixed(3)}`,
  );
  pass("memory after: weak=false", memAfter?.weak === false, `weak=${memAfter?.weak}`);

  summarizeAndExit({
    realmId,
    vendorId,
    targetAccountId,
    targetAccountName,
    uncategorized,
    seededPurchaseIds,
    scan,
    memBefore,
    memAfter,
    jeIds,
    decisions,
  });
}

async function fetchMemory(memoryId: string): Promise<Record<string, unknown> | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("company_memory_records")
    .select("payload")
    .eq("memory_id", memoryId)
    .maybeSingle();
  return (data?.payload as Record<string, unknown>) ?? null;
}

async function fetchProposal(proposalId: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("uncategorized_proposals")
    .select("status, posted_je_id, reviewer_user_id, decided_at, reject_reason")
    .eq("proposal_id", proposalId)
    .maybeSingle();
  return data;
}

type SummaryArgs = {
  realmId: string;
  vendorId: string;
  targetAccountId: string;
  targetAccountName: string;
  uncategorized: { account_id: string; account_name: string };
  seededPurchaseIds: string[];
  scan: { run_id: string; proposals_generated: number; by_bucket: { green: number } };
  memBefore: Record<string, unknown> | null;
  memAfter: Record<string, unknown> | null;
  jeIds: string[];
  decisions: Array<{ amount: number; status: string; jeAttemptId: string | null }>;
};

function summarizeAndExit(a: SummaryArgs) {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  console.log("\n=== D4 LIVE SANDBOX PROOF ===");
  console.log(`Realm: ${a.realmId}`);
  console.log(`Firm client: ${FIRM_CLIENT_ID}`);
  console.log(`Vendor: ${VENDOR_NAME} (${a.vendorId})`);
  console.log(`Target account: ${a.targetAccountName} (${a.targetAccountId})`);
  console.log(`Uncategorized bucket: ${a.uncategorized.account_name} (${a.uncategorized.account_id})`);
  console.log(`Seeded Purchases: ${a.seededPurchaseIds.join(", ")}`);
  console.log(
    `Scan run: ${a.scan.run_id}, proposals=${a.scan.proposals_generated}, green=${a.scan.by_bucket.green}`,
  );
  console.log("Decisions:");
  for (const d of a.decisions) {
    const je = a.jeIds[a.decisions.filter((x) => x.status === "accepted").indexOf(d)];
    if (d.status === "accepted") {
      console.log(`  $${d.amount.toFixed(2)}  → accepted, JE ${je ?? "?"}`);
    }
  }
  console.log(`  $${REJECT_AMOUNT.toFixed(2)} → rejected, reason: "${REJECT_REASON}"`);
  if (a.memBefore && a.memAfter) {
    const wBefore = wilsonScoreLower(
      Number(a.memBefore.matching_count),
      Number(a.memBefore.sample_count),
    );
    const wAfter = wilsonScoreLower(
      Number(a.memAfter.matching_count),
      Number(a.memAfter.sample_count),
    );
    console.log("Memory reinforcement:");
    console.log(
      `  Before: sample=${a.memBefore.sample_count}, matching=${a.memBefore.matching_count}, wilson=${wBefore.toFixed(3)}`,
    );
    console.log(
      `  After:  sample=${a.memAfter.sample_count}, matching=${a.memAfter.matching_count}, wilson=${wAfter.toFixed(3)}`,
    );
  }
  console.log(`RESULT: ${failed === 0 ? "PASS" : "FAIL"} (${passed}/${results.length} assertions)`);

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
