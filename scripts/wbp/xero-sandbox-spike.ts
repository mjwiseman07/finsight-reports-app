/**
 * WBP W0.5 — Xero Sandbox Spike
 *
 * Runs 3 tests against Xero Demo Company (US) to resolve unknowns from
 * WBP_Provider_Research.md before W1 Xero adapter design:
 *
 *   Test 1: Currency handling — where does CurrencyCode go on ManualJournal?
 *   Test 2: Sign convention — does Xero preserve DEBIT/CREDIT signs as posted?
 *   Test 3: Forbidden accounts — do AR/AP/RetainedEarnings/Bank reject at API?
 *
 * Writes findings to docs/wbp/xero-sandbox-findings.md.
 * Also captures raw request/response bodies to docs/wbp/xero-sandbox-raw/.
 *
 * SAFETY: ManualJournals are posted as DRAFT (Status='DRAFT'), never POSTED.
 * The spike never touches production tenants — only tenant ceaea696-...
 * (Xero Demo Company US, active connection 671afdab-...).
 *
 * Token note: accounting_connections tokens are enc:v1: encrypted at rest.
 * This script decrypts for API calls and re-encrypts on refresh writes.
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { xeroAccountingProvider } from "@/lib/integrations/xero/provider";
import {
  decryptAccountingToken,
  encryptAccountingToken,
} from "@/lib/integrations/accounting/token-encryption";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const CONNECTION_ID = "671afdab-8f46-4862-a1f2-6ba09b0aec35";
const EXPECTED_TENANT = "ceaea696-081f-491e-9daa-a9263a023ca9";
const FINDINGS_DIR = path.join(process.cwd(), "docs/wbp");
const RAW_DIR = path.join(FINDINGS_DIR, "xero-sandbox-raw");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[SPIKE] Missing SUPABASE env vars");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type XeroConnection = {
  id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  tenant_or_realm_id: string;
  status: string;
};

type XeroAccount = {
  Code?: string;
  Type?: string;
  Name?: string;
  SystemAccount?: string;
  EnablePaymentsToAccount?: boolean;
  Status?: string;
};

interface TestResult {
  test_id: string;
  question: string;
  request_summary: string;
  http_status: number;
  api_error: string | null;
  finding: string;
  evidence_file: string;
  passed: boolean;
}

const results: TestResult[] = [];

async function loadConnection(): Promise<XeroConnection> {
  const { data, error } = await supabaseAdmin
    .from("accounting_connections")
    .select("id, access_token, refresh_token, token_expires_at, tenant_or_realm_id, status")
    .eq("id", CONNECTION_ID)
    .single();
  if (error || !data) throw new Error(`Connection ${CONNECTION_ID} not found`);
  if (data.tenant_or_realm_id !== EXPECTED_TENANT) {
    throw new Error(
      `Refusing to run: tenant is ${data.tenant_or_realm_id}, expected Xero Demo Company (${EXPECTED_TENANT})`,
    );
  }
  if (data.status !== "connected") throw new Error(`Connection is ${data.status}, not connected`);

  const access = decryptAccountingToken(data.access_token);
  const refresh = decryptAccountingToken(data.refresh_token);
  if (!access || !refresh) {
    throw new Error("Connection tokens missing after decrypt — check ACCOUNTING_TOKEN_ENCRYPTION_KEY");
  }

  return {
    id: String(data.id),
    access_token: access,
    refresh_token: refresh,
    token_expires_at: String(data.token_expires_at),
    tenant_or_realm_id: String(data.tenant_or_realm_id),
    status: String(data.status),
  };
}

async function refreshTokenIfNeeded(connection: XeroConnection): Promise<XeroConnection> {
  const expiresAt = new Date(connection.token_expires_at).getTime();
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000;
  if (expiresAt - now > bufferMs) {
    console.log(`[SPIKE] Token valid for ${Math.round((expiresAt - now) / 1000)}s — no refresh needed`);
    return connection;
  }
  console.log("[SPIKE] Token expires soon, refreshing...");
  const payload = (await xeroAccountingProvider.refreshAccessToken({
    refreshToken: connection.refresh_token,
  })) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!payload.access_token || !payload.refresh_token) {
    throw new Error("Xero token refresh did not return access_token/refresh_token");
  }
  const newTokenExpiresAt = new Date(Date.now() + (payload.expires_in ?? 1800) * 1000).toISOString();
  const { error } = await supabaseAdmin
    .from("accounting_connections")
    .update({
      access_token: encryptAccountingToken(payload.access_token),
      refresh_token: encryptAccountingToken(payload.refresh_token),
      token_expires_at: newTokenExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", CONNECTION_ID);
  if (error) throw error;
  return {
    ...connection,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    token_expires_at: newTokenExpiresAt,
  };
}

async function xeroPost(connection: XeroConnection, endpoint: string, body: unknown, testId: string) {
  const url = `https://api.xero.com/api.xro/2.0/${endpoint}`;
  const bodyStr = JSON.stringify(body);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connection.access_token}`,
      "xero-tenant-id": connection.tenant_or_realm_id,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: bodyStr,
  });
  const rawText = await response.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    /* keep as text */
  }

  const evidenceFile = path.join(RAW_DIR, `${testId}.json`);
  writeFileSync(
    evidenceFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        request: { url, method: "POST", body },
        response: {
          status: response.status,
          status_text: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: parsed ?? rawText,
        },
      },
      null,
      2,
    ),
  );

  return { status: response.status, body: parsed ?? rawText, evidenceFile };
}

async function xeroGet(connection: XeroConnection, endpoint: string) {
  const url = `https://api.xero.com/api.xro/2.0/${endpoint}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${connection.access_token}`,
      "xero-tenant-id": connection.tenant_or_realm_id,
      Accept: "application/json",
    },
  });
  const rawText = await response.text();
  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}

function isPostableOffset(a: XeroAccount): boolean {
  return (
    !["BANK", "ACCPAY", "ACCREC", "RETAINEDEARNINGS", "CURRENT", "CURRLIAB"].includes(String(a.Type || "")) &&
    a.SystemAccount !== "RETAINEDEARNINGS" &&
    a.EnablePaymentsToAccount !== true
  );
}

async function test1_currency(connection: XeroConnection): Promise<void> {
  console.log("\n[SPIKE] Test 1: Currency handling on ManualJournal");

  const orgPayload = (await xeroGet(connection, "Organisation")) as {
    Organisations?: Array<{ BaseCurrency?: string }>;
  };
  const baseCurrency = orgPayload?.Organisations?.[0]?.BaseCurrency ?? "unknown";
  writeFileSync(path.join(RAW_DIR, "t1-org.json"), JSON.stringify(orgPayload, null, 2));
  console.log(`[SPIKE] Base currency: ${baseCurrency}`);

  const accountsPayload = (await xeroGet(connection, 'Accounts?where=Status=="ACTIVE"')) as {
    Accounts?: XeroAccount[];
  };
  const postable = (accountsPayload?.Accounts ?? [])
    .filter(
      (a) =>
        !["BANK", "PAYG", "PAYGLIABILITY", "PAYE", "ACCPAY", "ACCREC", "RETAINEDEARNINGS", "CURRENT", "TAX", "SALES", "REVENUE"].includes(
          String(a.Type || ""),
        ) &&
        a.EnablePaymentsToAccount !== true &&
        a.Type !== "BANK",
    )
    .slice(0, 2);
  writeFileSync(path.join(RAW_DIR, "t1-accounts.json"), JSON.stringify(accountsPayload, null, 2));
  if (postable.length < 2) {
    console.error("[SPIKE] Not enough postable accounts for test — need 2, found:", postable.length);
    return;
  }
  const acctA = postable[0].Code;
  const acctB = postable[1].Code;
  console.log(`[SPIKE] Using accounts ${acctA} + ${acctB}`);

  const bodyNoCurrency = {
    Narration: "WBP W0.5 T1a — no currency code",
    Status: "DRAFT",
    Date: new Date().toISOString().slice(0, 10),
    JournalLines: [
      { LineAmount: 10.0, AccountCode: acctA, Description: "T1a debit" },
      { LineAmount: -10.0, AccountCode: acctB, Description: "T1a credit" },
    ],
  };
  const r1a = await xeroPost(connection, "ManualJournals", bodyNoCurrency, "t1a-no-currency");
  console.log(`[SPIKE]   1a (no currency): HTTP ${r1a.status}`);

  const bodyHeaderCurrency = {
    Narration: "WBP W0.5 T1b — header CurrencyCode",
    Status: "DRAFT",
    Date: new Date().toISOString().slice(0, 10),
    CurrencyCode: baseCurrency,
    JournalLines: [
      { LineAmount: 10.0, AccountCode: acctA, Description: "T1b debit" },
      { LineAmount: -10.0, AccountCode: acctB, Description: "T1b credit" },
    ],
  };
  const r1b = await xeroPost(connection, "ManualJournals", bodyHeaderCurrency, "t1b-header-currency");
  console.log(`[SPIKE]   1b (header currency): HTTP ${r1b.status}`);

  const bodyLineCurrency = {
    Narration: "WBP W0.5 T1c — line CurrencyCode (expected reject)",
    Status: "DRAFT",
    Date: new Date().toISOString().slice(0, 10),
    JournalLines: [
      { LineAmount: 10.0, AccountCode: acctA, Description: "T1c debit", CurrencyCode: baseCurrency },
      { LineAmount: -10.0, AccountCode: acctB, Description: "T1c credit", CurrencyCode: baseCurrency },
    ],
  };
  const r1c = await xeroPost(connection, "ManualJournals", bodyLineCurrency, "t1c-line-currency");
  console.log(`[SPIKE]   1c (line currency): HTTP ${r1c.status}`);

  results.push({
    test_id: "T1",
    question: "Where does CurrencyCode belong on ManualJournal — header, line, or neither?",
    request_summary: `POST /ManualJournals × 3 (no code / header code / line code) — base=${baseCurrency}, accounts=${acctA},${acctB}`,
    http_status: r1a.status,
    api_error: null,
    finding: [
      `Base currency: ${baseCurrency}`,
      `1a no-currency → HTTP ${r1a.status}`,
      `1b header-currency → HTTP ${r1b.status}`,
      `1c line-currency → HTTP ${r1c.status}`,
      `Determination: see raw responses for stored CurrencyCode + any rejection messages.`,
    ].join(" · "),
    evidence_file: "t1a-no-currency.json, t1b-header-currency.json, t1c-line-currency.json",
    passed: r1a.status < 500 && r1b.status < 500 && r1c.status < 500,
  });
}

async function test2_sign(connection: XeroConnection): Promise<void> {
  console.log("\n[SPIKE] Test 2: Sign convention verification");

  const accountsPayload = (await xeroGet(connection, 'Accounts?where=Status=="ACTIVE"')) as {
    Accounts?: XeroAccount[];
  };
  const postable = (accountsPayload?.Accounts ?? [])
    .filter((a) => !["BANK", "ACCPAY", "ACCREC", "RETAINEDEARNINGS"].includes(String(a.Type || "")))
    .slice(0, 2);
  if (postable.length < 2) {
    console.error("[SPIKE] Test 2 needs 2 accounts");
    return;
  }
  const acctA = postable[0].Code;
  const acctB = postable[1].Code;

  const body = {
    Narration: "WBP W0.5 T2 — sign convention (+100 debit / -100 credit)",
    Status: "DRAFT",
    Date: new Date().toISOString().slice(0, 10),
    JournalLines: [
      { LineAmount: 100.0, AccountCode: acctA, Description: "T2 +100" },
      { LineAmount: -100.0, AccountCode: acctB, Description: "T2 -100" },
    ],
  };
  const r2 = await xeroPost(connection, "ManualJournals", body, "t2-signs");
  console.log(`[SPIKE]   T2: HTTP ${r2.status}`);

  type StoredManualJournal = {
    ManualJournals?: Array<{
      JournalLines?: Array<{ LineAmount?: number; AccountCode?: string }>;
    }>;
  };
  let storedJournal: StoredManualJournal | null = null;
  const respBody = r2.body as { ManualJournals?: Array<{ ManualJournalID?: string }> };
  const manualJournalId = respBody?.ManualJournals?.[0]?.ManualJournalID;
  if (manualJournalId) {
    storedJournal = (await xeroGet(connection, `ManualJournals/${manualJournalId}`)) as StoredManualJournal;
    writeFileSync(path.join(RAW_DIR, "t2-signs-readback.json"), JSON.stringify(storedJournal, null, 2));
  }

  const debitLine = storedJournal?.ManualJournals?.[0]?.JournalLines?.find(
    (l: { LineAmount?: number; AccountCode?: string }) => (l.LineAmount ?? 0) > 0,
  );
  const creditLine = storedJournal?.ManualJournals?.[0]?.JournalLines?.find(
    (l: { LineAmount?: number; AccountCode?: string }) => (l.LineAmount ?? 0) < 0,
  );

  results.push({
    test_id: "T2",
    question: "Does Xero preserve +100 as debit and -100 as credit, or does it re-sign?",
    request_summary: "POST /ManualJournals with lines [+100, -100], then GET /ManualJournals/{id}",
    http_status: r2.status,
    api_error: null,
    finding: [
      `POST accepted: HTTP ${r2.status}`,
      `Debit line stored as: ${debitLine ? JSON.stringify({ amount: debitLine.LineAmount, account: debitLine.AccountCode }) : "not found"}`,
      `Credit line stored as: ${creditLine ? JSON.stringify({ amount: creditLine.LineAmount, account: creditLine.AccountCode }) : "not found"}`,
      `Conclusion: adapter should send ${debitLine?.LineAmount === 100 ? "+X for debit / -X for credit" : "OTHER convention — see raw"}`,
    ].join(" · "),
    evidence_file: "t2-signs.json, t2-signs-readback.json",
    passed: r2.status === 200,
  });
}

async function test3_forbidden(connection: XeroConnection): Promise<void> {
  console.log("\n[SPIKE] Test 3: Forbidden account rejection behavior");

  const accountsPayload = (await xeroGet(connection, 'Accounts?where=Status=="ACTIVE"')) as {
    Accounts?: XeroAccount[];
  };
  const allAccounts = accountsPayload?.Accounts ?? [];

  const forbidden: Array<{ type: string; account: XeroAccount | null }> = [
    { type: "BANK", account: allAccounts.find((a) => a.Type === "BANK") ?? null },
    {
      type: "ACCREC (AR)",
      account:
        allAccounts.find(
          (a) => a.Type === "CURRENT" && (a.SystemAccount === "DEBTORS" || a.Name?.includes("Receivable")),
        ) ?? null,
    },
    {
      type: "ACCPAY (AP)",
      account:
        allAccounts.find(
          (a) => a.Type === "CURRLIAB" && (a.SystemAccount === "CREDITORS" || a.Name?.includes("Payable")),
        ) ?? null,
    },
    {
      type: "RETAINEDEARNINGS",
      account: allAccounts.find((a) => a.SystemAccount === "RETAINEDEARNINGS") ?? null,
    },
  ];

  const genericPostable = allAccounts.find(isPostableOffset);
  if (!genericPostable?.Code) {
    console.error("[SPIKE] Test 3 needs 1 postable offset account");
    return;
  }

  const perTypeFindings: string[] = [];
  for (const { type, account } of forbidden) {
    if (!account?.Code) {
      perTypeFindings.push(`${type}: no account of this type in Demo Company — skipped`);
      continue;
    }
    const testId = `t3-${type.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
    const body = {
      Narration: `WBP W0.5 T3 — forbidden ${type}`,
      Status: "DRAFT",
      Date: new Date().toISOString().slice(0, 10),
      JournalLines: [
        { LineAmount: 1.0, AccountCode: account.Code, Description: `T3 forbidden ${type}` },
        { LineAmount: -1.0, AccountCode: genericPostable.Code, Description: "T3 offset" },
      ],
    };
    const r = await xeroPost(connection, "ManualJournals", body, testId);
    const respBody = r.body as {
      Elements?: Array<{ ValidationErrors?: Array<{ Message?: string }> }>;
      Message?: string;
    };
    const err =
      respBody?.Elements?.[0]?.ValidationErrors?.[0]?.Message ??
      respBody?.Message ??
      (r.status >= 400 ? `HTTP ${r.status}` : null);
    perTypeFindings.push(`${type} (${account.Code}): HTTP ${r.status}${err ? ` — ${err}` : " — ACCEPTED (verify raw)"}`);
  }

  results.push({
    test_id: "T3",
    question: "Does Xero enforce forbidden account types (BANK/AR/AP/RE) at the ManualJournals API layer?",
    request_summary: `POST /ManualJournals × ${forbidden.length}, one per forbidden type paired with a generic offset`,
    http_status: 0,
    api_error: null,
    finding: perTypeFindings.join(" · "),
    evidence_file: "t3-*.json",
    passed: true,
  });
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });
  console.log("[SPIKE] Starting WBP W0.5 Xero Sandbox Spike");
  console.log(`[SPIKE] Connection ${CONNECTION_ID} / tenant ${EXPECTED_TENANT}`);

  let connection = await loadConnection();
  connection = await refreshTokenIfNeeded(connection);

  await test1_currency(connection);
  await test2_sign(connection);
  await test3_forbidden(connection);

  const findingsMd = [
    "# WBP W0.5 — Xero Sandbox Spike Findings",
    "",
    `**Run:** ${new Date().toISOString()}`,
    `**Connection:** ${CONNECTION_ID}`,
    `**Tenant:** ${EXPECTED_TENANT} (Xero Demo Company US)`,
    `**Script:** \`scripts/wbp/xero-sandbox-spike.ts\``,
    "",
    "## Purpose",
    "",
    "Resolve 3 unknowns from `WBP_Provider_Research.md` (§5-7) before designing the W1 Xero adapter:",
    "",
    "1. Where does `CurrencyCode` belong on `ManualJournals` (header, line, or neither)?",
    "2. Does Xero preserve DEBIT/CREDIT signs as posted, or re-sign server-side?",
    "3. Do forbidden account types (BANK / AR / AP / RetainedEarnings) reject at API layer?",
    "",
    "## Results",
    "",
    ...results.flatMap((r) => [
      `### ${r.test_id} — ${r.question}`,
      "",
      `- **Request:** ${r.request_summary}`,
      `- **HTTP:** ${r.http_status || "(multi-request test — see per-type detail)"}${r.api_error ? " · " + r.api_error : ""}`,
      `- **Finding:** ${r.finding}`,
      `- **Evidence:** \`docs/wbp/xero-sandbox-raw/${r.evidence_file}\``,
      `- **Status:** ${r.passed ? "✅ ran clean" : "❌ error"}`,
      "",
    ]),
    "## W1 adapter design implications",
    "",
    "> Fill in after reviewing raw evidence:",
    "> - **Currency:** _(from T1)_",
    "> - **Sign convention:** _(from T2)_",
    "> - **Forbidden account preflight strategy:** _(from T3 — API-side rejection means we can rely on Xero; silent accept means we MUST preflight in the adapter)_",
    "",
    "## Repro",
    "",
    "```bash",
    "npm run wbp:xero-spike",
    "```",
    "",
    "Env required: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `ACCOUNTING_TOKEN_ENCRYPTION_KEY` (or the same key used to encrypt connection tokens).",
    "",
    "## Cleanup",
    "",
    "All journals were posted as `Status='DRAFT'`. To purge from Demo Company:",
    "",
    "```bash",
    "# In the Xero Demo Company UI: Accounting → Advanced → Manual Journals → filter Draft → delete WBP W0.5 entries",
    "```",
    "",
  ].join("\n");

  writeFileSync(path.join(FINDINGS_DIR, "xero-sandbox-findings.md"), findingsMd);
  console.log(`\n[SPIKE] Findings written to ${path.join(FINDINGS_DIR, "xero-sandbox-findings.md")}`);
  console.log(`[SPIKE] Raw evidence in ${RAW_DIR}`);

  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.error(`\n[SPIKE] ${failed.length} test(s) errored — see findings for detail`);
    process.exit(2);
  }
  console.log("\n[SPIKE] All tests ran clean. Review findings + raw evidence, then update W1 adapter design.");
}

main().catch((err) => {
  console.error("[SPIKE] Fatal error:", err);
  process.exit(1);
});
