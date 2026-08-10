import type {
  CompositionRow,
  FormulaNode,
  KpiCode,
  ProvenanceSourcePointer,
  Unit,
} from './types';

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
  const ar = payload.normalizedARAging;
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
    ar.days_1_30 + ar.days_31_60 + ar.days_61_90 + ar.days_over_90;

  const stubPointer: ProvenanceSourcePointer = {
    provider: 'xero',
    providerFamily: 'xero',
    providerProduct: 'xero_accounting',
    sourceReport: 'ARAgingSummary',
    externalEntityId: 'ar-aging',
    externalRecordId: 'ar-aging-bucket',
    hierarchyPath: ['AR Aging'],
    section: 'Receivables',
    reportAmount: null,
  };

  const bucketRow = (label: string, amount: number): CompositionRow => ({
    label,
    amount,
    section: 'Receivables',
    hierarchyPath: ['AR Aging', label],
    source: { ...stubPointer, externalRecordId: label },
    contribution_pct: total !== 0 ? amount / total : null,
  });

  const composition: CompositionRow[] = [
    bucketRow('1-30 days', ar.days_1_30),
    bucketRow('31-60 days', ar.days_31_60),
    bucketRow('61-90 days', ar.days_61_90),
    bucketRow('90+ days', ar.days_over_90),
  ];

  if (ar.perCustomer && ar.perCustomer.length > 0) {
    const pastDuePerCustomer = ar.perCustomer
      .map((c) => ({
        ...c,
        pastDue:
          c.days_1_30 + c.days_31_60 + c.days_61_90 + c.days_over_90,
      }))
      .filter((c) => c.pastDue > 0)
      .sort((a, b) => b.pastDue - a.pastDue)
      .slice(0, 10);
    for (const c of pastDuePerCustomer) {
      composition.push({
        label: c.customerName,
        amount: c.pastDue,
        section: 'Receivables (customer)',
        hierarchyPath: ['AR Aging', 'By Customer', c.customerName],
        source: { ...stubPointer, externalRecordId: c.customerId },
        contribution_pct: total !== 0 ? c.pastDue / total : null,
      });
    }
  }

  const formula: FormulaNode = {
    kind: 'sum',
    label: 'AR Aging Exposure',
    operands: [
      {
        kind: 'ref',
        label: '1-30 days',
        amount: ar.days_1_30,
        source: stubPointer,
      },
      {
        kind: 'ref',
        label: '31-60 days',
        amount: ar.days_31_60,
        source: stubPointer,
      },
      {
        kind: 'ref',
        label: '61-90 days',
        amount: ar.days_61_90,
        source: stubPointer,
      },
      {
        kind: 'ref',
        label: '90+ days',
        amount: ar.days_over_90,
        source: stubPointer,
      },
    ],
  };

  return {
    numeric: total,
    display: formatCurrency(total),
    unit: 'currency',
    formula,
    composition,
    reported_by_provider: total,
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
  void industryType;
  void payload;
  return {
    numeric: null,
    display: "Vertical north-star engine coming online",
    unit: "percent",
    formula: null,
    composition: [],
    reported_by_provider: null,
    computation_status: "pending_subledger",
  };
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
