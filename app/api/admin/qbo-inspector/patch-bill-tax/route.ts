// File: app/api/admin/qbo-inspector/patch-bill-tax/route.ts
//
// Super-admin only. Patches a QBO Bill with a real TxnTaxDetail.TotalTax
// so V11.2 (pre-tax subtotal on taxed Bill) can be smoke-tested end-to-end
// without wrestling with QBO's UI (Automated Sales Tax doesn't apply to
// vendor Bills; manual mode isn't exposed in modern sandboxes).
//
// This endpoint intentionally does NOT create Bills — it only patches
// an existing Bill's tax detail. Bill creation belongs to the seed script.
import { NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security";
import { resolveQBOTokenForFirmClient } from "@/lib/erp/quickbooks/token-resolver";
import { qboApiFetch } from "@/lib/qbo/api-fetch.js";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function qboBaseUrl(): string {
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

interface Body {
  firm_client_id?: string;
  bill_id?: string;
  tax_amount_cents?: number;
  dry_run?: boolean;
}

interface QboFaultError {
  Message?: string;
  Detail?: string;
  code?: string;
}

function faultBody(json: unknown): string {
  const errs = (json as { Fault?: { Error?: QboFaultError[] } })?.Fault?.Error;
  if (!Array.isArray(errs)) return "";
  return errs
    .map(
      (e) => `[${e.code ?? "?"}] ${e.Message ?? ""} :: ${e.Detail ?? ""}`,
    )
    .join(" | ");
}

export async function POST(request: Request) {
  const rl = rateLimit(request, {
    key: "admin-qbo-inspector-patch-bill-tax",
    limit: 3,
    windowMs: 60_000,
  });
  if (rl) return rl;

  const access = (await resolveSuperAdminAccess(request)) as {
    response?: NextResponse;
    userId?: string;
    email?: string;
  };
  if (access.response) return access.response;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { firm_client_id, bill_id, tax_amount_cents } = body;
  const dry_run = Boolean(body.dry_run);

  if (!firm_client_id || typeof firm_client_id !== "string") {
    return NextResponse.json(
      { error: "missing_firm_client_id" },
      { status: 400 },
    );
  }
  if (!bill_id || typeof bill_id !== "string") {
    return NextResponse.json({ error: "missing_bill_id" }, { status: 400 });
  }
  if (
    typeof tax_amount_cents !== "number" ||
    !Number.isFinite(tax_amount_cents) ||
    tax_amount_cents <= 0
  ) {
    return NextResponse.json(
      { error: "tax_amount_cents_must_be_positive_number" },
      { status: 400 },
    );
  }

  const token = await resolveQBOTokenForFirmClient(firm_client_id);
  if (!token) {
    return NextResponse.json(
      { error: "no_qbo_token", firm_client_id },
      { status: 404 },
    );
  }
  const { accessToken, realmId } = token;

  // Step 1: GET Bill by id — capture SyncToken, Line[], existing state.
  const billUrl =
    `${qboBaseUrl()}/v3/company/${encodeURIComponent(realmId)}` +
    `/bill/${encodeURIComponent(bill_id)}?minorversion=65`;
  const billRes = await qboApiFetch(billUrl, { accessToken, method: "GET" });
  if (!billRes.ok) {
    return NextResponse.json(
      {
        error: "bill_get_failed",
        status: billRes.status,
        intuit_tid: billRes.intuit_tid,
        fault: faultBody(billRes.json),
      },
      { status: 500 },
    );
  }
  const bill = (billRes.json as { Bill?: Record<string, unknown> })?.Bill;
  if (!bill) {
    return NextResponse.json(
      { error: "bill_not_returned", intuit_tid: billRes.intuit_tid },
      { status: 404 },
    );
  }

  const syncToken = String(bill.SyncToken ?? "");
  const existingLines = (bill.Line as unknown[]) ?? [];
  const prevTotalAmt = Number(bill.TotalAmt ?? 0);
  const prevTxnTax = bill.TxnTaxDetail as
    | { TotalTax?: number }
    | undefined;
  const prevTotalTaxCents = Math.round(Number(prevTxnTax?.TotalTax ?? 0) * 100);
  const prevTotalCents = Math.round(prevTotalAmt * 100);

  // Step 2: Discover a usable TaxCode with a Sales rate > 0.
  const taxCodeQuery =
    `SELECT * FROM TaxCode WHERE Active = true STARTPOSITION 1 MAXRESULTS 100`;
  const taxCodeUrl =
    `${qboBaseUrl()}/v3/company/${encodeURIComponent(realmId)}/query` +
    `?query=${encodeURIComponent(taxCodeQuery)}&minorversion=65`;
  const tcRes = await qboApiFetch(taxCodeUrl, { accessToken, method: "GET" });
  if (!tcRes.ok) {
    return NextResponse.json(
      {
        error: "taxcode_query_failed",
        status: tcRes.status,
        intuit_tid: tcRes.intuit_tid,
        fault: faultBody(tcRes.json),
      },
      { status: 500 },
    );
  }

  interface TaxRateRef {
    value?: string;
  }
  interface TaxRateDetail {
    TaxRateRef?: TaxRateRef;
    TaxTypeApplicable?: string;
    TaxOrder?: number;
  }
  interface TaxCode {
    Id?: string;
    Name?: string;
    Active?: boolean;
    Taxable?: boolean;
    SalesTaxRateList?: { TaxRateDetail?: TaxRateDetail[] };
  }

  const taxCodes: TaxCode[] =
    (tcRes.json as { QueryResponse?: { TaxCode?: TaxCode[] } })
      ?.QueryResponse?.TaxCode ?? [];

  // Preferred: any code named "State Sales Tax" (Automated Sales Tax
  // sandbox default). Fallback: any active taxable code with a sales rate.
  const pickCode = (): { code: TaxCode; rateRefId: string } | null => {
    const withSalesRate = taxCodes.filter((c) => {
      if (!c.Active) return false;
      const detail = c.SalesTaxRateList?.TaxRateDetail?.[0];
      return Boolean(detail?.TaxRateRef?.value);
    });
    const preferred = withSalesRate.find((c) =>
      /state sales tax/i.test(c.Name ?? ""),
    );
    const chosen = preferred ?? withSalesRate[0];
    if (!chosen) return null;
    const rateRefId =
      chosen.SalesTaxRateList?.TaxRateDetail?.[0]?.TaxRateRef?.value;
    if (!rateRefId) return null;
    return { code: chosen, rateRefId };
  };

  const picked = pickCode();
  if (!picked) {
    return NextResponse.json(
      {
        error: "no_usable_tax_code",
        detail: "No active TaxCode with a sales rate reference was found.",
        seen: taxCodes.map((c) => ({
          id: c.Id,
          name: c.Name,
          active: c.Active,
          has_sales_rate: Boolean(
            c.SalesTaxRateList?.TaxRateDetail?.[0]?.TaxRateRef?.value,
          ),
        })),
      },
      { status: 400 },
    );
  }

  // Step 3: Look up the rate percent for the chosen TaxRateRef.
  const rateUrl =
    `${qboBaseUrl()}/v3/company/${encodeURIComponent(realmId)}` +
    `/taxrate/${encodeURIComponent(picked.rateRefId)}?minorversion=65`;
  const rateRes = await qboApiFetch(rateUrl, { accessToken, method: "GET" });
  if (!rateRes.ok) {
    return NextResponse.json(
      {
        error: "taxrate_get_failed",
        status: rateRes.status,
        intuit_tid: rateRes.intuit_tid,
        fault: faultBody(rateRes.json),
      },
      { status: 500 },
    );
  }
  const taxRate =
    (rateRes.json as { TaxRate?: { RateValue?: number } })?.TaxRate;
  const ratePercent = Number(taxRate?.RateValue ?? 0);

  // Step 4: Build the PATCH body.
  const taxAmount = tax_amount_cents / 100;
  const netTaxable = prevTotalCents / 100; // treat the previous total as net-taxable base
  const patchBody = {
    Id: bill_id,
    SyncToken: syncToken,
    sparse: true,
    Line: existingLines,
    TxnTaxDetail: {
      TotalTax: taxAmount,
      TaxLine: [
        {
          Amount: taxAmount,
          DetailType: "TaxLineDetail",
          TaxLineDetail: {
            TaxRateRef: { value: picked.rateRefId },
            PercentBased: true,
            TaxPercent: ratePercent,
            NetAmountTaxable: netTaxable,
          },
        },
      ],
    },
  };

  if (dry_run) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      bill_id,
      prev_total_cents: prevTotalCents,
      prev_total_tax_cents: prevTotalTaxCents,
      tax_code_used: {
        id: picked.code.Id ?? null,
        name: picked.code.Name ?? null,
        rate_percent: ratePercent,
        tax_rate_ref_id: picked.rateRefId,
      },
      preview: patchBody,
      intuit_tid: rateRes.intuit_tid,
    });
  }

  // Step 5: POST the update.
  const updateUrl =
    `${qboBaseUrl()}/v3/company/${encodeURIComponent(realmId)}` +
    `/bill?operation=update&minorversion=65`;
  const updRes = await qboApiFetch(updateUrl, {
    accessToken,
    method: "POST",
    body: patchBody,
    extraHeaders: { Accept: "application/json" },
  });
  if (!updRes.ok) {
    return NextResponse.json(
      {
        error: "bill_patch_failed",
        status: updRes.status,
        intuit_tid: updRes.intuit_tid,
        fault: faultBody(updRes.json),
      },
      { status: 500 },
    );
  }

  const updated =
    (updRes.json as { Bill?: Record<string, unknown> })?.Bill ?? {};
  const newTotalAmt = Number(updated.TotalAmt ?? 0);
  const newTxnTax = updated.TxnTaxDetail as
    | { TotalTax?: number }
    | undefined;
  const newTotalTaxCents = Math.round(Number(newTxnTax?.TotalTax ?? 0) * 100);

  return NextResponse.json({
    ok: true,
    bill_id,
    prev_total_cents: prevTotalCents,
    prev_total_tax_cents: prevTotalTaxCents,
    new_total_cents: Math.round(newTotalAmt * 100),
    new_total_tax_cents: newTotalTaxCents,
    tax_code_used: {
      id: picked.code.Id ?? null,
      name: picked.code.Name ?? null,
      rate_percent: ratePercent,
      tax_rate_ref_id: picked.rateRefId,
    },
    intuit_tid: updRes.intuit_tid,
  });
}
