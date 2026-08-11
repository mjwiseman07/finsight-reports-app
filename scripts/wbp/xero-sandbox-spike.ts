/**
 * WBP W0.5 — local CLI wrapper around runXeroSandboxSpike().
 * Prefer Preview API route when Sensitive-tier env cannot be pulled to disk.
 *
 *   npm run wbp:xero-spike
 */

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  hashSpikeResult,
  runXeroSandboxSpike,
  WBP_XERO_SPIKE_CONNECTION_ID,
  WBP_XERO_SPIKE_TENANT_ID,
} from "@/lib/wbp/xero-sandbox-spike";

const FINDINGS_DIR = path.join(process.cwd(), "docs/wbp");
const RAW_DIR = path.join(FINDINGS_DIR, "xero-sandbox-raw");

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const encKey =
    process.env.ACCOUNTING_TOKEN_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  if (!supabaseUrl || !serviceRole || !encKey) {
    console.error("[SPIKE] Missing SUPABASE / encryption env vars");
    process.exit(1);
  }

  mkdirSync(RAW_DIR, { recursive: true });
  console.log("[SPIKE] Starting WBP W0.5 Xero Sandbox Spike (CLI)");
  console.log(`[SPIKE] Connection ${WBP_XERO_SPIKE_CONNECTION_ID} / tenant ${WBP_XERO_SPIKE_TENANT_ID}`);

  const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const result = await runXeroSandboxSpike({
    supabaseClient: supabase,
    encryptionKey: encKey,
    tenantIdGuard: WBP_XERO_SPIKE_TENANT_ID,
  });
  const resultHash = hashSpikeResult(result);

  writeFileSync(path.join(RAW_DIR, `${result.runId}-full.json`), JSON.stringify(result, null, 2));
  for (const [idx, call] of result.raw.calls.entries()) {
    writeFileSync(
      path.join(RAW_DIR, `call-${String(idx).padStart(2, "0")}.json`),
      JSON.stringify(call, null, 2),
    );
  }

  const findingsMd = [
    "# WBP W0.5 — Xero Sandbox Spike Findings",
    "",
    `**Run:** ${result.startedAt} → ${result.finishedAt}`,
    `**runId:** ${result.runId}`,
    `**resultHash:** ${resultHash}`,
    `**Connection:** ${result.connectionId}`,
    `**Tenant:** ${result.tenantId} (Xero Demo Company US)`,
    `**Token refreshed:** ${result.tokenRefreshed}`,
    "",
    "## Currency variants",
    "",
    ...result.tests.currency.variants.map(
      (v) =>
        `- \`${v.variant}\`: HTTP ${v.httpStatus} posted=${v.posted}` +
        (v.currencyOnJournal ? ` currency=${v.currencyOnJournal}` : "") +
        (v.errorMessage ? ` — ${v.errorMessage}` : ""),
    ),
    "",
    "## Sign convention",
    "",
    `- posted=${result.tests.signConvention.posted} journalId=${result.tests.signConvention.journalId || "n/a"}`,
    result.tests.signConvention.readback
      ? `- readback line1 amount=${result.tests.signConvention.readback.line1.grossAmount} / line2 amount=${result.tests.signConvention.readback.line2.grossAmount}`
      : "- readback unavailable",
    "",
    "## Forbidden accounts",
    "",
    ...result.tests.forbiddenAccounts.attempts.map(
      (a) =>
        `- ${a.accountName || a.accountType} (${a.accountCode || "n/a"}): HTTP ${a.httpStatus} posted=${a.posted}` +
        (a.errorMessage ? ` — ${a.errorMessage}` : ""),
    ),
    "",
    "## W1 adapter design implications",
    "",
    "> Fill in after reviewing raw evidence.",
    "",
  ].join("\n");

  writeFileSync(path.join(FINDINGS_DIR, "xero-sandbox-findings.md"), findingsMd);
  console.log(JSON.stringify({ ok: true, resultHash, runId: result.runId }, null, 2));
  console.log(`[SPIKE] Findings written to ${path.join(FINDINGS_DIR, "xero-sandbox-findings.md")}`);
  console.log(`[SPIKE] Raw evidence in ${RAW_DIR}`);
}

main().catch((err) => {
  console.error("[SPIKE] Fatal error:", err);
  process.exit(1);
});
