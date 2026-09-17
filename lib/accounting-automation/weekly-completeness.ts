import { createHash } from "node:crypto";
import { hasAvailableScheduleRows } from "@/lib/accounting/supporting-schedules/fetchSupportingSchedules";
import type { AdvisacorNormalizedEntity, AdvisacorNormalizedFinancialData } from "@/lib/integrations/accounting/types";
import { RA_PRO_TIER_KEY, isRaProAuthorizingPilotStatus } from "@/lib/review-assist-pro/limits";
import { createServiceClient } from "@/lib/supabase/service";
import { reconcileBankCashSnapshot } from "./bank-cash-reconciliation";

type Provider = "quickbooks" | "xero";
type Severity = "review" | "block";
type Category = "bank_activity" | "order_to_invoice" | "accounts_receivable" | "accounts_payable" | "source_data";

export type WeeklyFinding = {
  category: Category;
  code: string;
  severity: Severity;
  item_count: number;
  amount_cents: number | null;
  evidence: Record<string, unknown>;
};

export type WeeklyCandidate = {
  firm_id: string;
  firm_client_id: string;
  company_id: string;
  accounting_sync_id: string;
  provider: Provider;
  synced_at: string;
  normalized_payload: AdvisacorNormalizedFinancialData;
};

function rowText(row: AdvisacorNormalizedEntity): string {
  return `${row.name || ""} ${row.type || ""} ${row.source?.sourceReport || ""} ${JSON.stringify(row.metadata || {})}`.toLowerCase();
}

function numeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowAmount(row: AdvisacorNormalizedEntity): number {
  return Math.abs(numeric(row.amount ?? row.balance ?? row.metadata?.amount ?? row.metadata?.total));
}

function aggregate(rows: AdvisacorNormalizedEntity[]) {
  return {
    item_count: rows.length,
    amount_cents: Math.round(rows.reduce((sum, row) => sum + rowAmount(row), 0) * 100),
  };
}

export function utcWeekEnding(now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysToSunday = (7 - date.getUTCDay()) % 7;
  date.setUTCDate(date.getUTCDate() + daysToSunday);
  return date.toISOString().slice(0, 10);
}

export function evaluateWeeklyCompleteness(input: {
  payload: AdvisacorNormalizedFinancialData;
  syncedAt: string;
  now?: Date;
}): WeeklyFinding[] {
  const now = input.now ?? new Date();
  const findings: WeeklyFinding[] = [];
  const ageHours = (now.getTime() - new Date(input.syncedAt).getTime()) / 3_600_000;

  if (!Number.isFinite(ageHours) || ageHours > 26) {
    findings.push({
      category: "source_data",
      code: "accounting_snapshot_stale",
      severity: "block",
      item_count: 1,
      amount_cents: null,
      evidence: { max_age_hours: 26, observed_age_hours: Number.isFinite(ageHours) ? Math.floor(ageHours) : null },
    });
  }

  const bankRows = hasAvailableScheduleRows(input.payload.normalizedTransactions)
    ? input.payload.normalizedTransactions
    : [];
  if (!bankRows.length) {
    findings.push({
      category: "bank_activity",
      code: "bank_activity_evidence_unavailable",
      severity: "block",
      item_count: 0,
      amount_cents: null,
      evidence: { provider: input.payload.sourceSystem, action: "refresh_or_supply_bank_activity" },
    });
  } else {
    const unresolved = bankRows.filter((row) => /unmatched|unreconciled|uncleared|outstanding|pending/.test(rowText(row)));
    if (unresolved.length) {
      findings.push({
        category: "bank_activity",
        code: "bank_activity_requires_review",
        severity: "review",
        ...aggregate(unresolved),
        evidence: { source: "normalized_transactions", provider: input.payload.sourceSystem },
      });
    }
  }

  const bankRecon = reconcileBankCashSnapshot(input.payload);
  if (bankRecon.status === "review_required") {
    findings.push({
      category: "bank_activity",
      code: "bank_to_gl_reconciliation_variance",
      severity: "review",
      item_count: bankRecon.unresolved_item_count,
      amount_cents: bankRecon.variance_cents === null ? null : Math.abs(bankRecon.variance_cents),
      evidence: {
        bank_balance_cents: bankRecon.bank_balance_cents,
        gl_cash_balance_cents: bankRecon.gl_cash_balance_cents,
        variance_cents: bankRecon.variance_cents,
        evidence_codes: bankRecon.evidence_codes,
      },
    });
  } else if (bankRows.length && bankRecon.status === "unavailable") {
    findings.push({
      category: "bank_activity",
      code: "bank_to_gl_reconciliation_evidence_incomplete",
      severity: "block",
      item_count: bankRecon.unresolved_item_count,
      amount_cents: null,
      evidence: { evidence_codes: bankRecon.evidence_codes },
    });
  }

  const arRows = hasAvailableScheduleRows(input.payload.normalizedARAging) ? input.payload.normalizedARAging : [];
  if (!arRows.length) {
    findings.push({
      category: "accounts_receivable",
      code: "ar_aging_evidence_unavailable",
      severity: "block",
      item_count: 0,
      amount_cents: null,
      evidence: { action: "refresh_or_supply_ar_aging" },
    });
  } else {
    const overdue = arRows.filter((row) => /overdue|past due|31-60|61-90|90\+|91\+/.test(rowText(row)));
    if (overdue.length) {
      findings.push({
        category: "accounts_receivable",
        code: "overdue_receivables_require_review",
        severity: "review",
        ...aggregate(overdue),
        evidence: { source: "normalized_ar_aging" },
      });
    }
  }

  const apRows = hasAvailableScheduleRows(input.payload.normalizedAPAging) ? input.payload.normalizedAPAging : [];
  if (!apRows.length) {
    findings.push({
      category: "accounts_payable",
      code: "ap_aging_evidence_unavailable",
      severity: "block",
      item_count: 0,
      amount_cents: null,
      evidence: { action: "refresh_or_supply_ap_aging" },
    });
  } else {
    const overdue = apRows.filter((row) => /overdue|past due|31-60|61-90|90\+|91\+/.test(rowText(row)));
    if (overdue.length) {
      findings.push({
        category: "accounts_payable",
        code: "overdue_payables_require_review",
        severity: "review",
        ...aggregate(overdue),
        evidence: { source: "normalized_ap_aging", payment_execution: "human_only" },
      });
    }
  }

  const orderEvidence = bankRows.filter((row) => /sales order|shipment|ship date|fulfillment/.test(rowText(row)));
  if (!orderEvidence.length) {
    findings.push({
      category: "order_to_invoice",
      code: "order_to_invoice_evidence_unavailable",
      severity: "review",
      item_count: 0,
      amount_cents: null,
      evidence: { action: "connect_order_or_shipment_source", invoice_creation: "human_approval_required" },
    });
  }

  return findings.sort((a, b) => a.code.localeCompare(b.code));
}

function weeklyStatus(findings: WeeklyFinding[]): "clear" | "review_required" | "blocked" {
  if (findings.some((finding) => finding.severity === "block")) return "blocked";
  return findings.length ? "review_required" : "clear";
}

function weeklyKey(candidate: WeeklyCandidate, weekEnding: string): string {
  return createHash("sha256")
    .update(`${candidate.firm_client_id}:${candidate.accounting_sync_id}:${weekEnding}:v1`)
    .digest("hex");
}

async function loadWeeklyCandidates(): Promise<WeeklyCandidate[]> {
  const db = createServiceClient();
  const { data: firms, error: firmError } = await db.from("firms").select("id, billing_company_id").not("billing_company_id", "is", null);
  if (firmError) throw firmError;
  const billingIds = (firms ?? []).map((row) => row.billing_company_id as string).filter(Boolean);
  if (!billingIds.length) return [];

  const { data: slots, error: slotError } = await db.from("pilot_slots").select("company_id, pilot_status").eq("tier_key", RA_PRO_TIER_KEY).in("company_id", billingIds);
  if (slotError) throw slotError;
  const authorized = new Set((slots ?? []).filter((row) => isRaProAuthorizingPilotStatus(row.pilot_status as string)).map((row) => row.company_id as string));
  const eligibleFirms = (firms ?? []).filter((row) => authorized.has(row.billing_company_id as string));
  if (!eligibleFirms.length) return [];

  const firmIds = eligibleFirms.map((row) => row.id as string);
  const { data: clients, error: clientError } = await db.from("firm_clients").select("id, firm_id, company_id").in("firm_id", firmIds).eq("subscription_status", "active").not("company_id", "is", null);
  if (clientError) throw clientError;
  const companyIds = (clients ?? []).map((row) => row.company_id as string);
  if (!companyIds.length) return [];

  const { data: syncs, error: syncError } = await db.from("accounting_syncs")
    .select("id, company_id, source_system, normalized_payload, last_synced_at, created_at")
    .in("company_id", companyIds)
    .eq("validation_status", "SUCCESS")
    .in("source_system", ["quickbooks", "xero"])
    .order("created_at", { ascending: false });
  if (syncError) throw syncError;

  const latestByCompany = new Map<string, (typeof syncs)[number]>();
  for (const sync of syncs ?? []) {
    const companyId = sync.company_id as string;
    if (!latestByCompany.has(companyId)) latestByCompany.set(companyId, sync);
  }

  return (clients ?? []).flatMap((client) => {
    const sync = latestByCompany.get(client.company_id as string);
    if (!sync) return [];
    return [{
      firm_id: client.firm_id as string,
      firm_client_id: client.id as string,
      company_id: client.company_id as string,
      accounting_sync_id: sync.id as string,
      provider: sync.source_system as Provider,
      synced_at: String(sync.last_synced_at || sync.created_at),
      normalized_payload: sync.normalized_payload as AdvisacorNormalizedFinancialData,
    }];
  });
}

export async function runRaProWeeklyCompleteness(options?: {
  now?: Date;
  loadCandidates?: () => Promise<WeeklyCandidate[]>;
  persist?: (run: Record<string, unknown>, findings: WeeklyFinding[]) => Promise<unknown>;
}) {
  const now = options?.now ?? new Date();
  const candidates = await (options?.loadCandidates ?? loadWeeklyCandidates)();
  const persist = options?.persist ?? (async (run, findings) => {
    const db = createServiceClient();
    const { error } = await db.rpc("persist_ra_pro_weekly_completeness", { p_run: run, p_findings: findings });
    if (error) throw error;
  });
  const weekEnding = utcWeekEnding(now);
  let completed = 0;
  const failures: Array<{ firm_client_id: string; code: string }> = [];

  for (const candidate of candidates) {
    try {
      const findings = evaluateWeeklyCompleteness({ payload: candidate.normalized_payload, syncedAt: candidate.synced_at, now });
      await persist({
        firm_id: candidate.firm_id,
        firm_client_id: candidate.firm_client_id,
        company_id: candidate.company_id,
        accounting_sync_id: candidate.accounting_sync_id,
        provider: candidate.provider,
        week_ending: weekEnding,
        status: weeklyStatus(findings),
        finding_count: findings.length,
        summary: {
          review_only: true,
          provider_writes: false,
          blocks: findings.filter((finding) => finding.severity === "block").length,
          reviews: findings.filter((finding) => finding.severity === "review").length,
        },
        idempotency_key: weeklyKey(candidate, weekEnding),
        completed_at: now.toISOString(),
      }, findings);
      completed += 1;
    } catch {
      failures.push({ firm_client_id: candidate.firm_client_id, code: "weekly_review_failed" });
    }
  }

  return {
    status: failures.length ? "partial" : "ok",
    week_ending: weekEnding,
    eligible_clients: candidates.length,
    completed,
    failed: failures.length,
    failures,
  };
}
