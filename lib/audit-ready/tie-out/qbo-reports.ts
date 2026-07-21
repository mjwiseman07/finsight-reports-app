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
// Open Unbilled Bills (GRNI report — QBO Online).
//
// QBO Online does not surface `ItemReceipt` as a first-class transaction — the
// UI never creates one. The on-platform GRNI pattern is:
//   1. Bookkeeper creates a Purchase Order.
//   2. Goods arrive → bookkeeper uses "Copy to Bill" on the PO, leaves
//      DocNumber (Bill no.) BLANK to signal "goods received, invoice not
//      yet arrived", saves.
//   3. Vendor invoice arrives → bookkeeper re-opens the bill, fills in
//      DocNumber (the vendor's actual invoice number), saves.
//
// So the RA-tier report queries Bill by TxnDate <= asOfDate, then filters
// client-side for blank DocNumber + Balance > 0 (QBO query language does
// not support DocNumber IS NULL / parenthesized OR). No dedicated QBO
// report; no clearing-account filter; pre-tax subtotals preferred when
// TxnTaxDetail is present on the entity payload.
//
// RA Pro-tier reclass (Provisional #7 candidate) will additionally post
// JEs to move these balances from A/P to a dedicated GRNI clearing
// account continuously — that lives on `grni_clearing_qbo_account_id`
// on the engagement row and is out of scope for RA-tier.
// ---------------------------------------------------------------------------
export type QboUnbilledBill = {
  bill_id: string;
  txn_date: string;
  vendor_ref: string | null;
  vendor_display_name: string | null;
  ap_account_ref: string | null;
  total_cents: number; // TotalAmt (includes tax if any tax lines present)
  subtotal_cents: number; // Pre-tax amount — preferred for GRNI reporting
  balance_cents: number; // Balance (unpaid portion)
  doc_number: string | null; // Always null/empty for GRNI bills
  linked_po_ids: string[]; // LinkedTxn where TxnType='PurchaseOrder'
  enrichment_error: string | null; // Non-null when GET-by-id failed; row falls
  // back to list-query values (subtotal_cents=total_cents, linked_po_ids=[]).
};
export type QboUnbilledBillsQueryResult = {
  as_of_date: string;
  bills: QboUnbilledBill[];
  total_cents: number; // Sum of subtotal_cents (pre-tax)
  raw_query_url: string;
  intuit_tid: string | null;
};
/**
 * Fetch a single Bill by id. Returns the full entity — including TxnTaxDetail
 * and LinkedTxn, which are NOT selectable on the `Bill` list query.
 *
 * Used by `fetchQboOpenUnbilledBills` for per-row enrichment (real pre-tax
 * subtotal + PO linkage evidence). Returns null on any failure (4xx/5xx/
 * network/parse) — caller decides how to degrade. The reason string surfaces
 * `intuit_tid` for Intuit support tickets if enrichment consistently fails.
 */
async function fetchQboBillById(params: {
  realmId: string;
  accessToken: string;
  billId: string;
}): Promise<{
  ok: true;
  bill: {
    TotalAmt?: number;
    TxnTaxDetail?: { TotalTax?: number };
    LinkedTxn?: Array<{ TxnId?: string; TxnType?: string }>;
  };
} | { ok: false; reason: string }> {
  const { realmId, accessToken, billId } = params;
  const url =
    `${qboBaseUrl()}/v3/company/${encodeURIComponent(realmId)}` +
    `/bill/${encodeURIComponent(billId)}?minorversion=65`;
  const res = await qboApiFetch(url, { accessToken, method: "GET" });
  if (!res.ok) {
    const faultBody =
      res.json?.Fault?.Error?.map(
        (e: { Message?: string; Detail?: string; code?: string }) =>
          `[${e.code ?? "?"}] ${e.Message ?? ""}`,
      ).join(" | ") ?? "";
    return {
      ok: false,
      reason: `bill_get_${res.status}_tid=${res.intuit_tid ?? "n/a"}${
        faultBody ? ` fault=${faultBody}` : ""
      }`,
    };
  }
  const bill = res.json?.Bill;
  if (!bill || typeof bill !== "object") {
    return {
      ok: false,
      reason: `bill_get_parse_tid=${res.intuit_tid ?? "n/a"}`,
    };
  }
  return { ok: true, bill };
}
/**
 * Query open unbilled Bills as-of a date. RA-tier GRNI report.
 *
 * Two-step query strategy (QBO Online):
 *   1. `SELECT ... FROM Bill WHERE TxnDate <= '<asOfDate>'` list query, then
 *      client-side filter for blank DocNumber + Balance > 0 + TotalAmt > 0.
 *   2. For each surviving Bill, `GET /v3/company/<realm>/bill/<id>` to
 *      enrich with TxnTaxDetail (real pre-tax subtotal) and LinkedTxn
 *      (PO linkage evidence). Fails gracefully per-row.
 *
 * QBO Online query-language adaptations (probed against sandbox 9341457151063823):
 * - `DocNumber IS NULL` / parenthesized OR → QueryParserError 4000
 * - `DocNumber = ''` parses but matches zero rows (blank DocNumber is omitted,
 *   not empty string)
 * - `LinkedTxn` / `TxnTaxDetail` are not selectable on Bill query (4001
 *   Property not found). They ARE returned on the single-Bill GET endpoint,
 *   which is why enrichment is a second call rather than a richer SELECT.
 *
 * Pagination via STARTPOSITION until <1000 rows returned. Retains 3.1 Fault
 * surfacing on 4xx and 3.2 pre-tax / zero-amount / zero-balance filters.
 * Enrichment is sequential — RA-tier volumes (<200 bills/period) don't
 * benefit from parallelism, and QBO throttles at 500 req/min per realm.
 */
export async function fetchQboOpenUnbilledBills(params: {
  realmId: string;
  accessToken: string;
  asOfDate: string;
}): Promise<QboUnbilledBillsQueryResult> {
  const { realmId, accessToken, asOfDate } = params;
  const pageSize = 1000;
  let startPos = 1;
  const bills: QboUnbilledBill[] = [];
  let lastUrl = "";
  let lastTid: string | null = null;
  while (true) {
    // Explicit columns that Bill query accepts. Do NOT SELECT LinkedTxn or
    // TxnTaxDetail — QBO returns QueryValidationError 4001 for both.
    // Blank DocNumber is filtered client-side (IS NULL / OR '' not supported).
    const q =
      `SELECT Id, TxnDate, DocNumber, TotalAmt, Balance, VendorRef, ` +
      `APAccountRef ` +
      `FROM Bill ` +
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
        `QBO Bill query failed: ${res.status} tid=${res.intuit_tid ?? "n/a"} ` +
          `query=${encodeURIComponent(q).slice(0, 200)} fault=${faultBody}`,
      );
    }
    lastTid = res.intuit_tid;
    const page = (res.json?.QueryResponse?.Bill ?? []) as Array<{
      Id: string;
      TxnDate: string;
      DocNumber?: string;
      TotalAmt?: number;
      Balance?: number | null;
      VendorRef?: { value?: string; name?: string };
      APAccountRef?: { value?: string };
      // Note: TxnTaxDetail / LinkedTxn are NOT returned by the Bill list query
      // (QBO 4001 if you try to SELECT them). Enriched via fetchQboBillById.
    }>;
    for (const b of page) {
      // GRNI convention: Bill no. (DocNumber) left blank. QBO omits the field
      // when null — treat missing / whitespace-only as unbilled.
      const doc = b.DocNumber;
      const docBlank =
        doc === undefined || doc === null || String(doc).trim() === "";
      if (!docBlank) continue;
      const totalAmt = b.TotalAmt ?? 0;
      const totalCents = Math.round(totalAmt * 100);
      const balance = b.Balance ?? 0;
      const balanceCents = Math.round(balance * 100);
      // Skip zero-amount bills (data entry in progress / draft) and
      // zero-balance bills (already fully paid — not really "unbilled"
      // GRNI, would be a data-quality anomaly given DocNumber is blank).
      if (totalCents <= 0) continue;
      if (balanceCents <= 0) continue;
      // Enrich via single-Bill GET to pull TxnTaxDetail (real pre-tax
      // subtotal) + LinkedTxn (PO linkage evidence). If enrichment fails
      // for this row, fall back to list-query values with an error string.
      const enriched = await fetchQboBillById({
        realmId,
        accessToken,
        billId: b.Id,
      });
      let subtotalCents = totalCents;
      let linkedPoIds: string[] = [];
      let enrichmentError: string | null = null;
      if (enriched.ok) {
        const taxAmt = enriched.bill.TxnTaxDetail?.TotalTax ?? 0;
        // Prefer enriched TotalAmt if returned (should always match list
        // value; guarded for defensive parity).
        const enrichedTotalAmt = enriched.bill.TotalAmt ?? totalAmt;
        const preTax = Math.round((enrichedTotalAmt - taxAmt) * 100);
        subtotalCents = preTax > 0 ? preTax : totalCents;
        linkedPoIds =
          enriched.bill.LinkedTxn?.filter((lt) => lt.TxnType === "PurchaseOrder")
            .map((lt) => lt.TxnId)
            .filter((id): id is string => typeof id === "string" && id.length > 0)
            ?? [];
      } else {
        enrichmentError = enriched.reason;
      }
      bills.push({
        bill_id: b.Id,
        txn_date: b.TxnDate,
        vendor_ref: b.VendorRef?.value ?? null,
        vendor_display_name: b.VendorRef?.name ?? null,
        ap_account_ref: b.APAccountRef?.value ?? null,
        total_cents: totalCents,
        subtotal_cents: subtotalCents,
        balance_cents: balanceCents,
        doc_number: b.DocNumber ?? null,
        linked_po_ids: linkedPoIds,
        enrichment_error: enrichmentError,
      });
    }
    if (page.length < pageSize) break;
    startPos += pageSize;
    if (startPos > 50000) break; // hard safety stop
  }
  // GRNI reports pre-tax — aggregate subtotal_cents.
  const total = bills.reduce((s, b) => s + b.subtotal_cents, 0);
  return {
    as_of_date: asOfDate,
    bills,
    total_cents: total,
    raw_query_url: lastUrl,
    intuit_tid: lastTid,
  };
}
