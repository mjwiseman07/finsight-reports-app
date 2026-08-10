import type { SupabaseClient } from '@supabase/supabase-js';
import { factorizeKpi } from './kpi-factorization';
import type { AccuracyContract, ChainReceipt, KpiCode } from './types';

export type ComposeAccuracyContractParams = {
  admin: SupabaseClient;
  companyId: string;
  industryType: string;
  kpiCode: KpiCode;
  period: string;
};

export async function composeAccuracyContract(
  params: ComposeAccuracyContractParams,
): Promise<{
  contract: AccuracyContract;
  accountingSyncsId: string;
  syncCompletedEventId: string | null;
}> {
  const { admin, companyId, industryType, kpiCode, period } = params;

  const { data: candidates, error: syncErr } = await admin
    .from('accounting_syncs')
    .select(
      'id, normalized_payload, report_period_start, report_period_end, last_synced_at',
    )
    .eq('company_id', companyId)
    .order('last_synced_at', { ascending: false })
    .limit(20);

  if (syncErr) throw new Error(`accounting_syncs_query_failed: ${syncErr.message}`);
  if (!candidates || candidates.length === 0) {
    throw Object.assign(new Error('no_sync_for_company'), { httpStatus: 404 });
  }

  const [yearStr, monthStr] = period.split('-');
  const periodStart = new Date(`${yearStr}-${monthStr ?? '01'}-01T00:00:00Z`);
  const anchored =
    candidates.find(
      (c) =>
        new Date(c.report_period_start) <= periodStart &&
        new Date(c.report_period_end) >= periodStart,
    ) || candidates[0];

  const payload =
    anchored.normalized_payload as Parameters<typeof factorizeKpi>[2];
  const factor = factorizeKpi(kpiCode, industryType, payload);

  const receipt = await lookupChainReceipt(admin, {
    companyId,
    accountingSyncsId: anchored.id as string,
  });

  const { data: latestRow } = await admin
    .from('pilot_lifecycle_events')
    .select('chain_seq')
    .eq('company_id', companyId)
    .order('chain_seq', { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestChainSeq =
    (latestRow?.chain_seq as number | undefined) ?? receipt.chain_seq;

  const totalFromComposition = factor.composition.reduce(
    (s, r) => s + (r.amount || 0),
    0,
  );
  const variance =
    factor.reported_by_provider !== null && factor.numeric !== null
      ? factor.reported_by_provider - factor.numeric
      : null;

  const contract: AccuracyContract = {
    kpi_code: kpiCode,
    kpi_label: kpiLabel(kpiCode, industryType),
    kpi_value_numeric: factor.numeric,
    kpi_value_display: factor.display,
    unit: factor.unit,
    period,
    computation_status: factor.computation_status,
    formula: factor.formula,
    composition: factor.composition,
    totals: {
      total_from_composition: factor.numeric === null ? null : totalFromComposition,
      reported_by_provider: factor.reported_by_provider,
      variance,
      variance_note:
        variance !== null && Math.abs(variance) > 0.5
          ? 'Provider rollup differs from summed leaves — see composition tab'
          : null,
    },
    chain_receipt: receipt,
    freshness: {
      latest_chain_seq_for_company: latestChainSeq,
      receipt_chain_seq: receipt.chain_seq,
      is_stale: latestChainSeq > receipt.chain_seq,
      latest_sync_at: (anchored.last_synced_at as string | undefined) ?? null,
    },
    cache: { hit: false, computed_at: new Date().toISOString() },
  };

  return {
    contract,
    accountingSyncsId: anchored.id as string,
    syncCompletedEventId: receipt.event_id,
  };
}

function kpiLabel(kpi: KpiCode, industryType: string): string {
  switch (kpi) {
    case 'cash_position': return 'Cash Position';
    case 'net_profit_margin': return 'Net Profit Margin';
    case 'net_op_cash_flow': return 'Net Op Cash Flow (T12M)';
    case 'ar_aging': return 'AR Aging Exposure';
    case 'north_star': return `${industryType} north star`;
  }
}

async function lookupChainReceipt(
  admin: SupabaseClient,
  args: { companyId: string; accountingSyncsId: string },
): Promise<ChainReceipt> {
  const { data: syncEvt, error: evtErr } = await admin
    .from('pilot_lifecycle_events')
    .select('id, chain_seq, row_hash, prev_hash, created_at, event_kind')
    .eq('company_id', args.companyId)
    .eq('event_kind', 'pilot.lifecycle.accounting-sync-completed')
    .filter('payload->>sync_id', 'eq', args.accountingSyncsId)
    .order('chain_seq', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (evtErr) throw new Error(`chain_receipt_lookup_failed: ${evtErr.message}`);
  if (!syncEvt) {
    throw Object.assign(new Error('no_receipt_for_sync'), {
      httpStatus: 409,
      detail: {
        companyId: args.companyId,
        accountingSyncsId: args.accountingSyncsId,
      },
    });
  }

  const { count } = await admin
    .from('pilot_lifecycle_events')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', args.companyId)
    .lte('chain_seq', syncEvt.chain_seq as number);

  return {
    event_id: syncEvt.id as string,
    chain_seq: syncEvt.chain_seq as number,
    company_chain_ordinal: count ?? 0,
    row_hash: syncEvt.row_hash as string,
    prev_hash: (syncEvt.prev_hash as string | null) ?? null,
    minted_at: syncEvt.created_at as string,
    event_kind: syncEvt.event_kind as string,
    anchor_status: 'not_anchored',
    anchor_tsr_url: null,
  };
}
