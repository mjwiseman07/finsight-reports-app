import type {
  CompositionRow,
  FormulaNode,
  KpiCode,
  ProvenanceSourcePointer,
  Unit,
} from './types';
import { buildMappedFinancialSummary } from '@/lib/integrations/accounting/normalizers/financial-statements';
import type {
  CanonicalBalanceSheetRow,
  CanonicalPnLRow,
} from '@/lib/integrations/accounting/types';
import { resolveNorthStar } from '@/lib/scorecard/industry-north-star';
import { factorizeOperatingGrossMargin } from '@/lib/scorecard/operating-gross-margin';

type NormalizedRow = {
  label: string;
  amount: number;
  section: string;
  source: {
    raw: {
      RowType: 'Row' | 'SummaryRow';
      __advisacorHierarchyPath: string[];
      __advisacorSourceSection: string;
      __advisacorHierarchyDepth: number;
      __advisacorXeroReportAmount?: number;
    };
    provider: 'xero' | 'quickbooks';
    sourceReport: string;
    providerFamily: string;
    providerProduct: string;
    externalEntityId: string;
    externalRecordId: string;
  };
};

type NormalizedPayload = {
  normalizedIncomeStatement: NormalizedRow[];
  normalizedBalanceSheet: NormalizedRow[];
  canonicalArAgingSchedule?: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_over_90: number;
    pastDueTotal?: number;
    total?: number;
    provider?: 'xero' | 'quickbooks';
    customers?: Array<{
      contactId: string | null;
      contactName: string;
      current: number;
      days_1_30: number;
      days_31_60: number;
      days_61_90: number;
      days_over_90: number;
      invoices?: Array<{
        invoiceId: string;
        openBalance: number;
        bucket: string;
        provenance?: {
          provider: 'xero' | 'quickbooks';
          providerFamily: string;
          providerProduct: string;
          sourceReport: string;
          externalEntityId: string;
          externalRecordId: string;
          hierarchyPath?: string[];
          section?: string;
          reportAmount?: number | null;
        };
      }>;
    }>;
  };
  normalizedARAging?: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_over_90: number;
    perCustomer?: Array<{
      customerId: string;
      customerName: string;
      current: number;
      days_1_30: number;
      days_31_60: number;
      days_61_90: number;
      days_over_90: number;
    }>;
  };
};

const CASH_LABEL_PATTERNS = [
  /^cash$/i,
  /checking/i,
  /savings/i,
  /money market/i,
  /petty cash/i,
  /operating account/i,
  /^bank/i,
];

function rowToPointer(r: NormalizedRow): ProvenanceSourcePointer {
  return {
    provider: r.source.provider,
    providerFamily: r.source.providerFamily,
    providerProduct: r.source.providerProduct,
    sourceReport: r.source.sourceReport,
    externalEntityId: r.source.externalEntityId,
    externalRecordId: r.source.externalRecordId,
    hierarchyPath: r.source.raw.__advisacorHierarchyPath || [],
    section: r.source.raw.__advisacorSourceSection || r.section,
    reportAmount: r.source.raw.__advisacorXeroReportAmount ?? r.amount ?? null,
  };
}

function rowToRef(r: NormalizedRow, label?: string): FormulaNode {
  return {
    kind: 'ref',
    label: label ?? r.label,
    amount: r.amount ?? 0,
    source: rowToPointer(r),
  };
}

function leafRows(rows: NormalizedRow[]): NormalizedRow[] {
  return rows.filter(
    (r) => r?.source?.raw?.RowType === 'Row' && typeof r.amount === 'number',
  );
}

function findSectionRollup(
  rows: NormalizedRow[],
  section: string,
): NormalizedRow | null {
  const summaries = rows.filter(
    (r) =>
      r?.source?.raw?.RowType === 'SummaryRow' &&
      (r?.section === section ||
        r?.source?.raw?.__advisacorSourceSection === section),
  );
  if (summaries.length === 0) return null;
  return summaries.reduce((best, cur) =>
    (cur.source.raw.__advisacorHierarchyDepth ?? 99) <
    (best.source.raw.__advisacorHierarchyDepth ?? 99)
      ? cur
      : best,
  );
}

function isCashRow(r: NormalizedRow): boolean {
  const first = (r.source.raw.__advisacorHierarchyPath || [])[0] ?? '';
  const label = r.label || '';
  return (
    CASH_LABEL_PATTERNS.some((rx) => rx.test(first) || rx.test(label)) &&
    r.source.raw.RowType === 'Row'
  );
}

export type FactorizedKpi = {
  numeric: number | null;
  display: string;
  unit: Unit;
  formula: FormulaNode | null;
  composition: CompositionRow[];
  reported_by_provider: number | null;
  computation_status: 'computed' | 'pending_subledger';
};

export function factorizeCashPosition(payload: NormalizedPayload): FactorizedKpi {
  const cashRows = leafRows(payload.normalizedBalanceSheet).filter(isCashRow);
  const total = cashRows.reduce((s, r) => s + (r.amount || 0), 0);
  const composition: CompositionRow[] = cashRows
    .map((r) => ({
      label: r.label,
      amount: r.amount,
      section: r.section,
      hierarchyPath: r.source.raw.__advisacorHierarchyPath || [],
      source: rowToPointer(r),
      contribution_pct: total !== 0 ? r.amount / total : null,
    }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  const formula: FormulaNode = {
    kind: 'sum',
    label: 'Cash Position',
    operands: cashRows.map((r) => rowToRef(r)),
  };

  const reportedRollup = findSectionRollup(
    payload.normalizedBalanceSheet,
    'Assets',
  );
  return {
    numeric: total,
    display: formatCurrency(total),
    unit: 'currency',
    formula,
    composition,
    reported_by_provider: reportedRollup?.amount ?? null,
    computation_status: 'computed',
  };
}

export function factorizeNetProfitMargin(
  payload: NormalizedPayload,
): FactorizedKpi {
  const revenueRollup =
    findSectionRollup(payload.normalizedIncomeStatement, 'Revenue') ||
    findSectionRollup(payload.normalizedIncomeStatement, 'Income');
  const netIncomeRollup =
    findSectionRollup(payload.normalizedIncomeStatement, 'Net Income') ||
    findSectionRollup(payload.normalizedIncomeStatement, 'NetProfit') ||
    findSectionRollup(payload.normalizedIncomeStatement, 'Net Profit');

  if (
    !revenueRollup ||
    !netIncomeRollup ||
    (revenueRollup.amount ?? 0) === 0
  ) {
    return {
      numeric: null,
      display: '—',
      unit: 'percent',
      formula: null,
      composition: [],
      reported_by_provider: null,
      computation_status: 'pending_subledger',
    };
  }

  const value = netIncomeRollup.amount / revenueRollup.amount;
  const expenseLeaves = leafRows(payload.normalizedIncomeStatement).filter(
    (r) => (r.section || '').toLowerCase().includes('expense'),
  );
  const topExpenses = [...expenseLeaves]
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 5);

  const composition: CompositionRow[] = [
    {
      label: revenueRollup.label,
      amount: revenueRollup.amount,
      section: revenueRollup.section,
      hierarchyPath: revenueRollup.source.raw.__advisacorHierarchyPath || [],
      source: rowToPointer(revenueRollup),
      contribution_pct: 1,
    },
    ...topExpenses.map((r) => ({
      label: r.label,
      amount: r.amount,
      section: r.section,
      hierarchyPath: r.source.raw.__advisacorHierarchyPath || [],
      source: rowToPointer(r),
      contribution_pct:
        revenueRollup.amount !== 0 ? r.amount / revenueRollup.amount : null,
    })),
    {
      label: netIncomeRollup.label,
      amount: netIncomeRollup.amount,
      section: netIncomeRollup.section,
      hierarchyPath: netIncomeRollup.source.raw.__advisacorHierarchyPath || [],
      source: rowToPointer(netIncomeRollup),
      contribution_pct:
        revenueRollup.amount !== 0
          ? netIncomeRollup.amount / revenueRollup.amount
          : null,
    },
  ];

  const formula: FormulaNode = {
    kind: 'div',
    label: 'Net Profit Margin',
    numerator: rowToRef(netIncomeRollup, 'Net Income'),
    denominator: rowToRef(revenueRollup, 'Revenue (Net)'),
  };

  return {
    numeric: value,
    display: formatPercent(value),
    unit: 'percent',
    formula,
    composition,
    reported_by_provider: null,
    computation_status: 'computed',
  };
}

export function factorizeArAging(payload: NormalizedPayload): FactorizedKpi {
  const schedule = payload.canonicalArAgingSchedule;
  const ar = schedule || payload.normalizedARAging;
  if (!ar) {
    return {
      numeric: null,
      display: '—',
      unit: 'currency',
      formula: null,
      composition: [],
      reported_by_provider: null,
      computation_status: 'pending_subledger',
    };
  }
  const total =
    typeof (ar as { pastDueTotal?: number }).pastDueTotal === 'number'
      ? (ar as { pastDueTotal: number }).pastDueTotal
      : ar.days_1_30 + ar.days_31_60 + ar.days_61_90 + ar.days_over_90;

  // Derived KPI: never fabricate provider identity. Composition only includes
  // invoice/report lines that carry real ERP provenance (Option A/B), else
  // numeric-only with empty composition (Option C — same rule as OGM).
  const composition: CompositionRow[] = [];
  if (schedule && Array.isArray(schedule.customers)) {
    const pastDueLines = schedule.customers
      .flatMap((customer) =>
        (customer.invoices || [])
          .filter((invoice) => invoice.bucket !== 'current' && invoice.provenance)
          .map((invoice) => ({ customer, invoice })),
      )
      .sort(
        (a, b) => Math.abs(b.invoice.openBalance) - Math.abs(a.invoice.openBalance),
      )
      .slice(0, 20);
    for (const { customer, invoice } of pastDueLines) {
      const provenance = invoice.provenance!;
      if (provenance.provider !== 'xero' && provenance.provider !== 'quickbooks') {
        continue;
      }
      // Truthful ERP record id required — never Advisacor-local composites.
      if (!provenance.externalRecordId || provenance.externalRecordId.startsWith('advisacor:')) {
        continue;
      }
      composition.push({
        label: `${customer.contactName} · ${invoice.invoiceId}`,
        amount: invoice.openBalance,
        section: provenance.section || 'Receivables',
        hierarchyPath: provenance.hierarchyPath || ['AR Aging', customer.contactName],
        source: {
          provider: provenance.provider,
          providerFamily: provenance.providerFamily,
          providerProduct: provenance.providerProduct,
          sourceReport: provenance.sourceReport,
          externalEntityId: provenance.externalEntityId,
          externalRecordId: provenance.externalRecordId,
          hierarchyPath: provenance.hierarchyPath || [],
          section: provenance.section || 'Receivables',
          reportAmount: provenance.reportAmount ?? invoice.openBalance,
        },
        contribution_pct: total !== 0 ? invoice.openBalance / total : null,
      });
    }
  }

  // No fabricated bucket refs — AR exposure is derived from the schedule.
  return {
    numeric: total,
    display: formatCurrency(total),
    unit: 'currency',
    formula: null,
    composition,
    reported_by_provider: null,
    computation_status: 'computed',
  };
}

export function factorizeNetOpCashFlow(payload: NormalizedPayload): FactorizedKpi {
  void payload;
  return {
    numeric: null,
    display: "Pending T12M cash-flow synthesis",
    unit: "currency",
    formula: null,
    composition: [],
    reported_by_provider: null,
    computation_status: "pending_subledger",
  };
}

export function factorizeNorthStar(
  industryType: string,
  payload: NormalizedPayload,
): FactorizedKpi {
  const northStar = resolveNorthStar(industryType);
  if (northStar.code !== 'operating_gross_margin') {
    return {
      numeric: null,
      display: 'Vertical north-star engine coming online',
      unit: 'percent',
      formula: null,
      composition: [],
      reported_by_provider: null,
      computation_status: 'pending_subledger',
    };
  }

  const incomeRows = (payload.normalizedIncomeStatement ||
    []) as unknown as CanonicalPnLRow[];
  const balanceRows = (payload.normalizedBalanceSheet ||
    []) as unknown as CanonicalBalanceSheetRow[];
  const mapped = buildMappedFinancialSummary(balanceRows, incomeRows);
  const factor = factorizeOperatingGrossMargin({
    revenue: mapped.revenue,
    grossProfit: mapped.grossProfit,
    grossProfitSupported: mapped.grossProfitSupported,
  });

  if (factor.status !== 'ready' || factor.numeric == null) {
    return {
      numeric: null,
      display: '—',
      unit: 'percent',
      formula: null,
      composition: [],
      reported_by_provider: null,
      computation_status: 'pending_subledger',
    };
  }

  // Derived KPI provenance: only attach ERP pointers from rows actually selected.
  // Never synthesize QuickBooks/Xero pointers or fake external IDs.
  const asNormalized = (payload.normalizedIncomeStatement || []) as NormalizedRow[];
  const revenueRow = findLabeledRow(asNormalized, [
    /^total (income|revenue|sales)$/i,
  ]);
  const grossProfitRow = findLabeledRow(asNormalized, [/gross profit/i], {
    excludeSynthetic: true,
  });
  const cogsRow = findLabeledRow(asNormalized, [
    /^total (cost of sales|cost of goods sold|cogs)$/i,
  ], { excludeSynthetic: true });

  const revenuePointer =
    revenueRow && hasUsableErpSource(revenueRow)
      ? rowToPointer(revenueRow)
      : null;
  const grossProfitPointer =
    grossProfitRow && hasUsableErpSource(grossProfitRow)
      ? rowToPointer(grossProfitRow)
      : null;
  const cogsPointer =
    cogsRow && hasUsableErpSource(cogsRow) ? rowToPointer(cogsRow) : null;

  let formula: FormulaNode | null = null;
  const composition: CompositionRow[] = [];

  if (grossProfitPointer && revenuePointer && grossProfitRow && revenueRow) {
    // Option A — explicit GP + revenue totals from mapped source rows.
    formula = {
      kind: 'div',
      label: 'Operating Gross Margin',
      numerator: rowToRef(grossProfitRow, 'Gross Profit'),
      denominator: rowToRef(revenueRow, 'Revenue'),
    };
    composition.push({
      label: grossProfitRow.label,
      amount: grossProfitRow.amount,
      section: grossProfitRow.section,
      hierarchyPath: grossProfitRow.source.raw.__advisacorHierarchyPath || [],
      source: grossProfitPointer,
      contribution_pct: 1,
    });
    composition.push({
      label: revenueRow.label,
      amount: revenueRow.amount,
      section: revenueRow.section,
      hierarchyPath: revenueRow.source.raw.__advisacorHierarchyPath || [],
      source: revenuePointer,
      contribution_pct: 1,
    });
  } else if (revenuePointer && cogsPointer && revenueRow && cogsRow) {
    // Option B — derived GP from mapped revenue + COGS totals; composition only.
    // Formula left null until Accuracy Contract can express (rev - cogs) / rev
    // without inventing refs.
    composition.push({
      label: revenueRow.label,
      amount: revenueRow.amount,
      section: revenueRow.section,
      hierarchyPath: revenueRow.source.raw.__advisacorHierarchyPath || [],
      source: revenuePointer,
      contribution_pct: null,
    });
    composition.push({
      label: cogsRow.label,
      amount: cogsRow.amount,
      section: cogsRow.section,
      hierarchyPath: cogsRow.source.raw.__advisacorHierarchyPath || [],
      source: cogsPointer,
      contribution_pct: null,
    });
  }
  // Option C — numeric ready from canonical mapped inputs; no fabricated pointers.

  return {
    numeric: factor.numeric,
    display: factor.display || formatPercent(factor.numeric),
    unit: 'percent',
    formula,
    composition,
    reported_by_provider: grossProfitPointer ? mapped.grossProfit : null,
    computation_status: 'computed',
  };
}

function findLabeledRow(
  rows: NormalizedRow[],
  patterns: RegExp[],
  opts?: { excludeSynthetic?: boolean },
): NormalizedRow | null {
  return (
    rows.find((row) => {
      if (!patterns.some((pattern) => pattern.test(String(row?.label || '')))) {
        return false;
      }
      if (opts?.excludeSynthetic) {
        const raw = row?.source?.raw as { __advisacorSyntheticTotal?: boolean } | undefined;
        if (raw?.__advisacorSyntheticTotal) return false;
      }
      return true;
    }) ?? null
  );
}

function hasUsableErpSource(row: NormalizedRow): boolean {
  const provider = row?.source?.provider;
  return provider === 'xero' || provider === 'quickbooks';
}

export function factorizeKpi(
  kpi: KpiCode,
  industryType: string,
  payload: NormalizedPayload,
): FactorizedKpi {
  switch (kpi) {
    case 'cash_position':
      return factorizeCashPosition(payload);
    case 'net_profit_margin':
      return factorizeNetProfitMargin(payload);
    case 'net_op_cash_flow':
      return factorizeNetOpCashFlow(payload);
    case 'ar_aging':
      return factorizeArAging(payload);
    case 'north_star':
      return factorizeNorthStar(industryType, payload);
  }
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}
function formatPercent(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n);
}
