/**
 * Review Assist findings composer.
 *
 * Given firm_client_id + period (YYYY-MM), pulls findings from live data
 * pipelines that already ship on main:
 *
 *   1. Flux (A1)                    — close_packet_sections[variance].flagged_items
 *   2. Anomalies / missed entries   — close_packet_sections[anomalies].flags
 *   3. Recurring patterns           — curated_rule_fires (recurring rule family)
 *   4. Unrecorded liability         — curated_rule_fires (ap_missed_vendor_check,
 *                                       accrual_reversal_check)
 *   5. Reconciliation gaps          — close_packet_sections[recon].accounts
 *   6. Bank activity                — curated_rule_fires (cash_negative_check)
 *   7. Cutoff intelligence          — curated_rule_fires (revenue_cutoff_check,
 *                                       je_period_check, reversing_entry_period_check)
 *   8. Uncategorized (read-only)    — listProposals(firm_client_id) filtered to period
 *   9. Duplicate detections         — listDuplicatesForPeriod (this PR)
 *
 * Plus a coverage badge from assertion_coverage_statement_versions (latest
 * snapshot for the period).
 *
 * All severities pass through toReviewAssistSeverity() at the composer
 * boundary. Internal enums are untouched.
 *
 * Zero new detection code. Zero writes.
 *
 * Reference: Track_C_Phase_1_Tier_Spec_v1_2_Review_Assist_Addendum, Block 6.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { toReviewAssistSeverity, type ReviewAssistSeverity } from "@/lib/review-assist/severity-adapter";
import { listDuplicatesForPeriod } from "@/lib/ap-intake/duplicate/persist";
import { listProposals } from "@/lib/learning/proposal-service";

export type ReviewAssistFindingSource =
  | "flux"
  | "anomalies"
  | "recurring_patterns"
  | "unrecorded_liability"
  | "reconciliation"
  | "bank_activity"
  | "cutoff"
  | "uncategorized"
  | "duplicate";

export interface ReviewAssistFinding {
  id: string;
  source: ReviewAssistFindingSource;
  severity: ReviewAssistSeverity;
  title: string;
  description: string;
  evidence?: unknown;
  detected_at: string;
}

export interface ReviewAssistCoverage {
  covered: number;
  total: number;
  tested_count: number;
  partial_count: number;
  gap_count: number;
  not_applicable_count: number;
}

export interface ReviewAssistFindingsPayload {
  firm_client_id: string;
  period: string;
  close_period_id: string | null;
  close_packet_id: string | null;
  packet_version: number | null;
  coverage: ReviewAssistCoverage | null;
  findings: ReviewAssistFinding[];
  meta: {
    generated_at: string;
    period_start: string | null;
    period_end: string | null;
    source_counts: Record<ReviewAssistFindingSource, number>;
  };
}

interface ComposeArgs {
  supabase: SupabaseClient;
  firmClientId: string;
  period: string; // "YYYY-MM"
}

// ---------- helpers ----------
function normalizeInputSeverity(raw: unknown): Parameters<typeof toReviewAssistSeverity>[0] {
  if (raw == null) return "info";
  const s = String(raw).toLowerCase();
  if (s === "med") return "medium";
  if (
    s === "critical" ||
    s === "error" ||
    s === "high" ||
    s === "warning" ||
    s === "medium" ||
    s === "info" ||
    s === "low" ||
    s === "note"
  ) {
    return s;
  }
  return "info";
}

function periodBounds(period: string): { start: string; end: string } {
  // period is YYYY-MM. Bounds are inclusive on start, inclusive-through-end-of-day on end.
  const [yStr, mStr] = period.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    throw new Error(`Invalid period "${period}", expected YYYY-MM`);
  }
  const start = `${yStr}-${mStr.padStart(2, "0")}-01`;
  // last day of month
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${yStr}-${mStr.padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

// ---------- source pulls ----------
async function resolveClosePeriod(
  supabase: SupabaseClient,
  firmClientId: string,
  period: string,
): Promise<{ id: string; period_start: string; period_end: string } | null> {
  const { start } = periodBounds(period);
  const { data, error } = await supabase
    .from("close_periods")
    .select("id, period_start, period_end")
    .eq("firm_client_id", firmClientId)
    .eq("period_start", start)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

async function resolveLatestPacket(
  supabase: SupabaseClient,
  closePeriodId: string,
): Promise<{ id: string; version: number } | null> {
  const { data, error } = await supabase
    .from("close_packets")
    .select("id, version")
    .eq("close_period_id", closePeriodId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

async function loadPacketSection(
  supabase: SupabaseClient,
  packetId: string,
  sectionKey: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("close_packet_sections")
    .select("content_json")
    .eq("packet_id", packetId)
    .eq("section_key", sectionKey)
    .maybeSingle();
  if (error) throw error;
  const content = (data?.content_json ?? null) as Record<string, unknown> | null;
  if (!content) return null;
  if (typeof content === "object" && "status" in content && (content as { status?: string }).status === "error") {
    return null;
  }
  return content;
}

async function loadCoverage(
  supabase: SupabaseClient,
  closePacketId: string,
): Promise<ReviewAssistCoverage | null> {
  const { data, error } = await supabase
    .from("assertion_coverage_statement_versions")
    .select(
      "tested_count, partial_count, gap_count, not_applicable_count, coverage_row_count",
    )
    .eq("close_packet_id", closePacketId)
    .order("packet_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    // table may not exist in dev — treat as no coverage snapshot
    if ((error as { code?: string }).code === "42P01") return null;
    throw error;
  }
  if (!data) return null;
  const tested = Number(data.tested_count ?? 0);
  const partial = Number(data.partial_count ?? 0);
  const gap = Number(data.gap_count ?? 0);
  const na = Number(data.not_applicable_count ?? 0);
  // Reviewer-facing "covered / 8" — assertion library is 8-assertion baseline.
  // covered = tested (full evidence). Partial counts as half, rounded down.
  const covered = tested + Math.floor(partial / 2);
  return {
    covered,
    total: 8,
    tested_count: tested,
    partial_count: partial,
    gap_count: gap,
    not_applicable_count: na,
  };
}

async function loadRuleFires(
  supabase: SupabaseClient,
  firmClientId: string,
  ruleIds: string[],
  bounds: { start: string; end: string },
): Promise<
  Array<{
    fire_id: string;
    rule_id: string;
    target_type: string;
    target_ref: string;
    reason_code: string;
    reason_detail: unknown;
    severity_applied: string;
    created_at: string;
  }>
> {
  if (ruleIds.length === 0) return [];
  const { data, error } = await supabase
    .from("curated_rule_fires")
    .select(
      "fire_id, rule_id, target_type, target_ref, reason_code, reason_detail, severity_applied, created_at",
    )
    .eq("firm_client_id", firmClientId)
    .eq("outcome", "fired")
    .in("rule_id", ruleIds)
    .gte("created_at", bounds.start)
    .lte("created_at", bounds.end + "T23:59:59.999Z")
    .order("created_at", { ascending: false });
  if (error) {
    if ((error as { code?: string }).code === "42P01") return [];
    throw error;
  }
  return (data ?? []) as Array<{
    fire_id: string;
    rule_id: string;
    target_type: string;
    target_ref: string;
    reason_code: string;
    reason_detail: unknown;
    severity_applied: string;
    created_at: string;
  }>;
}

// Rule-family groupings match lib/rules/logic/general/*.ts registered rule ids.
const RECURRING_RULE_IDS = ["recurring_pattern_check", "recurring_missed_check"];
const UNRECORDED_LIABILITY_RULE_IDS = ["ap_missed_vendor_check", "accrual_reversal_check"];
const BANK_ACTIVITY_RULE_IDS = ["cash_negative_check"];
const CUTOFF_RULE_IDS = [
  "revenue_cutoff_check",
  "je_period_check",
  "reversing_entry_period_check",
];

// ---------- finding shapers ----------
function fluxFindings(
  varianceSection: Record<string, unknown> | null,
  detectedAt: string,
): ReviewAssistFinding[] {
  if (!varianceSection) return [];
  const flagged = Array.isArray((varianceSection as { flagged_items?: unknown[] }).flagged_items)
    ? ((varianceSection as { flagged_items: unknown[] }).flagged_items as Array<Record<string, unknown>>)
    : [];
  return flagged.map((f, idx) => {
    const pct = typeof f.pct_change === "number" ? Math.abs(f.pct_change) : 0;
    const abs = typeof f.abs_change === "number" ? Math.abs(f.abs_change) : 0;
    const rawSeverity =
      pct >= 50 || abs >= 50000 ? "high" : pct >= 20 || abs >= 10000 ? "medium" : "low";
    const account = String(f.account ?? "unknown");
    return {
      id: `flux:${account}:${idx}`,
      source: "flux",
      severity: toReviewAssistSeverity(rawSeverity as "high" | "medium" | "low"),
      title: `Variance on ${account}`,
      description:
        typeof f.commentary === "string"
          ? (f.commentary as string)
          : `${account} moved from ${f.prior} to ${f.current} (${pct.toFixed(1)}%).`,
      evidence: f,
      detected_at: detectedAt,
    };
  });
}

function anomalyFindings(
  anomaliesSection: Record<string, unknown> | null,
  detectedAt: string,
): ReviewAssistFinding[] {
  if (!anomaliesSection) return [];
  const flags = Array.isArray((anomaliesSection as { flags?: unknown[] }).flags)
    ? ((anomaliesSection as { flags: unknown[] }).flags as Array<Record<string, unknown>>)
    : [];
  return flags.map((f, idx) => {
    const category = String(f.category ?? "anomaly");
    const rawSeverity = normalizeInputSeverity(f.severity);
    return {
      id: `anomalies:${category}:${idx}`,
      source: "anomalies",
      severity: toReviewAssistSeverity(rawSeverity),
      title: `Anomaly: ${category}`,
      description: String(f.description ?? ""),
      evidence: f.evidence ?? null,
      detected_at: detectedAt,
    };
  });
}

function reconciliationFindings(
  reconSection: Record<string, unknown> | null,
  detectedAt: string,
): ReviewAssistFinding[] {
  if (!reconSection) return [];
  const accounts = Array.isArray((reconSection as { accounts?: unknown[] }).accounts)
    ? ((reconSection as { accounts: unknown[] }).accounts as Array<Record<string, unknown>>)
    : [];
  return accounts
    .filter((a) => a.status === "stale" || a.status === "not_reconciled")
    .map((a, idx) => {
      const rawSeverity = a.status === "not_reconciled" ? "high" : "warning";
      const accountName = String(a.account_name ?? "unknown");
      return {
        id: `reconciliation:${accountName}:${idx}`,
        source: "reconciliation" as const,
        severity: toReviewAssistSeverity(rawSeverity as "high" | "warning"),
        title: `Reconciliation ${a.status === "not_reconciled" ? "missing" : "stale"}: ${accountName}`,
        description:
          typeof a.note === "string" && a.note
            ? (a.note as string)
            : `Account ${accountName} is ${a.status}.`,
        evidence: a,
        detected_at: detectedAt,
      };
    });
}

function ruleFiresToFindings(
  fires: Array<{
    fire_id: string;
    rule_id: string;
    target_type: string;
    target_ref: string;
    reason_code: string;
    reason_detail: unknown;
    severity_applied: string;
    created_at: string;
  }>,
  source: ReviewAssistFindingSource,
): ReviewAssistFinding[] {
  return fires.map((r) => ({
    id: `${source}:${r.fire_id}`,
    source,
    severity: toReviewAssistSeverity(normalizeInputSeverity(r.severity_applied)),
    title: `${r.rule_id}: ${r.reason_code}`,
    description:
      r.reason_detail && typeof r.reason_detail === "object" && "message" in (r.reason_detail as object)
        ? String((r.reason_detail as { message: unknown }).message)
        : `${r.target_type} ${r.target_ref}`,
    evidence: r.reason_detail,
    detected_at: r.created_at,
  }));
}

async function uncategorizedFindings(
  firmClientId: string,
  bounds: { start: string; end: string },
): Promise<ReviewAssistFinding[]> {
  let proposals: Array<Record<string, unknown>>;
  try {
    proposals = (await listProposals(firmClientId, { status: "pending", limit: 200 })) as unknown as Array<
      Record<string, unknown>
    >;
  } catch (err) {
    // Table may not exist in dev
    if ((err as { code?: string })?.code === "42P01") return [];
    throw err;
  }
  const inPeriod = proposals.filter((p) => {
    const d = typeof p.txn_date === "string" ? (p.txn_date as string) : null;
    return !!d && d >= bounds.start && d <= bounds.end;
  });
  return inPeriod.map((p) => ({
    id: `uncategorized:${String(p.proposal_id ?? p.id ?? "?")}`,
    source: "uncategorized" as const,
    // Uncategorized proposals have no severity; surface as "note" (review-only).
    severity: toReviewAssistSeverity("note"),
    title: `Uncategorized txn ${typeof p.memo === "string" ? (p.memo as string).slice(0, 60) : ""}`.trim(),
    description: `Amount ${p.amount ?? "?"} on ${p.txn_date ?? "?"} — confidence ${p.confidence_bucket ?? "?"}.`,
    evidence: p,
    detected_at: typeof p.created_at === "string" ? (p.created_at as string) : String(p.txn_date ?? ""),
  }));
}

async function duplicateFindings(
  supabase: SupabaseClient,
  firmClientId: string,
  bounds: { start: string; end: string },
): Promise<ReviewAssistFinding[]> {
  let rows: Awaited<ReturnType<typeof listDuplicatesForPeriod>>;
  try {
    rows = await listDuplicatesForPeriod(supabase, {
      firmClientId,
      periodStart: bounds.start,
      periodEnd: bounds.end,
    });
  } catch (err) {
    if ((err as { code?: string })?.code === "42P01") return [];
    throw err;
  }
  return rows.map((d) => ({
    id: `duplicate:${d.bill_id}:${d.matched_bill_id}:${d.strategy_id}`,
    source: "duplicate" as const,
    severity: toReviewAssistSeverity(normalizeInputSeverity(d.severity)),
    title: `Duplicate bill (${d.strategy_id})`,
    description: `Bill ${d.bill_id} matches ${d.matched_bill_id} — confidence ${d.confidence ?? "?"}${d.quarantined ? " (quarantined)" : ""}.`,
    evidence: d,
    detected_at: d.detected_at,
  }));
}

// ---------- entry point ----------
export async function composeReviewAssistFindings(
  args: ComposeArgs,
): Promise<ReviewAssistFindingsPayload> {
  const { supabase, firmClientId, period } = args;
  const bounds = periodBounds(period);
  const closePeriod = await resolveClosePeriod(supabase, firmClientId, period);
  const packet = closePeriod ? await resolveLatestPacket(supabase, closePeriod.id) : null;

  const [varianceSection, anomaliesSection, reconSection, coverage] = await Promise.all([
    packet ? loadPacketSection(supabase, packet.id, "variance") : Promise.resolve(null),
    packet ? loadPacketSection(supabase, packet.id, "anomalies") : Promise.resolve(null),
    packet ? loadPacketSection(supabase, packet.id, "recon") : Promise.resolve(null),
    packet ? loadCoverage(supabase, packet.id) : Promise.resolve(null),
  ]);

  const packetDetectedAt = new Date().toISOString(); // packet-derived findings share a timestamp

  const [recurringFires, unrecordedFires, bankFires, cutoffFires, uncategorized, duplicates] =
    await Promise.all([
      loadRuleFires(supabase, firmClientId, RECURRING_RULE_IDS, bounds),
      loadRuleFires(supabase, firmClientId, UNRECORDED_LIABILITY_RULE_IDS, bounds),
      loadRuleFires(supabase, firmClientId, BANK_ACTIVITY_RULE_IDS, bounds),
      loadRuleFires(supabase, firmClientId, CUTOFF_RULE_IDS, bounds),
      uncategorizedFindings(firmClientId, bounds),
      duplicateFindings(supabase, firmClientId, bounds),
    ]);

  const findings: ReviewAssistFinding[] = [
    ...fluxFindings(varianceSection, packetDetectedAt),
    ...anomalyFindings(anomaliesSection, packetDetectedAt),
    ...ruleFiresToFindings(recurringFires, "recurring_patterns"),
    ...ruleFiresToFindings(unrecordedFires, "unrecorded_liability"),
    ...reconciliationFindings(reconSection, packetDetectedAt),
    ...ruleFiresToFindings(bankFires, "bank_activity"),
    ...ruleFiresToFindings(cutoffFires, "cutoff"),
    ...uncategorized,
    ...duplicates,
  ];

  // Stable ordering: blocker > warning > note, then by source, then detected_at desc.
  const severityRank: Record<ReviewAssistSeverity, number> = { blocker: 0, warning: 1, note: 2 };
  findings.sort((a, b) => {
    const s = severityRank[a.severity] - severityRank[b.severity];
    if (s !== 0) return s;
    if (a.source !== b.source) return a.source.localeCompare(b.source);
    return b.detected_at.localeCompare(a.detected_at);
  });

  const source_counts: Record<ReviewAssistFindingSource, number> = {
    flux: 0,
    anomalies: 0,
    recurring_patterns: 0,
    unrecorded_liability: 0,
    reconciliation: 0,
    bank_activity: 0,
    cutoff: 0,
    uncategorized: 0,
    duplicate: 0,
  };
  for (const f of findings) source_counts[f.source] += 1;

  return {
    firm_client_id: firmClientId,
    period,
    close_period_id: closePeriod?.id ?? null,
    close_packet_id: packet?.id ?? null,
    packet_version: packet?.version ?? null,
    coverage,
    findings,
    meta: {
      generated_at: new Date().toISOString(),
      period_start: closePeriod?.period_start ?? bounds.start,
      period_end: closePeriod?.period_end ?? bounds.end,
      source_counts,
    },
  };
}
