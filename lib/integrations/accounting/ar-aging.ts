/**
 * Provider-neutral canonical AR Aging schedule.
 *
 * PRIMARY: open receivable / invoice detail aged strictly by DUE DATE.
 * CORROBORATION: provider aged-receivables reports (optional Tie-Out evidence).
 *
 * Scorecard "AR Aging Exposure" = past-due buckets only (excludes Current).
 *
 * Aging boundaries (as of asOfDate):
 * - Current: dueDate >= asOfDate (includes due today)
 * - 1-30: 1..30 calendar days past due
 * - 31-60: 31..60
 * - 61-90: 61..90
 * - 90+: >90
 *
 * Treatment (explicit):
 * - Zero open balance: excluded from schedule
 * - Draft / void / deleted: excluded at source mapping
 * - Partial payments: age remaining open balance only
 * - Credit balances (negative open): included (signed) in the due-date bucket
 *   so schedule total can tie to Balance Sheet AR; pastDueTotal is signed sum
 *   of past-due buckets
 * - Foreign currency: open balance used as reported (no FX conversion here);
 *   callers should prefer home-currency AmountDue when available
 */

import {
  classifyVariance,
  type PolicySnapshot,
  type VarianceClassification,
} from "@/lib/audit-ready/tie-out/policy";
import { agingBuckets } from "@/lib/accounting/supporting-schedules/scheduleDiagnostics";
import type {
  AccountingProvider,
  AdvisacorNormalizedEntity,
  CanonicalBalanceSheetRow,
} from "./types";

export const AR_AGING_BASIS = "due_date" as const;

/** Default Scorecard / sync Tie-Out policy for AR schedule vs BS AR. */
export const DEFAULT_AR_AGING_TIE_OUT_POLICY: PolicySnapshot = {
  auto_reconcile_max_dollar: 1,
  auto_reconcile_max_percent: 0.01,
  kickout_min_dollar: 5,
  kickout_min_percent: 0.05,
  authoritative_comparison: "tighter_of_both",
};

export type ArAgingBucket =
  | "current"
  | "days_1_30"
  | "days_31_60"
  | "days_61_90"
  | "days_over_90";

export type CanonicalArOpenReceivable = {
  invoiceId: string;
  invoiceDate: string | null;
  dueDate: string;
  contactId: string | null;
  contactName: string;
  openBalance: number;
  currency: string | null;
  status: string;
  provider: AccountingProvider;
  sourceKind?: "invoice" | "credit_note" | "aging_report_row";
};

export type CanonicalArAgingInvoiceLine = {
  invoiceId: string;
  invoiceDate: string | null;
  dueDate: string;
  openBalance: number;
  currency: string | null;
  status: string;
  bucket: ArAgingBucket;
  daysPastDue: number;
  sourceKind?: string;
};

export type CanonicalArAgingCustomer = {
  contactId: string | null;
  contactName: string;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_over_90: number;
  total: number;
  pastDueTotal: number;
  invoices: CanonicalArAgingInvoiceLine[];
};

export type CanonicalArAgingTieOut = {
  scheduleTotal: number;
  balanceSheetAr: number;
  variance: number;
  varianceAbs: number;
  toleranceDollar: number;
  status: VarianceClassification | "unavailable";
  reason: string;
  policy: PolicySnapshot;
  passesForScorecard: boolean;
};

export type CanonicalArAgingSource = {
  kind: "open_invoices" | "aging_report_summary" | "hybrid";
  invoiceCount: number;
  excludedZeroBalance: number;
  corroboratingReportTotal?: number | null;
  notes?: string[];
};

export type CanonicalArAgingSchedule = {
  asOfDate: string;
  agingBasis: typeof AR_AGING_BASIS;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_over_90: number;
  total: number;
  pastDueTotal: number;
  customers: CanonicalArAgingCustomer[];
  source: CanonicalArAgingSource;
  companyId: string | null;
  connectionId: string | null;
  provider: AccountingProvider;
  syncId: string | null;
  computedAt: string;
  tieOut: CanonicalArAgingTieOut;
  treatments: {
    agingBasis: typeof AR_AGING_BASIS;
    dueTodayIsCurrent: true;
    zeroBalancesExcluded: true;
    creditsIncludedSigned: true;
    partialPaymentsUseOpenBalance: true;
    draftVoidExcludedAtSource: true;
    foreignCurrencyNoFxInV1: true;
  };
};

const MS_PER_DAY = 86_400_000;
const AMOUNT_EPSILON = 0.005;

function parseIsoDateUtc(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

/** Calendar days past due; negative or zero means current / not yet due. */
export function calendarDaysPastDue(dueDate: string, asOfDate: string): number | null {
  const due = parseIsoDateUtc(dueDate);
  const asOf = parseIsoDateUtc(asOfDate);
  if (!due || !asOf) return null;
  return Math.floor((asOf.getTime() - due.getTime()) / MS_PER_DAY);
}

export function bucketForDaysPastDue(daysPastDue: number): ArAgingBucket {
  if (daysPastDue <= 0) return "current";
  if (daysPastDue <= 30) return "days_1_30";
  if (daysPastDue <= 60) return "days_31_60";
  if (daysPastDue <= 90) return "days_61_90";
  return "days_over_90";
}

export function sumBalanceSheetAccountsReceivable(
  rows: CanonicalBalanceSheetRow[] = [],
): number {
  const exact = rows.find(
    (row) =>
      /^accounts receivable$/i.test(String(row.label || "").trim()) &&
      !/^total\b/i.test(String(row.label || "")),
  );
  if (exact && Number.isFinite(Number(exact.amount))) {
    return Number(exact.amount);
  }
  return rows
    .filter(
      (row) =>
        /accounts receivable|\breceivables\b/i.test(`${row.label} ${row.section || ""}`) &&
        !/^total\b/i.test(String(row.label || "")),
    )
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function emptyBuckets() {
  return {
    current: 0,
    days_1_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    days_over_90: 0,
  };
}

function pastDueFromBuckets(b: ReturnType<typeof emptyBuckets>) {
  return b.days_1_30 + b.days_31_60 + b.days_61_90 + b.days_over_90;
}

function totalFromBuckets(b: ReturnType<typeof emptyBuckets>) {
  return b.current + pastDueFromBuckets(b);
}

export function buildArAgingTieOut(input: {
  scheduleTotal: number;
  balanceSheetAr: number;
  policy?: PolicySnapshot;
}): CanonicalArAgingTieOut {
  const policy = input.policy || DEFAULT_AR_AGING_TIE_OUT_POLICY;
  const variance = Number(input.scheduleTotal) - Number(input.balanceSheetAr);
  const varianceAbs = Math.abs(variance);
  if (!Number.isFinite(input.balanceSheetAr) && !Number.isFinite(input.scheduleTotal)) {
    return {
      scheduleTotal: input.scheduleTotal,
      balanceSheetAr: input.balanceSheetAr,
      variance,
      varianceAbs,
      toleranceDollar: policy.auto_reconcile_max_dollar,
      status: "unavailable",
      reason: "AR aging Tie-Out unavailable — missing schedule or Balance Sheet AR",
      policy,
      passesForScorecard: false,
    };
  }
  const classification = classifyVariance(
    Math.round(variance * 100),
    Math.round(Number(input.balanceSheetAr) * 100),
    policy,
  );
  const passesForScorecard =
    classification.status === "tie" || classification.status === "auto_cleared";
  return {
    scheduleTotal: input.scheduleTotal,
    balanceSheetAr: input.balanceSheetAr,
    variance,
    varianceAbs,
    toleranceDollar: policy.auto_reconcile_max_dollar,
    status: classification.status,
    reason: classification.reason,
    policy,
    passesForScorecard,
  };
}

export function buildCanonicalArAgingSchedule(input: {
  asOfDate: string;
  receivables: CanonicalArOpenReceivable[];
  balanceSheet: CanonicalBalanceSheetRow[];
  provider: AccountingProvider;
  companyId?: string | null;
  connectionId?: string | null;
  syncId?: string | null;
  sourceKind?: CanonicalArAgingSource["kind"];
  corroboratingReportTotal?: number | null;
  policy?: PolicySnapshot;
  computedAt?: string;
  notes?: string[];
}): CanonicalArAgingSchedule {
  const buckets = emptyBuckets();
  const customerMap = new Map<string, CanonicalArAgingCustomer>();
  let excludedZeroBalance = 0;
  let invoiceCount = 0;

  for (const row of input.receivables) {
    const openBalance = Number(row.openBalance);
    if (!Number.isFinite(openBalance) || Math.abs(openBalance) <= AMOUNT_EPSILON) {
      excludedZeroBalance += 1;
      continue;
    }
    const daysPastDue = calendarDaysPastDue(row.dueDate, input.asOfDate);
    if (daysPastDue === null) continue;
    const bucket = bucketForDaysPastDue(daysPastDue);
    buckets[bucket] += openBalance;
    invoiceCount += 1;

    const customerKey = `${row.contactId || ""}::${row.contactName || "Unknown"}`;
    let customer = customerMap.get(customerKey);
    if (!customer) {
      customer = {
        contactId: row.contactId,
        contactName: row.contactName || "Unknown",
        ...emptyBuckets(),
        total: 0,
        pastDueTotal: 0,
        invoices: [],
      };
      customerMap.set(customerKey, customer);
    }
    customer[bucket] += openBalance;
    customer.invoices.push({
      invoiceId: row.invoiceId,
      invoiceDate: row.invoiceDate,
      dueDate: row.dueDate,
      openBalance,
      currency: row.currency,
      status: row.status,
      bucket,
      daysPastDue,
      sourceKind: row.sourceKind,
    });
  }

  for (const customer of customerMap.values()) {
    customer.total = totalFromBuckets(customer);
    customer.pastDueTotal = pastDueFromBuckets(customer);
  }

  const total = totalFromBuckets(buckets);
  const pastDueTotal = pastDueFromBuckets(buckets);
  const balanceSheetAr = sumBalanceSheetAccountsReceivable(input.balanceSheet);
  const tieOut = buildArAgingTieOut({
    scheduleTotal: total,
    balanceSheetAr,
    policy: input.policy,
  });

  return {
    asOfDate: input.asOfDate,
    agingBasis: AR_AGING_BASIS,
    ...buckets,
    total,
    pastDueTotal,
    customers: [...customerMap.values()].sort((a, b) =>
      a.contactName.localeCompare(b.contactName),
    ),
    source: {
      kind: input.sourceKind || "open_invoices",
      invoiceCount,
      excludedZeroBalance,
      corroboratingReportTotal: input.corroboratingReportTotal ?? null,
      notes: input.notes,
    },
    companyId: input.companyId ?? null,
    connectionId: input.connectionId ?? null,
    provider: input.provider,
    syncId: input.syncId ?? null,
    computedAt: input.computedAt || new Date().toISOString(),
    tieOut,
    treatments: {
      agingBasis: AR_AGING_BASIS,
      dueTodayIsCurrent: true,
      zeroBalancesExcluded: true,
      creditsIncludedSigned: true,
      partialPaymentsUseOpenBalance: true,
      draftVoidExcludedAtSource: true,
      foreignCurrencyNoFxInV1: true,
    },
  };
}

/**
 * QBO / legacy path: map provider aging-summary entity rows into the same
 * canonical contract. Does not invent invoice-level memory.
 */
export function buildCanonicalArAgingScheduleFromAgingEntities(input: {
  asOfDate: string;
  entities: AdvisacorNormalizedEntity[];
  balanceSheet: CanonicalBalanceSheetRow[];
  provider: AccountingProvider;
  companyId?: string | null;
  connectionId?: string | null;
  syncId?: string | null;
  policy?: PolicySnapshot;
  computedAt?: string;
}): CanonicalArAgingSchedule | null {
  const real = (input.entities || []).filter(
    (row) => row.type !== "not_available" && !String(row.id || "").endsWith(":not_available"),
  );
  if (!real.length) return null;
  const buckets = agingBuckets(real);
  const scheduleBuckets = {
    current: buckets.current,
    days_1_30: buckets.oneToThirty,
    days_31_60: buckets.thirtyOneToSixty,
    days_61_90: buckets.sixtyOneToNinety,
    days_over_90: buckets.ninetyPlus,
  };
  const total =
    scheduleBuckets.current +
    scheduleBuckets.days_1_30 +
    scheduleBuckets.days_31_60 +
    scheduleBuckets.days_61_90 +
    scheduleBuckets.days_over_90;
  if (Math.abs(total) <= AMOUNT_EPSILON && Math.abs(buckets.total) <= AMOUNT_EPSILON) {
    return null;
  }
  const pastDueTotal =
    scheduleBuckets.days_1_30 +
    scheduleBuckets.days_31_60 +
    scheduleBuckets.days_61_90 +
    scheduleBuckets.days_over_90;
  const balanceSheetAr = sumBalanceSheetAccountsReceivable(input.balanceSheet);
  const scheduleTotal = Math.abs(total) > AMOUNT_EPSILON ? total : buckets.total;
  const tieOut = buildArAgingTieOut({
    scheduleTotal,
    balanceSheetAr,
    policy: input.policy,
  });
  return {
    asOfDate: input.asOfDate,
    agingBasis: AR_AGING_BASIS,
    ...scheduleBuckets,
    total: scheduleTotal,
    pastDueTotal,
    customers: [],
    source: {
      kind: "aging_report_summary",
      invoiceCount: 0,
      excludedZeroBalance: 0,
      corroboratingReportTotal: buckets.total,
      notes: [
        "Derived from provider aging-summary entities (no invoice-level lines).",
        "Aging basis assumed due_date for Scorecard contract compatibility.",
      ],
    },
    companyId: input.companyId ?? null,
    connectionId: input.connectionId ?? null,
    provider: input.provider,
    syncId: input.syncId ?? null,
    computedAt: input.computedAt || new Date().toISOString(),
    tieOut,
    treatments: {
      agingBasis: AR_AGING_BASIS,
      dueTodayIsCurrent: true,
      zeroBalancesExcluded: true,
      creditsIncludedSigned: true,
      partialPaymentsUseOpenBalance: true,
      draftVoidExcludedAtSource: true,
      foreignCurrencyNoFxInV1: true,
    },
  };
}

/** Scorecard AR Aging Exposure = past-due only. */
export function scorecardArAgingExposure(schedule: {
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_over_90: number;
  pastDueTotal?: number;
}): number {
  if (typeof schedule.pastDueTotal === "number" && Number.isFinite(schedule.pastDueTotal)) {
    return schedule.pastDueTotal;
  }
  return (
    schedule.days_1_30 +
    schedule.days_31_60 +
    schedule.days_61_90 +
    schedule.days_over_90
  );
}

export function toScorecardArAgingView(schedule: CanonicalArAgingSchedule) {
  return {
    current: schedule.current,
    days_1_30: schedule.days_1_30,
    days_31_60: schedule.days_31_60,
    days_61_90: schedule.days_61_90,
    days_over_90: schedule.days_over_90,
    total: schedule.total,
    pastDueTotal: schedule.pastDueTotal,
    tieOut: {
      status: schedule.tieOut.status,
      scheduleTotal: schedule.tieOut.scheduleTotal,
      balanceSheetAr: schedule.tieOut.balanceSheetAr,
      variance: schedule.tieOut.variance,
      tolerance: schedule.tieOut.toleranceDollar,
      reason: schedule.tieOut.reason,
      passesForScorecard: schedule.tieOut.passesForScorecard,
    },
  };
}

/** Emit attributable entity rows from invoice-derived schedule (accounting memory). */
export function canonicalArAgingScheduleToEntities(
  schedule: CanonicalArAgingSchedule,
  source: { provider: AccountingProvider; externalEntityId?: string },
): AdvisacorNormalizedEntity[] {
  const entities: AdvisacorNormalizedEntity[] = [];
  for (const customer of schedule.customers) {
    for (const invoice of customer.invoices) {
      entities.push({
        id: `${source.provider}:ARAging:${invoice.invoiceId}`,
        name: customer.contactName,
        type: "ar_open_receivable",
        amount: invoice.openBalance,
        balance: invoice.openBalance,
        metadata: {
          source_system: source.provider,
          invoiceId: invoice.invoiceId,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          contactId: customer.contactId,
          contactName: customer.contactName,
          bucket: invoice.bucket,
          daysPastDue: invoice.daysPastDue,
          asOfDate: schedule.asOfDate,
          agingBasis: schedule.agingBasis,
          currency: invoice.currency,
          status: invoice.status,
          syncId: schedule.syncId,
          connectionId: schedule.connectionId,
          companyId: schedule.companyId,
        },
        source: {
          provider: source.provider,
          providerFamily: source.provider,
          providerProduct: source.provider,
          externalEntityId: source.externalEntityId,
          externalRecordId: invoice.invoiceId,
          sourceReport: "OpenReceivables",
          raw: invoice,
        },
      });
    }
  }
  if (!entities.length) {
    const bucketRows: Array<[string, number]> = [
      ["Current", schedule.current],
      ["1-30", schedule.days_1_30],
      ["31-60", schedule.days_31_60],
      ["61-90", schedule.days_61_90],
      ["90+", schedule.days_over_90],
      ["Total", schedule.total],
    ];
    for (const [label, amount] of bucketRows) {
      entities.push({
        id: `${source.provider}:ARAgingSummary:${label}`,
        name: label,
        type: "ar_aging_bucket",
        amount,
        metadata: {
          asOfDate: schedule.asOfDate,
          agingBasis: schedule.agingBasis,
          bucket: label,
        },
        source: {
          provider: source.provider,
          providerFamily: source.provider,
          providerProduct: source.provider,
          externalEntityId: source.externalEntityId,
          externalRecordId: label,
          sourceReport: "ARAgingSchedule",
          raw: { label, amount },
        },
      });
    }
  }
  return entities;
}
