/**
 * WBP W0.5 — Xero sandbox spike (reusable core).
 * Preview API route + local CLI both call runXeroSandboxSpike().
 *
 * SAFETY: ManualJournals posted as Status='DRAFT' only.
 * Tenant guard must equal Xero Demo Company US.
 */

import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { xeroAccountingProvider } from "@/lib/integrations/xero/provider";
import {
  decryptAccountingToken,
  encryptAccountingToken,
} from "@/lib/integrations/accounting/token-encryption";

export const WBP_XERO_SPIKE_CONNECTION_ID = "671afdab-8f46-4862-a1f2-6ba09b0aec35";
export const WBP_XERO_SPIKE_TENANT_ID = "ceaea696-081f-491e-9daa-a9263a023ca9";

export type XeroSandboxSpikeResult = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  tenantId: string;
  tokenRefreshed: boolean;
  connectionId: string;
  connectionUserId: string;
  tests: {
    currency: {
      variants: Array<{
        variant: "no_code" | "header_code" | "line_code";
        posted: boolean;
        httpStatus: number;
        journalId?: string;
        currencyOnJournal?: string;
        errorMessage?: string;
        rawRequest: unknown;
        rawResponse: unknown;
      }>;
    };
    signConvention: {
      posted: boolean;
      journalId?: string;
      readback?: {
        line1: {
          accountCode: string;
          description: string;
          taxType: string;
          grossAmount: number;
          netAmount: number;
        };
        line2: {
          accountCode: string;
          description: string;
          taxType: string;
          grossAmount: number;
          netAmount: number;
        };
      };
      rawRequest: unknown;
      rawResponse: unknown;
    };
    forbiddenAccounts: {
      attempts: Array<{
        accountCode: string;
        accountName: string;
        accountType: string;
        systemAccount: boolean;
        posted: boolean;
        httpStatus: number;
        errorMessage?: string;
        rawResponse: unknown;
      }>;
    };
  };
  raw: {
    calls: Array<{
      url: string;
      method: string;
      requestBody?: unknown;
      responseStatus: number;
      responseBody: unknown;
      durationMs: number;
    }>;
  };
};

type XeroConnection = {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  tenant_or_realm_id: string;
  status: string;
  external_entity_name: string | null;
};

type XeroAccount = {
  Code?: string;
  Type?: string;
  Name?: string;
  SystemAccount?: string;
  EnablePaymentsToAccount?: boolean;
};

type SpikeCallLog = XeroSandboxSpikeResult["raw"]["calls"];

function ensureEncryptionKey(encryptionKey: string) {
  if (!process.env.ACCOUNTING_TOKEN_ENCRYPTION_KEY) {
    process.env.ACCOUNTING_TOKEN_ENCRYPTION_KEY = encryptionKey;
  }
}

function extractErrorMessage(body: unknown, status: number): string | undefined {
  const respBody = body as {
    Elements?: Array<{ ValidationErrors?: Array<{ Message?: string }> }>;
    Message?: string;
  };
  return (
    respBody?.Elements?.[0]?.ValidationErrors?.[0]?.Message ??
    respBody?.Message ??
    (status >= 400 ? `HTTP ${status}` : undefined)
  );
}

function isPostableOffset(a: XeroAccount): boolean {
  return (
    !["BANK", "ACCPAY", "ACCREC", "RETAINEDEARNINGS", "CURRENT", "CURRLIAB"].includes(String(a.Type || "")) &&
    a.SystemAccount !== "RETAINEDEARNINGS" &&
    a.EnablePaymentsToAccount !== true
  );
}

async function loadConnection(admin: SupabaseClient, tenantIdGuard: string): Promise<XeroConnection> {
  const { data, error } = await admin
    .from("accounting_connections")
    .select(
      "id, user_id, access_token, refresh_token, token_expires_at, tenant_or_realm_id, status, external_entity_name",
    )
    .eq("id", WBP_XERO_SPIKE_CONNECTION_ID)
    .single();
  if (error || !data) throw new Error(`Connection ${WBP_XERO_SPIKE_CONNECTION_ID} not found`);
  if (data.tenant_or_realm_id !== tenantIdGuard) {
    throw new Error(
      `Refusing to run: tenant is ${data.tenant_or_realm_id}, expected Xero Demo Company (${tenantIdGuard})`,
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
    user_id: String(data.user_id),
    access_token: access,
    refresh_token: refresh,
    token_expires_at: String(data.token_expires_at),
    tenant_or_realm_id: String(data.tenant_or_realm_id),
    status: String(data.status),
    external_entity_name: data.external_entity_name ? String(data.external_entity_name) : null,
  };
}

async function refreshTokenIfNeeded(
  admin: SupabaseClient,
  connection: XeroConnection,
): Promise<{ connection: XeroConnection; tokenRefreshed: boolean }> {
  const expiresAt = new Date(connection.token_expires_at).getTime();
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000;
  if (expiresAt - now > bufferMs) {
    return { connection, tokenRefreshed: false };
  }

  const payload = (await xeroAccountingProvider.refreshAccessToken({
    refreshToken: connection.refresh_token,
  })) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!payload.access_token || !payload.refresh_token) {
    throw new Error("Xero token refresh did not return access_token/refresh_token");
  }
  const newTokenExpiresAt = new Date(Date.now() + (payload.expires_in ?? 1800) * 1000).toISOString();
  const { error } = await admin
    .from("accounting_connections")
    .update({
      access_token: encryptAccountingToken(payload.access_token),
      refresh_token: encryptAccountingToken(payload.refresh_token),
      token_expires_at: newTokenExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", WBP_XERO_SPIKE_CONNECTION_ID);
  if (error) throw error;

  return {
    tokenRefreshed: true,
    connection: {
      ...connection,
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      token_expires_at: newTokenExpiresAt,
    },
  };
}

async function xeroRequest(
  connection: XeroConnection,
  method: "GET" | "POST",
  endpoint: string,
  calls: SpikeCallLog,
  body?: unknown,
) {
  const url = `https://api.xero.com/api.xro/2.0/${endpoint}`;
  const started = Date.now();
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${connection.access_token}`,
      "xero-tenant-id": connection.tenant_or_realm_id,
      Accept: "application/json",
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });
  const rawText = await response.text();
  let parsed: unknown = rawText;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    /* keep text */
  }
  calls.push({
    url,
    method,
    requestBody: body,
    responseStatus: response.status,
    responseBody: parsed,
    durationMs: Date.now() - started,
  });
  return { status: response.status, body: parsed };
}

export async function runXeroSandboxSpike(opts: {
  supabaseClient: SupabaseClient;
  encryptionKey: string;
  tenantIdGuard: string;
}): Promise<XeroSandboxSpikeResult> {
  const { supabaseClient, encryptionKey, tenantIdGuard } = opts;
  if (tenantIdGuard !== WBP_XERO_SPIKE_TENANT_ID) {
    throw new Error(`tenantIdGuard must be ${WBP_XERO_SPIKE_TENANT_ID}`);
  }
  ensureEncryptionKey(encryptionKey);

  const startedAt = new Date().toISOString();
  const runId = randomUUID();
  const calls: SpikeCallLog = [];

  let connection = await loadConnection(supabaseClient, tenantIdGuard);
  const refreshed = await refreshTokenIfNeeded(supabaseClient, connection);
  connection = refreshed.connection;

  // --- Test 1: currency ---
  const orgPayload = (await xeroRequest(connection, "GET", "Organisation", calls)).body as {
    Organisations?: Array<{ BaseCurrency?: string }>;
  };
  const baseCurrency = orgPayload?.Organisations?.[0]?.BaseCurrency ?? "USD";

  const accountsPayload = (
    await xeroRequest(connection, "GET", 'Accounts?where=Status=="ACTIVE"', calls)
  ).body as { Accounts?: XeroAccount[] };
  const allAccounts = accountsPayload?.Accounts ?? [];
  const postable = allAccounts
    .filter(
      (a) =>
        ![
          "BANK",
          "PAYG",
          "PAYGLIABILITY",
          "PAYE",
          "ACCPAY",
          "ACCREC",
          "RETAINEDEARNINGS",
          "CURRENT",
          "TAX",
          "SALES",
          "REVENUE",
        ].includes(String(a.Type || "")) &&
        a.EnablePaymentsToAccount !== true &&
        a.Type !== "BANK",
    )
    .slice(0, 2);
  if (postable.length < 2) {
    throw new Error(`Not enough postable accounts for currency test — need 2, found ${postable.length}`);
  }
  const acctA = String(postable[0].Code);
  const acctB = String(postable[1].Code);

  const currencyVariants: XeroSandboxSpikeResult["tests"]["currency"]["variants"] = [];
  const currencyBodies: Array<{
    variant: "no_code" | "header_code" | "line_code";
    body: Record<string, unknown>;
  }> = [
    {
      variant: "no_code",
      body: {
        Narration: "WBP W0.5 T1a — no currency code",
        Status: "DRAFT",
        Date: new Date().toISOString().slice(0, 10),
        JournalLines: [
          { LineAmount: 10.0, AccountCode: acctA, Description: "T1a debit" },
          { LineAmount: -10.0, AccountCode: acctB, Description: "T1a credit" },
        ],
      },
    },
    {
      variant: "header_code",
      body: {
        Narration: "WBP W0.5 T1b — header CurrencyCode",
        Status: "DRAFT",
        Date: new Date().toISOString().slice(0, 10),
        CurrencyCode: baseCurrency,
        JournalLines: [
          { LineAmount: 10.0, AccountCode: acctA, Description: "T1b debit" },
          { LineAmount: -10.0, AccountCode: acctB, Description: "T1b credit" },
        ],
      },
    },
    {
      variant: "line_code",
      body: {
        Narration: "WBP W0.5 T1c — line CurrencyCode (expected reject)",
        Status: "DRAFT",
        Date: new Date().toISOString().slice(0, 10),
        JournalLines: [
          { LineAmount: 10.0, AccountCode: acctA, Description: "T1c debit", CurrencyCode: baseCurrency },
          { LineAmount: -10.0, AccountCode: acctB, Description: "T1c credit", CurrencyCode: baseCurrency },
        ],
      },
    },
  ];

  for (const item of currencyBodies) {
    const r = await xeroRequest(connection, "POST", "ManualJournals", calls, item.body);
    const resp = r.body as {
      ManualJournals?: Array<{ ManualJournalID?: string; CurrencyCode?: string }>;
    };
    currencyVariants.push({
      variant: item.variant,
      posted: r.status >= 200 && r.status < 300,
      httpStatus: r.status,
      journalId: resp?.ManualJournals?.[0]?.ManualJournalID,
      currencyOnJournal: resp?.ManualJournals?.[0]?.CurrencyCode,
      errorMessage: extractErrorMessage(r.body, r.status),
      rawRequest: item.body,
      rawResponse: r.body,
    });
  }

  // --- Test 2: sign convention ---
  const signBody = {
    Narration: "WBP W0.5 T2 — sign convention (+100 debit / -100 credit)",
    Status: "DRAFT",
    Date: new Date().toISOString().slice(0, 10),
    JournalLines: [
      { LineAmount: 100.0, AccountCode: acctA, Description: "T2 +100" },
      { LineAmount: -100.0, AccountCode: acctB, Description: "T2 -100" },
    ],
  };
  const r2 = await xeroRequest(connection, "POST", "ManualJournals", calls, signBody);
  const r2Body = r2.body as { ManualJournals?: Array<{ ManualJournalID?: string }> };
  const journalId = r2Body?.ManualJournals?.[0]?.ManualJournalID;
  let readback: XeroSandboxSpikeResult["tests"]["signConvention"]["readback"];
  let rawReadback: unknown = null;
  if (journalId) {
    const getR = await xeroRequest(connection, "GET", `ManualJournals/${journalId}`, calls);
    rawReadback = getR.body;
    const lines =
      (
        getR.body as {
          ManualJournals?: Array<{
            JournalLines?: Array<{
              AccountCode?: string;
              Description?: string;
              TaxType?: string;
              LineAmount?: number;
            }>;
          }>;
        }
      )?.ManualJournals?.[0]?.JournalLines ?? [];
    if (lines.length >= 2) {
      const mapLine = (line: {
        AccountCode?: string;
        Description?: string;
        TaxType?: string;
        LineAmount?: number;
      }) => ({
        accountCode: String(line.AccountCode || ""),
        description: String(line.Description || ""),
        taxType: String(line.TaxType || ""),
        grossAmount: Number(line.LineAmount || 0),
        netAmount: Number(line.LineAmount || 0),
      });
      readback = { line1: mapLine(lines[0]), line2: mapLine(lines[1]) };
    }
  }

  // --- Test 3: forbidden accounts ---
  const forbiddenDefs: Array<{ label: string; account: XeroAccount | null }> = [
    { label: "BANK", account: allAccounts.find((a) => a.Type === "BANK") ?? null },
    {
      label: "ACCREC",
      account:
        allAccounts.find(
          (a) => a.Type === "CURRENT" && (a.SystemAccount === "DEBTORS" || a.Name?.includes("Receivable")),
        ) ?? null,
    },
    {
      label: "ACCPAY",
      account:
        allAccounts.find(
          (a) => a.Type === "CURRLIAB" && (a.SystemAccount === "CREDITORS" || a.Name?.includes("Payable")),
        ) ?? null,
    },
    {
      label: "RETAINEDEARNINGS",
      account: allAccounts.find((a) => a.SystemAccount === "RETAINEDEARNINGS") ?? null,
    },
  ];
  const genericPostable = allAccounts.find(isPostableOffset);
  if (!genericPostable?.Code) {
    throw new Error("Test 3 needs 1 postable offset account");
  }

  const forbiddenAttempts: XeroSandboxSpikeResult["tests"]["forbiddenAccounts"]["attempts"] = [];
  for (const { label, account } of forbiddenDefs) {
    if (!account?.Code) {
      forbiddenAttempts.push({
        accountCode: "",
        accountName: label,
        accountType: label,
        systemAccount: false,
        posted: false,
        httpStatus: 0,
        errorMessage: `no account of type ${label} in Demo Company — skipped`,
        rawResponse: null,
      });
      continue;
    }
    const body = {
      Narration: `WBP W0.5 T3 — forbidden ${label}`,
      Status: "DRAFT",
      Date: new Date().toISOString().slice(0, 10),
      JournalLines: [
        { LineAmount: 1.0, AccountCode: account.Code, Description: `T3 forbidden ${label}` },
        { LineAmount: -1.0, AccountCode: genericPostable.Code, Description: "T3 offset" },
      ],
    };
    const r = await xeroRequest(connection, "POST", "ManualJournals", calls, body);
    forbiddenAttempts.push({
      accountCode: String(account.Code),
      accountName: String(account.Name || label),
      accountType: String(account.Type || label),
      systemAccount: Boolean(account.SystemAccount),
      posted: r.status >= 200 && r.status < 300,
      httpStatus: r.status,
      errorMessage: extractErrorMessage(r.body, r.status),
      rawResponse: r.body,
    });
  }

  const finishedAt = new Date().toISOString();
  return {
    runId,
    startedAt,
    finishedAt,
    tenantId: connection.tenant_or_realm_id,
    tokenRefreshed: refreshed.tokenRefreshed,
    connectionId: connection.id,
    connectionUserId: connection.user_id,
    tests: {
      currency: { variants: currencyVariants },
      signConvention: {
        posted: r2.status >= 200 && r2.status < 300,
        journalId,
        readback,
        rawRequest: signBody,
        rawResponse: rawReadback ?? r2.body,
      },
      forbiddenAccounts: { attempts: forbiddenAttempts },
    },
    raw: { calls },
  };
}

export function hashSpikeResult(result: XeroSandboxSpikeResult): string {
  return createHash("sha256").update(JSON.stringify(result)).digest("hex");
}
