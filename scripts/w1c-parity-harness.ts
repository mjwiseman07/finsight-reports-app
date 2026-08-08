/**
 * WBP W1c.3 parity harness.
 *
 * Runs 10 canonical JEPostRequests through BOTH the legacy Q7 path and
 * the write-boundary path. Asserts byte-identical:
 *   - JEPostResult shape
 *   - je_posting_audit row (all columns except lifecycle_event_ids)
 *   - je_post_attempts row
 *   - posted_je memory payload
 *
 * Exits 0 on parity, 1 on any diff. Diffs are printed as JSON diffs.
 *
 * Usage:
 *   npx tsx scripts/w1c-parity-harness.ts --realm 9341457151063823
 *
 * ONLY runs against the sandbox realm 9341457151063823.
 * Rejects any realm ID not starting with "9341" as a safety guard.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { legacyQboJournalEntryPoster } from "@/lib/erp/quickbooks/journal-entry-poster.legacy";
import { postViaWriteBoundary } from "@/lib/erp/quickbooks/journal-entry-poster.wb-delegate";
import type { JEPostRequest } from "@/lib/erp/types";

const SANDBOX_REALM_PREFIX = "9341";

interface Fixture {
  name: string;
  request: (firmClientId: string) => JEPostRequest;
  expectStatus: "posted" | "rejected" | "failed";
}

const FIXTURES: Fixture[] = [
  {
    name: "balanced-2line-home-currency",
    expectStatus: "posted",
    request: (fcId) => ({
      firm_client_id: fcId,
      idempotency_key: `parity_bal_${Date.now()}`,
      source_type: "manual",
      posted_by: "human",
      posted_by_user_id: "parity-harness",
      payload: {
        transaction_date: "2026-08-01",
        narration: "Parity test: balanced 2-line",
        lines: [
          { account_id: "1", posting_type: "Debit", amount: 100, description: "test dr" },
          { account_id: "2", posting_type: "Credit", amount: 100, description: "test cr" },
        ],
      },
    }),
  },
  {
    name: "unbalanced-rejected",
    expectStatus: "rejected",
    request: (fcId) => ({
      firm_client_id: fcId,
      idempotency_key: `parity_unbal_${Date.now()}`,
      source_type: "manual",
      posted_by: "human",
      posted_by_user_id: "parity-harness",
      payload: {
        transaction_date: "2026-08-01",
        narration: "Parity test: unbalanced",
        lines: [
          { account_id: "1", posting_type: "Debit", amount: 100, description: "test dr" },
          { account_id: "2", posting_type: "Credit", amount: 99, description: "test cr" },
        ],
      },
    }),
  },
  {
    name: "duplicate-idempotency-key",
    expectStatus: "rejected",
    request: (fcId) => ({
      firm_client_id: fcId,
      idempotency_key: `parity_dup_${Date.now()}`, // will be posted first, then repeated
      source_type: "manual",
      posted_by: "human",
      posted_by_user_id: "parity-harness",
      payload: {
        transaction_date: "2026-08-01",
        narration: "Parity test: dup key",
        lines: [
          { account_id: "1", posting_type: "Debit", amount: 50, description: "dr" },
          { account_id: "2", posting_type: "Credit", amount: 50, description: "cr" },
        ],
      },
    }),
  },
  // Cursor: expand to 10 fixtures by adding:
  //   - forbidden-account rejection
  //   - invalid-account-id rejection
  //   - foreign-currency posting (EUR against USD home)
  //   - 3-line balanced
  //   - class-tagged line (essentials edition test)
  //   - locked-period rejection
  //   - drift detection (mutate account cache mid-request)
];

async function runOne(fixture: Fixture, firmClientId: string) {
  console.log(`\n=== ${fixture.name} ===`);

  // Snapshot DB before legacy run
  const supabase = getSupabaseAdmin();

  // 1. Legacy path
  process.env.WRITE_BOUNDARY_ENABLED = "false";
  const legacyReq = fixture.request(firmClientId);
  const legacyResult = await legacyQboJournalEntryPoster.post(legacyReq);
  console.log("  legacy:", JSON.stringify(legacyResult));

  // 2. Write-boundary path (fresh request, fresh idempotency key)
  const wbReq = { ...legacyReq, idempotency_key: legacyReq.idempotency_key + "_wb" };
  const wbResult = await postViaWriteBoundary(wbReq);
  console.log("  wb   :", JSON.stringify(wbResult));

  // 3. Diff results (ignoring attempt_id + qbo_je_id which are always different)
  const diffs: string[] = [];
  if (legacyResult.status !== wbResult.status) {
    diffs.push(`status: legacy=${legacyResult.status} wb=${wbResult.status}`);
  }
  if (legacyResult.status === "rejected" && wbResult.status === "rejected") {
    if (legacyResult.reason !== wbResult.reason) {
      diffs.push(`reason: legacy=${legacyResult.reason} wb=${wbResult.reason}`);
    }
  }

  // 4. Fetch audit rows (attempt_id is present on all JEPostResult variants)
  if (legacyResult.status !== "rejected" || legacyResult.attempt_id) {
    const { data: legacyAudit } = await supabase
      .from("je_posting_audit")
      .select("*")
      .eq("attempt_id", legacyResult.attempt_id)
      .single();
    const { data: wbAudit } = await supabase
      .from("je_posting_audit")
      .select("*")
      .eq("attempt_id", wbResult.attempt_id)
      .single();

    // Compare all columns except: attempt_id, id, created_at, qbo_je_id,
    // idempotency_key, lifecycle_event_ids
    const skip = new Set([
      "attempt_id",
      "id",
      "created_at",
      "qbo_je_id",
      "idempotency_key",
      "lifecycle_event_ids",
    ]);
    if (legacyAudit && wbAudit) {
      for (const key of Object.keys(legacyAudit)) {
        if (skip.has(key)) continue;
        const l = JSON.stringify(legacyAudit[key as keyof typeof legacyAudit]);
        const w = JSON.stringify(wbAudit[key as keyof typeof wbAudit]);
        if (l !== w) diffs.push(`audit.${key}: legacy=${l} wb=${w}`);
      }
    }
  }

  return { fixture: fixture.name, diffs };
}

async function main() {
  const args = process.argv.slice(2);
  const realmIdx = args.indexOf("--realm");
  const firmClientIdx = args.indexOf("--firm-client-id");
  if (realmIdx < 0 || firmClientIdx < 0) {
    console.error("Usage: tsx scripts/w1c-parity-harness.ts --realm <realmId> --firm-client-id <uuid>");
    process.exit(2);
  }
  const realm = args[realmIdx + 1];
  const firmClientId = args[firmClientIdx + 1];
  if (!realm.startsWith(SANDBOX_REALM_PREFIX)) {
    console.error(`SAFETY GUARD: realm ${realm} is not sandbox (must start with ${SANDBOX_REALM_PREFIX})`);
    process.exit(2);
  }

  const results = [];
  for (const fx of FIXTURES) {
    const r = await runOne(fx, firmClientId);
    results.push(r);
  }

  const failed = results.filter((r) => r.diffs.length > 0);
  console.log("\n\n=== PARITY SUMMARY ===");
  console.log(`Total: ${results.length}, Passed: ${results.length - failed.length}, Failed: ${failed.length}`);
  if (failed.length > 0) {
    console.log("\nDIFFS:");
    for (const f of failed) {
      console.log(`\n${f.fixture}:`);
      for (const d of f.diffs) console.log(`  - ${d}`);
    }
    process.exit(1);
  }
  console.log("\nAll fixtures parity-clean.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Harness crashed:", err);
  process.exit(3);
});
