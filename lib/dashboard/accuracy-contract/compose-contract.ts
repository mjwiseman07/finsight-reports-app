import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
  getAccountingPayloadSchemaVersion,
  persistedSyncNeedsSchemaRebuild,
} from '@/lib/integrations/accounting/payload-schema';
import { factorizeKpi } from './kpi-factorization';
import type { AccuracyContract, ChainReceipt, KpiCode } from './types';

/**
 * PR G — Accuracy Contract compose is sync-pinned.
 * Callers MUST supply the Scorecard / CanonicalFinancialContext syncId.
 * Independent last-N sync listing or first-candidate fallback selection is forbidden.
 *
 * Cache is an optimization only: pinned sync authority MUST be validated before
 * any cache read/return (see assertPinnedAccountingSyncAuthority).
 */
export type ComposeAccuracyContractParams = {
  admin: SupabaseClient;
  companyId: string;
  /** Required: authoritative accounting_syncs.id from Scorecard / active context. */
  syncId: string;
  /** Optional: fail closed if sync.connection_id does not match. */
  connectionId?: string | null;
  industryType: string;
  kpiCode: KpiCode;
  period: string;
};

export type PinnedAccountingSyncRow = {
  id: string;
  company_id: string;
  connection_id: string | null;
  validation_status: string | null;
  normalized_payload: unknown;
  report_period_start: string | null;
  report_period_end: string | null;
  last_synced_at: string | null;
  schemaVersion: number;
};

/** Monthly Accuracy Contract period key only (YYYY-MM). Ranges are later historical work. */
export function isValidAccuracyContractPeriod(period: string | null | undefined): boolean {
  return Boolean(period && /^\d{4}-\d{2}$/.test(period));
}

/**
 * Load the pinned sync and enforce company / connection / SUCCESS / schema / period.
 * Must run before cache read so cache cannot become an alternate trust path.
 */
export async function assertPinnedAccountingSyncAuthority(params: {
  admin: SupabaseClient;
  companyId: string;
  syncId: string;
  connectionId?: string | null;
  period: string;
}): Promise<PinnedAccountingSyncRow> {
  const syncId = String(params.syncId || '').trim();
  const companyId = String(params.companyId || '').trim();
  const connectionId = String(params.connectionId || '').trim();
  const period = String(params.period || '').trim();

  if (!syncId) {
    throw Object.assign(new Error('sync_id_required'), { httpStatus: 400 });
  }
  if (!isValidAccuracyContractPeriod(period)) {
    throw Object.assign(new Error('invalid_period'), {
      httpStatus: 400,
      detail: { period, expected: 'YYYY-MM' },
    });
  }

  const { data: anchored, error: syncErr } = await params.admin
    .from('accounting_syncs')
    .select(
      'id, company_id, connection_id, validation_status, normalized_payload, report_period_start, report_period_end, last_synced_at',
    )
    .eq('id', syncId)
    .limit(1)
    .maybeSingle();

  if (syncErr) throw new Error(`accounting_syncs_query_failed: ${syncErr.message}`);
  if (!anchored?.id) {
    throw Object.assign(new Error('sync_not_found'), {
      httpStatus: 404,
      detail: { syncId, companyId },
    });
  }
  if (String(anchored.company_id || '') !== companyId) {
    throw Object.assign(new Error('sync_company_mismatch'), {
      httpStatus: 409,
      detail: { syncId, companyId, syncCompanyId: anchored.company_id },
    });
  }
  if (connectionId && String(anchored.connection_id || '') !== connectionId) {
    throw Object.assign(new Error('sync_connection_mismatch'), {
      httpStatus: 409,
      detail: { syncId, connectionId, syncConnectionId: anchored.connection_id },
    });
  }
  if (String(anchored.validation_status || '') !== 'SUCCESS') {
    throw Object.assign(new Error('sync_not_success'), {
      httpStatus: 409,
      detail: { syncId, validation_status: anchored.validation_status },
    });
  }

  const schemaVersion = getAccountingPayloadSchemaVersion({
    normalizedData: anchored.normalized_payload as { schemaVersion?: number } | null,
    schemaVersion: Number(
      (anchored.normalized_payload as { schemaVersion?: number } | null | undefined)?.schemaVersion || 0,
    ),
  });
  if (persistedSyncNeedsSchemaRebuild(schemaVersion)) {
    throw Object.assign(new Error('sync_schema_stale'), {
      httpStatus: 409,
      detail: {
        syncId,
        schemaVersion,
        requiredSchemaVersion: ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
      },
    });
  }

  assertPeriodAlignedWithSync(period, {
    start: String(anchored.report_period_start || ''),
    end: String(anchored.report_period_end || ''),
  });

  return {
    id: String(anchored.id),
    company_id: String(anchored.company_id),
    connection_id: anchored.connection_id == null ? null : String(anchored.connection_id),
    validation_status: anchored.validation_status == null ? null : String(anchored.validation_status),
    normalized_payload: anchored.normalized_payload,
    report_period_start: anchored.report_period_start == null ? null : String(anchored.report_period_start),
    report_period_end: anchored.report_period_end == null ? null : String(anchored.report_period_end),
    last_synced_at: anchored.last_synced_at == null ? null : String(anchored.last_synced_at),
    schemaVersion,
  };
}

export async function composeAccuracyContract(
  params: ComposeAccuracyContractParams,
): Promise<{
  contract: AccuracyContract;
  accountingSyncsId: string;
  syncCompletedEventId: string | null;
}> {
  const { admin, companyId, industryType, kpiCode, period } = params;

  const anchored = await assertPinnedAccountingSyncAuthority({
    admin,
    companyId,
    syncId: params.syncId,
    connectionId: params.connectionId,
    period,
  });

  const payload =
    anchored.normalized_payload as Parameters<typeof factorizeKpi>[2];
  const factor = factorizeKpi(kpiCode, industryType, payload);

  const receipt = await lookupChainReceipt(admin, {
    companyId,
    accountingSyncsId: anchored.id,
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
      latest_sync_at: anchored.last_synced_at,
    },
    cache: { hit: false, computed_at: new Date().toISOString() },
  };

  return {
    contract,
    accountingSyncsId: anchored.id,
    syncCompletedEventId: receipt.event_id,
  };
}

/**
 * Period is a monthly display/cache key (YYYY-MM). It must align with the
 * pinned sync's report_period window — never select a different sync.
 */
export function assertPeriodAlignedWithSync(
  period: string,
  reportPeriod: { start: string; end: string },
): void {
  if (!isValidAccuracyContractPeriod(period)) {
    throw Object.assign(new Error('invalid_period'), {
      httpStatus: 400,
      detail: { period, expected: 'YYYY-MM' },
    });
  }
  const [yearStr, monthStr] = period.split('-');
  const periodStart = new Date(`${yearStr}-${monthStr}-01T00:00:00Z`);
  if (!Number.isFinite(periodStart.getTime())) {
    throw Object.assign(new Error('invalid_period'), { httpStatus: 400, detail: { period } });
  }
  const start = reportPeriod.start ? new Date(reportPeriod.start) : null;
  const end = reportPeriod.end ? new Date(reportPeriod.end) : null;
  if (!start || !end || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    throw Object.assign(new Error('sync_period_missing'), {
      httpStatus: 409,
      detail: { period, reportPeriod },
    });
  }
  const endMonthKey = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}`;
  const insideWindow = periodStart >= start && periodStart <= end;
  if (!insideWindow && period !== endMonthKey) {
    throw Object.assign(new Error('period_sync_mismatch'), {
      httpStatus: 409,
      detail: { period, reportPeriod, endMonthKey },
    });
  }
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
