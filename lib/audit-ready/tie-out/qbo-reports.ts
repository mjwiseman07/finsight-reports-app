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
    group?: string;
    ColData?: Array<{ value?: string; id?: string }>;
    Rows?: { Row?: unknown[] };
    Summary?: unknown;
  }) => {
    // QBO TrialBalance leaf rows arrive WITHOUT a `type` field
    // (only Section / Header parent rows have a type). Include any row
    // that has ColData, no nested Rows, and is not explicitly a
    // Section/Header. This mirrors the layout QBO returns at
    // minorversion 65/75 in sandbox and production.
    const isLeaf =
      Array.isArray(r.ColData) &&
      !(r.Rows && Array.isArray(r.Rows.Row) && r.Rows.Row.length > 0) &&
      r.type !== "Section" &&
      r.type !== "Header";
    if (isLeaf) {
      const cols = r.ColData ?? [];
      // TrialBalance layout: [Account, Debit, Credit]
      const acct = cols[0];
      // Only ingest rows that actually resolve to a QBO account id.
      // This excludes summary/subtotal leaves that carry the same
      // ColData shape but no id.
      if (acct?.id) {
        const debit = parseFloat(
          String(cols[1]?.value ?? "0").replace(/,/g, ""),
        );
        const credit = parseFloat(
          String(cols[2]?.value ?? "0").replace(/,/g, ""),
        );
        const debit_cents = Math.round((isNaN(debit) ? 0 : debit) * 100);
        const credit_cents = Math.round((isNaN(credit) ? 0 : credit) * 100);
        lines.push({
          account_ref: acct.id,
          account_name: acct.value ?? "(unknown account)",
          debit_cents,
          credit_cents,
          net_cents: debit_cents - credit_cents,
        });
      }
    }
    if (Array.isArray(r.Rows?.Row)) {
      (r.Rows!.Row as typeof rows).forEach(walk);
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

// ─────────────────────────────────────────────────────────────
// PBC-TIEOUT-4B.1: CompanyInfo, Account list, GL Detail
// ─────────────────────────────────────────────────────────────

export type QboCompanyInfo = {
  companyName: string;
  fiscalYearStartMonth: number; // 1-12
  legalName: string | null;
};

export async function fetchQboCompanyInfo(params: {
  realmId: string;
  accessToken: string;
}): Promise<QboCompanyInfo> {
  const url =
    `${qboBaseUrl()}/v3/company/${params.realmId}/companyinfo/${params.realmId}` +
    `?minorversion=75`;
  const res = await qboApiFetch(url, {
    accessToken: params.accessToken,
    method: "GET",
  });
  if (!res.ok) {
    throw new Error(
      `fetchQboCompanyInfo failed: ${res.status} ${res.text}`,
    );
  }
  const json = res.json as {
    CompanyInfo?: {
      CompanyName?: string;
      LegalName?: string;
      FiscalYearStartMonth?: string;
    };
  };
  const monthName = json.CompanyInfo?.FiscalYearStartMonth || "January";
  const monthIdx =
    [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ].indexOf(monthName.toLowerCase()) + 1;
  return {
    companyName: json.CompanyInfo?.CompanyName || "",
    legalName: json.CompanyInfo?.LegalName || null,
    fiscalYearStartMonth: monthIdx > 0 ? monthIdx : 1,
  };
}

export type QboAccountListEntry = {
  id: string;
  name: string;
  fullyQualifiedName: string;
  accountType: string;
  accountSubType: string | null;
  classification: string; // Asset | Liability | Equity | Revenue | Expense
  currentBalance: number | null;
  active: boolean;
  /** True when QBO SubAccount flag is set (has a ParentRef). */
  isSubAccount: boolean;
  /** Parent account Id when this is a sub-account; otherwise null. */
  parentAccountId: string | null;
  /**
   * True when at least one other active BS account lists this Id as
   * ParentRef. Rollup parents' GL balances already include children —
   * FA roll-forward must skip them to avoid double-counting.
   */
  isRollupParent: boolean;
};

/**
 * A single detail line from the QBO BalanceSheet report.
 *
 * Balance sheet reports rows in a nested Section/Header/Detail/Summary
 * grammar. We flatten to the detail lines only and preserve QBO's own
 * row order via `sortOrder`. Detail rows always carry a natural-sign
 * balance in cents.
 *
 * Some lines are "computed" — QBO emits them under Equity as summary
 * outputs of the report engine (most notably "Net Income" = P&L net
 * over the report period). They have no underlying account; we mark
 * them with `isComputedLine=true` and `qboAccountId=null` and pass
 * them through to the summary as tautologically-tied rows.
 */
export type QboBalanceSheetLine = {
  qboAccountId: string | null;
  qboAccountName: string;
  qboAccountType: string | null;
  classification: "Asset" | "Liability" | "Equity";
  balanceCents: number;
  isComputedLine: boolean;
  parentAccountId: string | null;
  sortOrder: number;
};

export type QboBalanceSheetReportResult = {
  asOfDate: string;
  accountingMethod: "Accrual" | "Cash";
  lines: QboBalanceSheetLine[];
};

/**
 * QBO Account.query returns AccountType in **display form with spaces**
 * on minorversions we currently target (e.g. "Fixed Asset",
 * "Accounts Receivable", "Other Current Liability"). We keep the
 * enum-token (no-space) forms too so that a future switch to a
 * minorversion that returns tokenized types (e.g. "FixedAsset") does
 * not silently regress. Both forms are treated as balance-sheet.
 */
const BS_ACCOUNT_TYPES = new Set([
  // Display form (what QBO sandbox returns at minorversion 65/75)
  "Bank",
  "Accounts Receivable",
  "Other Current Asset",
  "Fixed Asset",
  "Other Asset",
  "Accounts Payable",
  "Credit Card",
  "Other Current Liability",
  "Long Term Liability",
  "Equity",
  // Enum-token form (defensive; some minorversions may return this)
  "AccountsReceivable",
  "OtherCurrentAsset",
  "FixedAsset",
  "OtherAsset",
  "AccountsPayable",
  "CreditCard",
  "OtherCurrentLiability",
  "LongTermLiability",
]);

/**
 * QBO Account.query returns AccountType as enum tokens without spaces
 * (e.g. FixedAsset). Display-form "Fixed Asset" is tolerated defensively.
 */
export const FA_COST_ACCOUNT_TYPES = new Set(["FixedAsset", "Fixed Asset"]);

export const FA_ACCUM_DEPR_SUBTYPES = new Set([
  "AccumulatedDepreciation",
  "AccumulatedAmortization",
]);

export function isFaCostAccountType(accountType: string): boolean {
  return FA_COST_ACCOUNT_TYPES.has(accountType);
}

export function isFaAccumDeprSubType(accountSubType: string | null): boolean {
  return FA_ACCUM_DEPR_SUBTYPES.has(accountSubType ?? "");
}

export async function fetchQboAccountList(params: {
  realmId: string;
  accessToken: string;
}): Promise<QboAccountListEntry[]> {
  const query =
    "SELECT Id, Name, FullyQualifiedName, AccountType, AccountSubType, Classification, CurrentBalance, Active, SubAccount, ParentRef FROM Account WHERE Active = true STARTPOSITION 1 MAXRESULTS 1000";
  const url =
    `${qboBaseUrl()}/v3/company/${params.realmId}/query` +
    `?query=${encodeURIComponent(query)}&minorversion=75`;
  const res = await qboApiFetch(url, {
    accessToken: params.accessToken,
    method: "GET",
  });
  if (!res.ok) {
    throw new Error(
      `fetchQboAccountList failed: ${res.status} ${res.text}`,
    );
  }
  const json = res.json as {
    QueryResponse?: {
      Account?: Array<{
        Id: string;
        Name: string;
        FullyQualifiedName: string;
        AccountType: string;
        AccountSubType?: string;
        Classification?: string;
        CurrentBalance?: number;
        Active?: boolean;
        SubAccount?: boolean;
        ParentRef?: { value?: string; name?: string };
      }>;
    };
  };
  const rows = json.QueryResponse?.Account ?? [];
  const mapped = rows
    .filter((r) => BS_ACCOUNT_TYPES.has(r.AccountType))
    .map((r) => {
      const parentAccountId = r.ParentRef?.value ?? null;
      const isSubAccount = r.SubAccount === true || parentAccountId != null;
      return {
        id: r.Id,
        name: r.Name,
        fullyQualifiedName: r.FullyQualifiedName,
        accountType: r.AccountType,
        accountSubType: r.AccountSubType ?? null,
        classification: r.Classification ?? "",
        currentBalance: r.CurrentBalance ?? null,
        active: r.Active !== false,
        isSubAccount,
        parentAccountId,
        isRollupParent: false,
      };
    });
  const rollupParentIds = new Set<string>();
  for (const a of mapped) {
    if (a.parentAccountId) rollupParentIds.add(a.parentAccountId);
  }
  return mapped.map((a) => ({
    ...a,
    isRollupParent: rollupParentIds.has(a.id),
  }));
}

export type QboGlActivityRow = {
  txnDate: string | null; // yyyy-mm-dd
  txnType: string | null;
  docNumber: string | null;
  name: string | null;
  memo: string | null;
  splitAccount: string | null;
  debitCents: number;
  creditCents: number;
  netCents: number; // signed = debit - credit
  runningBalanceCents: number | null; // as reported by QBO (Native); null when the Balance column was empty for this row (distinct from a legit zero balance)
  txnRef: string | null;
};

export type QboGlDetailResult = {
  beginningBalanceCents: number;
  endingBalanceCents: number;
  activity: QboGlActivityRow[];
  reportUrl: string;
  intuitTid: string | null;
};

/**
 * Pure parser for a QBO GeneralLedger report response body. Split out from
 * fetchQboGeneralLedgerDetail so it can be unit-tested without network mocking.
 *
 * Contract:
 *   - Walks the report's row tree, collecting Data rows into activity[].
 *   - Ignores "Beginning Balance" data rows (extracts beginningBalanceCents from
 *     the Balance column) and any "Total for ..." rows.
 *   - Preserves the distinction between "Balance column was empty" (null) and
 *     "balance is legitimately zero" (0). This matters for endingBalanceCents:
 *     an account that pays down to exactly zero must report ending=0, not the
 *     prior non-zero running balance.
 *   - endingBalanceCents priority:
 *       1. If any activity row has runningBalanceCents !== null, use the LAST
 *          such row's value (walking from the end forward).
 *       2. Else if there is activity, use beginningBalanceCents + sum(netCents).
 *       3. Else use beginningBalanceCents.
 */
export function parseQboGlDetailReport(json: {
  Rows?: { Row?: unknown[] };
  Columns?: { Column?: Array<{ ColTitle: string }> };
}): {
  beginningBalanceCents: number;
  endingBalanceCents: number;
  activity: QboGlActivityRow[];
} {
  const cols = json.Columns?.Column ?? [];
  const colIdx = (title: string) =>
    cols.findIndex((c) => c.ColTitle?.toLowerCase() === title.toLowerCase());
  const iDate = colIdx("Date");
  const iType = colIdx("Transaction Type");
  const iDoc = colIdx("Num");
  const iName = colIdx("Name");
  const iMemo = colIdx("Memo/Description");
  const iSplit = colIdx("Split");
  // QBO returns either separate Debit/Credit columns OR a signed "Amount" column
  // depending on the column codes requested. With subt_nat_amount we get "Amount".
  const iDebit = colIdx("Debit");
  const iCredit = colIdx("Credit");
  const iAmount = colIdx("Amount");
  const iBalance = colIdx("Balance");
  const activity: QboGlActivityRow[] = [];
  let beginningBalanceCents = 0;
  const toCents = (v: unknown): number => {
    if (v === null || v === undefined || v === "") return 0;
    const n = parseFloat(String(v).replace(/,/g, ""));
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100);
  };
  const getCol = (
    row: { ColData?: Array<{ value?: string; id?: string }> },
    i: number,
  ) =>
    i >= 0 && row.ColData && row.ColData[i]
      ? row.ColData[i]
      : { value: "", id: "" };
  type QboRow = {
    type?: string;
    group?: string;
    ColData?: Array<{ value?: string; id?: string }>;
    Header?: { ColData?: Array<{ value?: string }> };
    Summary?: { ColData?: Array<{ value?: string }> };
    Rows?: { Row?: QboRow[] };
  };
  const walk = (node: QboRow | undefined) => {
    if (!node) return;
    if (node.type === "Data" && node.ColData) {
      const dateCell = getCol(node, iDate).value || "";
      const typeCell = getCol(node, iType).value || "";
      const isBeginning =
        /beginning balance/i.test(typeCell) ||
        /beginning balance/i.test(dateCell);
      const isTotal =
        /total for/i.test(typeCell) || /total for/i.test(dateCell);
      if (isBeginning) {
        beginningBalanceCents = toCents(getCol(node, iBalance).value);
        return;
      }
      if (isTotal) return;
      // Distinguish "Balance column empty" (null) from "balance is legitimately 0".
      // toCents() collapses both cases to the number 0, so we inspect the raw
      // cell value BEFORE coercion.
      const balanceCell = getCol(node, iBalance);
      const balanceRaw = balanceCell.value;
      const hasBalance =
        balanceRaw !== undefined &&
        balanceRaw !== null &&
        String(balanceRaw).trim() !== "";
      const runningBalanceCents = hasBalance ? toCents(balanceRaw) : null;
      const txnRef = getCol(node, iType).id || null;
      let debitCents = 0;
      let creditCents = 0;
      let netCents = 0;
      if (iDebit >= 0 || iCredit >= 0) {
        debitCents = toCents(getCol(node, iDebit).value);
        creditCents = toCents(getCol(node, iCredit).value);
        netCents = debitCents - creditCents;
      } else if (iAmount >= 0) {
        // Signed net amount from QBO. Split into debit/credit halves for
        // downstream reporting parity with the two-column layout.
        netCents = toCents(getCol(node, iAmount).value);
        if (netCents >= 0) {
          debitCents = netCents;
        } else {
          creditCents = -netCents;
        }
      }
      activity.push({
        txnDate: /^\d{4}-\d{2}-\d{2}$/.test(dateCell) ? dateCell : null,
        txnType: typeCell || null,
        docNumber: getCol(node, iDoc).value || null,
        name: getCol(node, iName).value || null,
        memo: getCol(node, iMemo).value || null,
        splitAccount: getCol(node, iSplit).value || null,
        debitCents,
        creditCents,
        netCents,
        runningBalanceCents,
        txnRef,
      });
    }
    // Do not treat Section Summary as authoritative for ending balance.
    // Some QBO column layouts leave the Balance column empty in the summary
    // and put net activity in the Amount column instead. Ending balance is
    // derived below from the last activity row's runningBalanceCents.
    node.Rows?.Row?.forEach(walk);
  };
  (json.Rows?.Row as QboRow[] | undefined)?.forEach(walk);
  // Ending balance: prefer the running balance of the LAST activity row that
  // reported a Balance column value (null-sentinel means "column empty").
  // A row whose runningBalanceCents === 0 is a legit zero balance and must be
  // honored (e.g. an account that paid down to zero during the period).
  // Fall back to beginning + sum(activity) only if no rows had a usable running
  // balance at all.
  let endingBalanceCents = 0;
  const lastWithRb = [...activity]
    .reverse()
    .find(
      (r) =>
        r.runningBalanceCents !== null &&
        Number.isFinite(r.runningBalanceCents),
    );
  if (lastWithRb && lastWithRb.runningBalanceCents !== null) {
    endingBalanceCents = lastWithRb.runningBalanceCents;
  } else if (activity.length > 0) {
    endingBalanceCents =
      beginningBalanceCents +
      activity.reduce((s, r) => s + r.netCents, 0);
  } else {
    endingBalanceCents = beginningBalanceCents;
  }
  return { beginningBalanceCents, endingBalanceCents, activity };
}

/**
 * Parse a QBO BalanceSheet report JSON payload into a flat, ordered list
 * of BalanceSheetLine detail rows. Pure function — no I/O, no side effects.
 * Structured this way so that unit tests replay from captured JSON fixtures
 * without hitting the network.
 *
 * QBO's BalanceSheet report grammar (minorversion 65-75):
 *   Rows.Row[] contains Section rows, Data rows (detail), and Summary rows.
 *   Sections nest recursively via Rows.Row. Section `group` values match
 *   "Assets" / "Liabilities" / "Equity" (and further sub-sections we walk
 *   through). Each detail Data row has ColData[0] = { id, value } for the
 *   account, ColData[last] = { value } for the balance (natural sign).
 *
 * Rules:
 *   - Emit only Data rows (`type === "Data"`) whose parent classification
 *     resolves to Asset / Liability / Equity.
 *   - Skip Section headers and Section summaries.
 *   - Skip the report's outer total row (`type === "Section"` at the top
 *     level with no `group`).
 *   - Computed Equity lines (Net Income, Net Loss, "Net Other Income", etc.)
 *     have empty or missing `ColData[0].id` — emit with qboAccountId=null,
 *     isComputedLine=true, and the account name from ColData[0].value.
 *   - Balance parsing: use the same empty-vs-zero preservation as GL Detail
 *     (empty string ≠ "0.00"; but on BS report both are legitimate zeros —
 *     we accept both as 0 cents. Unlike GL Detail we don't need the null
 *     distinction because ending-balance detection isn't a walk).
 */
export function parseQboBalanceSheetReport(json: {
  Header?: {
    ReportName?: string;
    ReportBasis?: string;
    StartPeriod?: string;
    EndPeriod?: string;
    Option?: Array<{ Name?: string; Value?: string }>;
  };
  Rows?: {
    Row?: QboBsRawRow[];
  };
}): QboBalanceSheetReportResult {
  const lines: QboBalanceSheetLine[] = [];

  // Resolve as-of date and accounting basis from the report Header.
  //
  // Modernized Reports API (post 2026-06-30 cutover) returns accounting
  // basis in `Header.ReportBasis` — a single top-level field with value
  // "Accrual" or "Cash". Pre-modernized API returned it in
  // `Header.Option[]` as `{ Name: "AccountingMethod", Value: "..." }`.
  //
  // We read ReportBasis first (canonical for current API), fall back to
  // the Option[] form (defense-in-depth for older QBO variants and older
  // fixtures), and finally default to Accrual with a diagnostic marker
  // so mis-decoded responses fail loudly in tests rather than silently
  // corrupting Cash-basis client reports.
  const endPeriod = json.Header?.EndPeriod ?? "";
  const reportBasis = json.Header?.ReportBasis;
  const optionAccountingMethod = (json.Header?.Option ?? []).find(
    (o) => (o.Name ?? "").toLowerCase() === "accountingmethod",
  )?.Value;
  const rawBasis = reportBasis ?? optionAccountingMethod ?? "";
  const accountingMethod: "Accrual" | "Cash" =
    rawBasis === "Cash" ? "Cash" : rawBasis === "Accrual" ? "Accrual" : "Accrual";
  if (rawBasis !== "Accrual" && rawBasis !== "Cash") {
    // Do not throw — parser stays pure and defensive. But surface it.
    // Tests assert this doesn't happen against real fixtures.
    console.warn(
      `[parseQboBalanceSheetReport] Unable to determine accounting basis from ReportBasis="${reportBasis ?? ""}" or Option.AccountingMethod="${optionAccountingMethod ?? ""}"; defaulting to Accrual`,
    );
  }

  // Same conversion as parseQboGlDetailReport (local there; duplicated here
  // so this pure parser stays self-contained).
  const toCents = (v: unknown): number => {
    if (v === null || v === undefined || v === "") return 0;
    const n = parseFloat(String(v).replace(/,/g, ""));
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100);
  };

  let cursor = 0;

  function classificationFromGroup(
    group: string,
  ): "Asset" | "Liability" | "Equity" | null {
    const g = group.trim().toLowerCase();
    // Top-level BS sections that QBO uses in the report grammar. Sub-sections
    // (e.g. "Bank Accounts", "Fixed Assets") inherit from the top ancestor
    // through the recursive walk below.
    //
    // Post June 30 2026 modernization, Section.group is often a camel/Pascal
    // token ("TotalAssets", "CurrentAssets", "FixedAssets", "BankAccounts")
    // rather than the display label "Assets". Match via includes("asset") so
    // those tokens classify correctly; leaf groups like "BankAccounts" /
    // "AR" inherit from their parent.
    if (g === "assets" || g.includes("asset")) return "Asset";
    if (g === "liabilities" || g.startsWith("liab") || g.includes("liabilit"))
      return "Liability";
    if (g === "equity" || g.includes("equity")) return "Equity";
    return null;
  }

  function walk(
    rows: QboBsRawRow[] | undefined,
    inheritedClass: "Asset" | "Liability" | "Equity" | null,
  ): void {
    if (!rows) return;
    for (const row of rows) {
      const rowType = row.type ?? "";
      // Section: recurse. Prefer the row's own `group` over inherited.
      if (rowType === "Section") {
        const groupClass = classificationFromGroup(row.group ?? "");
        const nextClass = groupClass ?? inheritedClass;
        // Some sections carry a Header (ColData with a group label) and
        // a nested Rows.Row[]. We only walk the nested rows; we never
        // emit the Header/Summary of a Section as a detail line.
        walk(row.Rows?.Row, nextClass);
        continue;
      }
      // Data: emit as a detail line under the inherited classification.
      if (rowType === "Data") {
        if (inheritedClass == null) continue; // outside BS classification
        const cols = row.ColData ?? [];
        if (cols.length < 2) continue;
        const idRaw = cols[0]?.id;
        const nameRaw = cols[0]?.value ?? "";
        const balRaw = cols[cols.length - 1]?.value ?? "";
        const qboAccountId =
          idRaw !== undefined && idRaw !== null && String(idRaw).trim() !== ""
            ? String(idRaw)
            : null;
        const balanceCents = toCents(balRaw);
        const isComputed = qboAccountId === null;
        lines.push({
          qboAccountId,
          qboAccountName: String(nameRaw).trim(),
          qboAccountType: null, // Not returned in BS report Data rows; set from CoA if needed later.
          classification: inheritedClass,
          balanceCents,
          isComputedLine: isComputed,
          parentAccountId: null, // BS report doesn't carry ParentRef; we rely on QBO's own rollup.
          sortOrder: cursor++,
        });
        continue;
      }
      // Anything else (Summary, etc.) is skipped.
    }
  }

  walk(json.Rows?.Row, null);

  return {
    asOfDate: endPeriod,
    accountingMethod,
    lines,
  };
}

/**
 * Row shape used by the BS parser. QBO's payload is loose — every field
 * may be absent — so we treat every property as optional in the type.
 */
type QboBsRawRow = {
  type?: string;
  group?: string;
  ColData?: Array<{ id?: string; value?: string }>;
  Rows?: {
    Row?: QboBsRawRow[];
  };
  Header?: {
    ColData?: Array<{ id?: string; value?: string }>;
  };
  Summary?: {
    ColData?: Array<{ id?: string; value?: string }>;
  };
};

/**
 * Fetch QBO BalanceSheet report as of a given date, on the specified
 * accounting basis. Returns the parsed report — a flat, ordered list
 * of BS detail lines including QBO-computed equity lines (Net Income).
 */
export async function fetchQboBalanceSheet(params: {
  realmId: string;
  accessToken: string;
  asOfDate: string; // yyyy-mm-dd — the point-in-time balance date
  accountingMethod: "Accrual" | "Cash";
}): Promise<QboBalanceSheetReportResult> {
  // QBO Reports API requires BOTH start_date AND end_date for BalanceSheet;
  // sending only one (or as_of_date alone) triggers QBO's default
  // date_macro="This Calendar Year-to-date" which silently clamps end_date
  // to today. start_date is functionally ignored for the balance calculation
  // (BS is cumulative from the beginning of ledger history) but syntactically
  // required. We send a sentinel "1900-01-01" to signal "from the beginning".
  // Verified against sandbox 2026-07-22 — probe F.
  //
  // Also note: as of QBO's June 30 2026 Reports API modernization cutover,
  // response row order and grouping may differ from pre-modernization
  // behavior. Our parser reads the Rows.Row grammar generically so this
  // does not affect us; but if a future QBO change breaks parsing, the
  // most likely culprits are Section.group case ("Assets" vs "ASSETS") and
  // the presence/absence of the outer Report Header wrapper.
  const url =
    `${qboBaseUrl()}/v3/company/${params.realmId}/reports/BalanceSheet` +
    `?start_date=1900-01-01` +
    `&end_date=${encodeURIComponent(params.asOfDate)}` +
    `&accounting_method=${encodeURIComponent(params.accountingMethod)}` +
    `&minorversion=75`;
  const res = await qboApiFetch(url, {
    accessToken: params.accessToken,
    method: "GET",
  });
  if (!res.ok) {
    throw new Error(
      `fetchQboBalanceSheet failed: ${res.status} ${res.text}`,
    );
  }
  return parseQboBalanceSheetReport(res.json as Parameters<typeof parseQboBalanceSheetReport>[0]);
}

/**
 * Fetch QBO GeneralLedger report for a single account over a date range.
 * Returns beginning balance, all activity rows, and ending balance (all in cents).
 */
export async function fetchQboGeneralLedgerDetail(params: {
  realmId: string;
  accessToken: string;
  accountId: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
}): Promise<QboGlDetailResult> {
  const columns = [
    "tx_date",
    "txn_type",
    "doc_num",
    "name",
    "memo",
    "split_acc",
    "subt_nat_amount",
    "rbal_nat_amount",
  ].join(",");
  // QBO GeneralLedger report does not accept `date_macro=Custom`.
  // Passing `start_date` + `end_date` implicitly defines a custom range;
  // `date_macro` must be omitted (only enumerated values like `Today`,
  // `LastMonth`, etc. are valid).
  const url =
    `${qboBaseUrl()}/v3/company/${params.realmId}/reports/GeneralLedger` +
    `?account=${params.accountId}` +
    `&start_date=${params.startDate}` +
    `&end_date=${params.endDate}` +
    `&columns=${columns}` +
    `&minorversion=75`;
  const res = await qboApiFetch(url, {
    accessToken: params.accessToken,
    method: "GET",
  });
  if (!res.ok) {
    throw new Error(
      `fetchQboGeneralLedgerDetail failed: ${res.status} ${res.text}`,
    );
  }
  const intuitTid = res.intuit_tid ?? null;
  const parsed = parseQboGlDetailReport(
    res.json as {
      Rows?: { Row?: unknown[] };
      Columns?: { Column?: Array<{ ColTitle: string }> };
    },
  );
  return {
    beginningBalanceCents: parsed.beginningBalanceCents,
    endingBalanceCents: parsed.endingBalanceCents,
    activity: parsed.activity,
    reportUrl: url,
    intuitTid,
  };
}
