// lib/audit-ready/tie-out/basis.ts
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

export type AccountingBasis = "Accrual" | "Cash";

const NORMALIZE: Record<string, AccountingBasis> = {
  accrual: "Accrual",
  Accrual: "Accrual",
  cash: "Cash",
  Cash: "Cash",
};

/**
 * Resolve the accounting basis (Accrual or Cash) for a given engagement.
 * Reads `firm_clients.accounting_method` and normalizes to QBO's API form.
 *
 * Fallback: Accrual — the QBO default and the safer choice when the value
 * is missing or unrecognized (Accrual reports a superset of Cash's ledger
 * activity, so it will not silently drop transactions the way Cash could).
 * A warning is logged when the fallback fires so operators can audit
 * mis-configured clients.
 */
export async function resolveAccountingBasis(params: {
  engagementId: string;
}): Promise<AccountingBasis> {
  const admin = getSupabaseAdmin();
  const { data: eng, error: engErr } = await admin
    .from("audit_ready_engagements")
    .select("firm_client_id, company_id")
    .eq("id", params.engagementId)
    .single();
  if (engErr || !eng) {
    console.warn(
      `[basis] engagement ${params.engagementId} not found (${engErr?.message ?? "no row"}); defaulting to Accrual`,
    );
    return "Accrual";
  }
  let firmClientId: string | null = eng.firm_client_id as string | null;
  if (!firmClientId && eng.company_id) {
    const { data: fc, error: fcErr } = await admin
      .from("firm_clients")
      .select("id")
      .eq("company_id", eng.company_id)
      .limit(1)
      .maybeSingle();
    if (fcErr) {
      console.warn(
        `[basis] company_id -> firm_client lookup failed for engagement ${params.engagementId}: ${fcErr.message}; defaulting to Accrual`,
      );
      return "Accrual";
    }
    firmClientId = (fc?.id as string | undefined) ?? null;
  }
  if (!firmClientId) {
    console.warn(
      `[basis] engagement ${params.engagementId} has no firm_client resolution; defaulting to Accrual`,
    );
    return "Accrual";
  }
  const { data: fcRow, error: fcRowErr } = await admin
    .from("firm_clients")
    .select("accounting_method")
    .eq("id", firmClientId)
    .single();
  if (fcRowErr || !fcRow) {
    console.warn(
      `[basis] firm_client ${firmClientId} row load failed (${fcRowErr?.message ?? "no row"}); defaulting to Accrual`,
    );
    return "Accrual";
  }
  const raw = (fcRow.accounting_method ?? "").trim();
  const normalized = NORMALIZE[raw];
  if (!normalized) {
    console.warn(
      `[basis] firm_client ${firmClientId} has unrecognized accounting_method='${raw}'; defaulting to Accrual`,
    );
    return "Accrual";
  }
  return normalized;
}
