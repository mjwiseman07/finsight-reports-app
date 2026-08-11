import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccuracyContract,
  ChainReceipt,
  CompositionRow,
  ComputationStatus,
  FormulaNode,
  KpiCode,
  Unit,
} from "./types";

export type CacheKey = {
  companyId: string;
  kpiCode: KpiCode;
  period: string;
  accountingSyncsId: string;
};

type CachedCompositionJson = {
  rows?: CompositionRow[];
  totals?: AccuracyContract["totals"];
  freshness?: AccuracyContract["freshness"];
};

type CachedFormulaJson = FormulaNode | { kind: "null"; label?: string };

export async function readCachedContract(
  admin: SupabaseClient,
  key: CacheKey,
): Promise<AccuracyContract | null> {
  const { data, error } = await admin
    .from("accuracy_contract_cache")
    .select("*")
    .eq("company_id", key.companyId)
    .eq("kpi_code", key.kpiCode)
    .eq("period", key.period)
    .eq("accounting_syncs_id", key.accountingSyncsId)
    .maybeSingle();

  if (error || !data) return null;

  const formulaJson = data.formula_json as CachedFormulaJson | null;
  const compositionJson = data.composition_json as CachedCompositionJson | null;
  const formulaLabel =
    formulaJson && "label" in formulaJson && typeof formulaJson.label === "string"
      ? formulaJson.label
      : null;

  return {
    kpi_code: data.kpi_code as KpiCode,
    kpi_label: formulaLabel ?? (data.kpi_code as string),
    kpi_value_numeric: data.kpi_value_numeric as number | null,
    kpi_value_display: data.kpi_value_display as string,
    unit: data.unit as Unit,
    period: data.period as string,
    computation_status: data.computation_status as ComputationStatus,
    formula:
      formulaJson && formulaJson.kind !== "null"
        ? (formulaJson as FormulaNode)
        : null,
    composition: compositionJson?.rows ?? [],
    totals: compositionJson?.totals ?? {
      total_from_composition: null,
      reported_by_provider: null,
      variance: null,
      variance_note: null,
    },
    chain_receipt: data.chain_receipt_json as ChainReceipt,
    freshness: compositionJson?.freshness ?? {
      latest_chain_seq_for_company: 0,
      receipt_chain_seq: 0,
      is_stale: false,
      latest_sync_at: null,
    },
    cache: { hit: true, computed_at: data.computed_at as string },
  };
}

export async function writeCachedContract(
  admin: SupabaseClient,
  key: CacheKey,
  contract: AccuracyContract,
): Promise<void> {
  const payload = {
    company_id: key.companyId,
    kpi_code: key.kpiCode,
    period: key.period,
    accounting_syncs_id: key.accountingSyncsId,
    kpi_value_numeric: contract.kpi_value_numeric,
    kpi_value_display: contract.kpi_value_display,
    unit: contract.unit,
    computation_status: contract.computation_status,
    formula_json: contract.formula ?? { kind: "null" },
    composition_json: {
      rows: contract.composition,
      totals: contract.totals,
      freshness: contract.freshness,
    },
    provenance_json: {
      composition_pointers: contract.composition.map((r) => r.source),
    },
    chain_receipt_json: contract.chain_receipt,
    computed_at: contract.cache.computed_at,
  };

  const { error } = await admin.from("accuracy_contract_cache").upsert(payload, {
    onConflict: "company_id,kpi_code,period,accounting_syncs_id",
  });

  if (error) {
    console.error("[accuracy-contract-cache] write failed", {
      key,
      error: error.message,
    });
  }
}
