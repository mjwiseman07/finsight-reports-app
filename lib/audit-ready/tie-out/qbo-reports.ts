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

// ---------------------------------------------------------------------------
// TIEOUT-3 additions — AP Aging Detail, Inventory Valuation Detail, and
// helper for open Item Receipts (GRNI). All mirror the AR/TB helpers:
// same qboApiFetch signature, same base URL resolver, same defensive
// Section-vs-Data row walking.
// ---------------------------------------------------------------------------
export type QboApAgingVendor = {
  vendor_ref: string | null;
  vendor_display_name: string;
  total_cents: number;
  current_cents?: number;
  d1_30_cents?: number;
  d31_60_cents?: number;
  d61_90_cents?: number;
  d91_plus_cents?: number;
};
export type QboApAgingResult = {
  as_of_date: string;
  currency: string;
  vendors: QboApAgingVendor[];
  total_cents: number;
  raw_report_url: string;
  intuit_tid: string | null;
};
export async function fetchQboApAgingDetail(params: {
  realmId: string;
  accessToken: string;
  asOfDate: string; // YYYY-MM-DD
}): Promise<QboApAgingResult> {
  const { realmId, accessToken, asOfDate } = params;
  const url =
    `${qboBaseUrl()}/v3/company/${encodeURIComponent(realmId)}` +
    `/reports/AgedPayableDetail` +
    `?report_date=${encodeURIComponent(asOfDate)}` +
    `&summarize_column_by=Vendors` +
    `&minorversion=75`;
  const res = await qboApiFetch(url, { accessToken, method: "GET" });
  if (!res.ok) {
    throw new Error(
      `QBO AgedPayableDetail fetch failed: ${res.status} tid=${res.intuit_tid ?? "n/a"}`,
    );
  }
  const report = res.json;
  const vendors: QboApAgingVendor[] = [];
  const rows = report?.Rows?.Row ?? [];
  const currency = report?.Header?.Currency ?? "USD";
  const asOf = report?.Header?.ReportDate ?? asOfDate;
  for (const row of rows) {
    if (row.type === "Section" && row.Summary?.ColData) {
      const cols = row.Summary.ColData as Array<{ value?: string; id?: string }>;
      const name = cols[0]?.value ?? "(unknown vendor)";
      const totalStr = cols[cols.length - 1]?.value ?? "0";
      const total_cents = Math.round(
        parseFloat(String(totalStr).replace(/,/g, "")) * 100,
      );
      vendors.push({
        vendor_ref: cols[0]?.id ?? null,
        vendor_display_name: name,
        total_cents: isNaN(total_cents) ? 0 : total_cents,
      });
    }
  }
  // Fallback: collapse Data rows by VendorRef when the report is flat.
  if (vendors.length === 0 && Array.isArray(rows)) {
    const byVendor = new Map<string, QboApAgingVendor>();
    for (const row of rows) {
      if (row.type !== "Data" || !Array.isArray(row.ColData)) continue;
      const cols = row.ColData as Array<{ value?: string; id?: string }>;
      const vendCol = cols.find((c) => c.id && /^\d+$/.test(c.id));
      const amountCol = cols[cols.length - 1];
      if (!vendCol || !amountCol) continue;
      const vendId = vendCol.id!;
      const name = vendCol.value ?? "(unknown vendor)";
      const amount = Math.round(
        parseFloat(String(amountCol.value ?? "0").replace(/,/g, "")) * 100,
      );
      if (isNaN(amount)) continue;
      const existing = byVendor.get(vendId);
      if (existing) {
        existing.total_cents += amount;
      } else {
        byVendor.set(vendId, {
          vendor_ref: vendId,
          vendor_display_name: name,
          total_cents: amount,
        });
      }
    }
    vendors.push(...byVendor.values());
  }
  const total = vendors.reduce((s, v) => s + v.total_cents, 0);
  return {
    as_of_date: asOf,
    currency,
    vendors,
    total_cents: total,
    raw_report_url: url,
    intuit_tid: res.intuit_tid,
  };
}
// ---------------------------------------------------------------------------
// Inventory Valuation Detail
// ---------------------------------------------------------------------------
export type QboInventoryItem = {
  item_ref: string | null;
  item_display_name: string;
  qty_on_hand: number;
  asset_value_cents: number;
};
export type QboInventoryValuationResult = {
  as_of_date: string;
  currency: string;
  items: QboInventoryItem[];
  total_cents: number;
  raw_report_url: string;
  intuit_tid: string | null;
};
export async function fetchQboInventoryValuationDetail(params: {
  realmId: string;
  accessToken: string;
  asOfDate: string;
}): Promise<QboInventoryValuationResult> {
  const { realmId, accessToken, asOfDate } = params;
  const url =
    `${qboBaseUrl()}/v3/company/${encodeURIComponent(realmId)}` +
    `/reports/InventoryValuationDetail` +
    `?end_date=${encodeURIComponent(asOfDate)}` +
    `&minorversion=75`;
  const res = await qboApiFetch(url, { accessToken, method: "GET" });
  if (!res.ok) {
    throw new Error(
      `QBO InventoryValuationDetail fetch failed: ${res.status} tid=${res.intuit_tid ?? "n/a"}`,
    );
  }
  const report = res.json;
  const rows = report?.Rows?.Row ?? [];
  const currency = report?.Header?.Currency ?? "USD";
  const asOf = report?.Header?.ReportEndDate ?? asOfDate;
  // Inventory Valuation Detail is typically a Section-per-item report.
  // Each Section header identifies the item; the Section Summary gives
  // ending Qty and Asset Value.
  const items: QboInventoryItem[] = [];
  for (const row of rows) {
    if (row.type !== "Section") continue;
    const header = row.Header?.ColData as
      | Array<{ value?: string; id?: string }>
      | undefined;
    const summary = row.Summary?.ColData as
      | Array<{ value?: string; id?: string }>
      | undefined;
    if (!header || !summary) continue;
    const itemName = header[0]?.value ?? "(unknown item)";
    const itemRef = header[0]?.id ?? null;
    // Column order per QBO docs: Date, Trans Type, Num, Name, Memo, Qty,
    // Rate, FIFO Cost, Qty on Hand, Asset Value. Summary reflects last row.
    // We defensively grab last two numeric-looking cols.
    const numericVals = summary
      .map((c) => parseFloat(String(c.value ?? "").replace(/,/g, "")))
      .map((n) => (isNaN(n) ? null : n));
    // Asset value is the very last numeric col; qty-on-hand is the one
    // before it.
    const lastNumIdx = numericVals
      .map((v, i) => (v !== null ? i : -1))
      .filter((i) => i >= 0);
    const assetIdx = lastNumIdx.length >= 1 ? lastNumIdx[lastNumIdx.length - 1] : -1;
    const qtyIdx = lastNumIdx.length >= 2 ? lastNumIdx[lastNumIdx.length - 2] : -1;
    const asset_value = assetIdx >= 0 ? numericVals[assetIdx]! : 0;
    const qty_on_hand = qtyIdx >= 0 ? numericVals[qtyIdx]! : 0;
    items.push({
      item_ref: itemRef,
      item_display_name: itemName,
      qty_on_hand,
      asset_value_cents: Math.round(asset_value * 100),
    });
  }
  const total = items.reduce((s, i) => s + i.asset_value_cents, 0);
  return {
    as_of_date: asOf,
    currency,
    items,
    total_cents: total,
    raw_report_url: url,
    intuit_tid: res.intuit_tid,
  };
}
// ---------------------------------------------------------------------------
// Open Item Receipts (GRNI). No dedicated QBO report — we query ItemReceipt
// entities filtered to open status. GRNI value = sum of open Item Receipts
// posted against the client's clearing account.
// ---------------------------------------------------------------------------
export type QboItemReceipt = {
  receipt_id: string;
  txn_date: string;
  vendor_ref: string | null;
  vendor_display_name: string | null;
  clearing_account_ref: string | null;
  total_cents: number;
  doc_number: string | null;
};
export type QboItemReceiptQueryResult = {
  as_of_date: string;
  receipts: QboItemReceipt[];
  total_cents: number;
  raw_query_url: string;
  intuit_tid: string | null;
};
/**
 * Query open ItemReceipt records as-of a date. QBO does not accept an
 * `asOf` filter on ItemReceipt query, so we pull all ItemReceipts with
 * TxnDate <= asOfDate and filter client-side.
 *
 * NOTE: pagination via STARTPOSITION. We loop until <1000 rows returned
 * to guarantee we captured all receipts.
 */
export async function fetchQboOpenItemReceipts(params: {
  realmId: string;
  accessToken: string;
  asOfDate: string;
  clearingAccountId: string;
}): Promise<QboItemReceiptQueryResult> {
  const { realmId, accessToken, asOfDate, clearingAccountId } = params;
  const pageSize = 1000;
  let startPos = 1;
  const receipts: QboItemReceipt[] = [];
  let lastUrl = "";
  let lastTid: string | null = null;
  while (true) {
    // Explicit column list — SELECT * is unreliable on ItemReceipt across
    // some QBO sandbox realms. Column list mirrors the QboItemReceipt type.
    const q =
      `SELECT Id, TxnDate, DocNumber, TotalAmt, VendorRef, APAccountRef, Line ` +
      `FROM ItemReceipt ` +
      `WHERE TxnDate <= '${asOfDate}' ` +
      `STARTPOSITION ${startPos} MAXRESULTS ${pageSize}`;
    const url =
      `${qboBaseUrl()}/v3/company/${encodeURIComponent(realmId)}/query` +
      `?query=${encodeURIComponent(q)}&minorversion=65`;
    lastUrl = url;
    const res = await qboApiFetch(url, { accessToken, method: "GET" });
    if (!res.ok) {
      // Surface the QBO Fault so we can diagnose 400s. Redact tokens/realmId.
      const faultBody =
        res.json?.Fault?.Error?.map(
          (e: { Message?: string; Detail?: string; code?: string }) =>
            `[${e.code ?? "?"}] ${e.Message ?? ""} :: ${e.Detail ?? ""}`,
        ).join(" | ") ?? JSON.stringify(res.json ?? {}).slice(0, 500);
      throw new Error(
        `QBO ItemReceipt query failed: ${res.status} tid=${res.intuit_tid ?? "n/a"} ` +
          `query=${encodeURIComponent(q).slice(0, 200)} fault=${faultBody}`,
      );
    }
    lastTid = res.intuit_tid;
    const page = (res.json?.QueryResponse?.ItemReceipt ?? []) as Array<{
      Id: string;
      TxnDate: string;
      DocNumber?: string;
      TotalAmt?: number;
      VendorRef?: { value?: string; name?: string };
      APAccountRef?: { value?: string };
      Line?: Array<{ AccountBasedExpenseLineDetail?: { AccountRef?: { value?: string } } }>;
    }>;
    for (const r of page) {
      // Filter to receipts posted against the configured clearing account.
      const apAcct = r.APAccountRef?.value ?? null;
      const lineAccts = (r.Line ?? [])
        .map((l) => l.AccountBasedExpenseLineDetail?.AccountRef?.value ?? null)
        .filter((x): x is string => !!x);
      const touchesClearing =
        apAcct === clearingAccountId || lineAccts.includes(clearingAccountId);
      if (!touchesClearing) continue;
      receipts.push({
        receipt_id: r.Id,
        txn_date: r.TxnDate,
        vendor_ref: r.VendorRef?.value ?? null,
        vendor_display_name: r.VendorRef?.name ?? null,
        clearing_account_ref: clearingAccountId,
        total_cents: Math.round((r.TotalAmt ?? 0) * 100),
        doc_number: r.DocNumber ?? null,
      });
    }
    if (page.length < pageSize) break;
    startPos += pageSize;
    if (startPos > 50000) break; // hard safety stop
  }
  const total = receipts.reduce((s, r) => s + r.total_cents, 0);
  return {
    as_of_date: asOfDate,
    receipts,
    total_cents: total,
    raw_query_url: lastUrl,
    intuit_tid: lastTid,
  };
}
