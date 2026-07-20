import { qboApiFetch } from "@/lib/qbo/api-fetch.js";

/**
 * Mirror PULSE-JE / CDC / write-preflight: QB_ENVIRONMENT toggles sandbox vs production.
 * No shared helper module exists — keep the same inline pattern.
 */
function qboBaseUrl(): string {
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

export type QboArAgingCustomer = {
  customer_ref: string | null;
  customer_display_name: string;
  total_cents: number;
  // Aging buckets (values in cents) — not used yet by TIEOUT-2 but captured for TIEOUT-4 narratives.
  current_cents?: number;
  d1_30_cents?: number;
  d31_60_cents?: number;
  d61_90_cents?: number;
  d91_plus_cents?: number;
};

export type QboArAgingResult = {
  as_of_date: string;
  currency: string;
  customers: QboArAgingCustomer[];
  total_cents: number;
  raw_report_url: string;
  intuit_tid: string | null;
};

export async function fetchQboArAgingDetail(params: {
  realmId: string;
  accessToken: string;
  asOfDate: string; // YYYY-MM-DD
}): Promise<QboArAgingResult> {
  const { realmId, accessToken, asOfDate } = params;
  const url =
    `${qboBaseUrl()}/v3/company/${encodeURIComponent(realmId)}` +
    `/reports/AgedReceivableDetail` +
    `?report_date=${encodeURIComponent(asOfDate)}` +
    `&summarize_column_by=Customers` +
    `&minorversion=75`;
  const res = await qboApiFetch(url, { accessToken, method: "GET" });
  if (!res.ok) {
    throw new Error(
      `QBO AgedReceivableDetail fetch failed: ${res.status} tid=${res.intuit_tid ?? "n/a"}`,
    );
  }
  const report = res.json;
  // QBO reports are shaped as nested Header / Columns / Rows. Rows may be
  // Section rows containing sub-rows. Customer summary row has
  // group='Customer' or the last leaf-level rows contain Customer columns.
  // We only need per-customer TOTAL. Sum the numeric column labeled "Amount".
  const customers: QboArAgingCustomer[] = [];
  const rows = report?.Rows?.Row ?? [];
  const currency = report?.Header?.Currency ?? "USD";
  const asOf = report?.Header?.ReportDate ?? asOfDate;
  for (const row of rows) {
    // Section rows have Summary at end; leaf rows have ColData.
    if (row.type === "Section" && row.Summary?.ColData) {
      const cols = row.Summary.ColData as Array<{ value?: string; id?: string }>;
      const name = cols[0]?.value ?? "(unknown customer)";
      const totalStr = cols[cols.length - 1]?.value ?? "0";
      const total_cents = Math.round(parseFloat(totalStr.replace(/,/g, "")) * 100);
      customers.push({
        customer_ref: cols[0]?.id ?? null,
        customer_display_name: name,
        total_cents: isNaN(total_cents) ? 0 : total_cents,
      });
    } else if (row.type === "Data" && Array.isArray(row.ColData)) {
      // Single-invoice leaf row — the Detail report enumerates each open invoice.
      // We collapse to customer totals in a second pass below.
    }
  }
  // If the loop above didn't produce sections (some QBO variants return only
  // Data rows), collapse Data rows by CustomerRef.
  if (customers.length === 0 && Array.isArray(rows)) {
    const byCust = new Map<string, QboArAgingCustomer>();
    for (const row of rows) {
      if (row.type !== "Data" || !Array.isArray(row.ColData)) continue;
      const cols = row.ColData as Array<{ value?: string; id?: string }>;
      // Column indices depend on the report layout. Grab the "Customer" col
      // (often index 4 or the last labeled column) — safest to find by header.
      // For robustness, fall back to whichever col has an id starting with a
      // digit (QBO customer IDs are numeric strings).
      const custCol = cols.find((c) => c.id && /^\d+$/.test(c.id));
      const amountCol = cols[cols.length - 1];
      if (!custCol || !amountCol) continue;
      const custId = custCol.id!;
      const name = custCol.value ?? "(unknown customer)";
      const amount = Math.round(
        parseFloat(String(amountCol.value ?? "0").replace(/,/g, "")) * 100,
      );
      if (isNaN(amount)) continue;
      const existing = byCust.get(custId);
      if (existing) {
        existing.total_cents += amount;
      } else {
        byCust.set(custId, {
          customer_ref: custId,
          customer_display_name: name,
          total_cents: amount,
        });
      }
    }
    customers.push(...byCust.values());
  }
  const total = customers.reduce((s, c) => s + c.total_cents, 0);
  return {
    as_of_date: asOf,
    currency,
    customers,
    total_cents: total,
    raw_report_url: url,
    intuit_tid: res.intuit_tid,
  };
}

export type QboTrialBalanceLine = {
  account_ref: string | null;
  account_name: string;
  debit_cents: number;
  credit_cents: number;
  net_cents: number; // debit - credit
};

export type QboTrialBalanceResult = {
  as_of_date: string;
  currency: string;
  lines: QboTrialBalanceLine[];
  raw_report_url: string;
  intuit_tid: string | null;
};

/**
 * Trial Balance as of a date. TIEOUT-2 uses this to pull the AR control
 * account's ending balance. `arAccountId` is the QBO Account ID (numeric
 * string) that maps to Accounts Receivable in the client's chart of accounts.
 */
export async function fetchQboTrialBalance(params: {
  realmId: string;
  accessToken: string;
  asOfDate: string;
}): Promise<QboTrialBalanceResult> {
  const { realmId, accessToken, asOfDate } = params;
  const url =
    `${qboBaseUrl()}/v3/company/${encodeURIComponent(realmId)}` +
    `/reports/TrialBalance` +
    `?end_date=${encodeURIComponent(asOfDate)}` +
    `&minorversion=75`;
  const res = await qboApiFetch(url, { accessToken, method: "GET" });
  if (!res.ok) {
    throw new Error(
      `QBO TrialBalance fetch failed: ${res.status} tid=${res.intuit_tid ?? "n/a"}`,
    );
  }
  const report = res.json;
  const rows = report?.Rows?.Row ?? [];
  const currency = report?.Header?.Currency ?? "USD";
  const asOf = report?.Header?.ReportEndDate ?? asOfDate;
  const lines: QboTrialBalanceLine[] = [];
  const walk = (r: {
    type?: string;
    ColData?: Array<{ value?: string; id?: string }>;
    Rows?: { Row?: unknown[] };
  }) => {
    if (r.type === "Data" && Array.isArray(r.ColData)) {
      const cols = r.ColData;
      // TrialBalance layout: [Account, Debit, Credit]
      const acct = cols[0];
      const debit = parseFloat(String(cols[1]?.value ?? "0").replace(/,/g, ""));
      const credit = parseFloat(String(cols[2]?.value ?? "0").replace(/,/g, ""));
      const debit_cents = Math.round((isNaN(debit) ? 0 : debit) * 100);
      const credit_cents = Math.round((isNaN(credit) ? 0 : credit) * 100);
      lines.push({
        account_ref: acct?.id ?? null,
        account_name: acct?.value ?? "(unknown account)",
        debit_cents,
        credit_cents,
        net_cents: debit_cents - credit_cents,
      });
    }
    if (Array.isArray(r.Rows?.Row)) {
      (r.Rows.Row as typeof rows).forEach(walk);
    }
  };
  rows.forEach(walk);
  return {
    as_of_date: asOf,
    currency,
    lines,
    raw_report_url: url,
    intuit_tid: res.intuit_tid,
  };
}
