/**
 * D6.4d — Queue mapping, cursor pagination, and status filters.
 */
import type { JEDraft } from "@/lib/pre-close/types";
import type {
  FilterParams,
  LedgerEventSummary,
  RemediationLogEntry,
  ReviewItemDetail,
  ReviewerQueueItem,
  ReviewerSeverity,
} from "@/lib/pre-close/reviewer-types";
import { rowToReviewItem } from "@/lib/pre-close/insert-review-item";

export function mapSeverity(dbSeverity: string): ReviewerSeverity {
  if (dbSeverity === "info") return "info";
  if (dbSeverity === "warning" || dbSeverity === "critical") return "warn";
  return "error";
}

export function severityToDb(severity: ReviewerSeverity): string[] {
  if (severity === "info") return ["info"];
  if (severity === "warn") return ["warning", "critical"];
  return ["error"];
}

export interface CursorPayload {
  lastCreatedAt: string;
  lastId: string;
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as CursorPayload;
    if (!parsed.lastCreatedAt || !parsed.lastId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function matchesStatusFilter(
  row: {
    decision: string | null;
    posted_je_attempt_id: string | null;
    post_block_reason: string | null;
  },
  status: FilterParams["status"],
): boolean {
  if (!status || status === "all") return true;
  if (status === "pending") return row.decision == null;
  if (status === "posted") return row.posted_je_attempt_id != null;
  if (status === "blocked") return row.post_block_reason != null;
  if (status === "decided") {
    return (
      row.decision != null &&
      row.posted_je_attempt_id == null &&
      row.post_block_reason == null
    );
  }
  return true;
}

type QueueRow = Record<string, unknown> & {
  firm_clients?: { name?: string } | { name?: string }[] | null;
  engagements?: { engagement_name?: string } | { engagement_name?: string }[] | null;
  je_post_attempts?: { qbo_je_id?: string } | { qbo_je_id?: string }[] | null;
};

function embedName(
  rel: { name?: string } | { name?: string }[] | { engagement_name?: string } | { engagement_name?: string }[] | null | undefined,
  key: "name" | "engagement_name" = "name",
): string {
  if (!rel) return "";
  const row = Array.isArray(rel) ? rel[0] : rel;
  if (!row) return "";
  return String((row as Record<string, unknown>)[key] ?? "");
}

function embedQboJeId(
  rel: { qbo_je_id?: string } | { qbo_je_id?: string }[] | null | undefined,
): string | null {
  if (!rel) return null;
  const row = Array.isArray(rel) ? rel[0] : rel;
  return (row?.qbo_je_id as string | undefined) ?? null;
}

export function mapQueueRow(row: QueueRow): ReviewerQueueItem {
  const detail = typeof row.rule_reason_detail === "object" && row.rule_reason_detail != null
    ? JSON.stringify(row.rule_reason_detail)
    : row.rule_reason_detail != null
      ? String(row.rule_reason_detail)
      : null;

  return {
    id: String(row.id),
    firmClientId: String(row.firm_client_id),
    firmClientName: embedName(row.firm_clients as QueueRow["firm_clients"], "name"),
    engagementId: String(row.engagement_id),
    engagementName: embedName(row.engagements as QueueRow["engagements"], "engagement_name"),
    closePeriodId: (row.close_period_id as string | null) ?? null,
    ruleId: String(row.rule_id),
    ruleVersion: String(row.rule_version),
    severity: mapSeverity(String(row.severity ?? "info")),
    ruleReasonCode: String(row.rule_reason_code ?? ""),
    ruleReasonDetail: detail,
    createdAt: String(row.created_at),
    decision: (row.decision as ReviewerQueueItem["decision"]) ?? null,
    decisionAt: (row.decision_at as string | null) ?? null,
    reviewerUserId: (row.reviewer_user_id as string | null) ?? null,
    postedJeAttemptId: (row.posted_je_attempt_id as string | null) ?? null,
    postBlockReason: (row.post_block_reason as ReviewerQueueItem["postBlockReason"]) ?? null,
    qboJeId: embedQboJeId(row.je_post_attempts as QueueRow["je_post_attempts"]),
  };
}

export function mapReviewItemDetail(
  row: Record<string, unknown>,
  extras: {
    firmClientName: string;
    engagementName: string;
    qboJeId: string | null;
    postingLedgerEvents: LedgerEventSummary[];
    remediationLog: RemediationLogEntry[];
  },
): ReviewItemDetail {
  const base = rowToReviewItem(row);
  const queue = mapQueueRow({
    ...row,
    firm_clients: { name: extras.firmClientName },
    engagements: { engagement_name: extras.engagementName },
    je_post_attempts: extras.qboJeId ? { qbo_je_id: extras.qboJeId } : null,
  });

  return {
    ...queue,
    assertionTags: (row.assertion_tags as string[] | null) ?? [],
    evidenceRefs: base.evidenceRefs,
    basisGuardReasonCode: base.basisGuardReasonCode,
    basisGuardReasonText: base.basisGuardReasonText,
    jeDraft: base.jeDraft as JEDraft,
    editedJeDraft: base.editedJeDraft,
    decisionReasonCode: base.decisionReasonCode,
    decisionReasonText: base.decisionReasonText,
    postingLedgerEvents: extras.postingLedgerEvents,
    remediationLog: extras.remediationLog,
    proposedByUserId: (row.proposed_by_user_id as string | null) ?? null,
    approvedByUserId: (row.approved_by_user_id as string | null) ?? null,
    materialityBucket: (row.materiality_bucket as ReviewItemDetail["materialityBucket"]) ?? null,
    requiresMfaStepUp: Boolean(row.requires_mfa_step_up),
    autonomousLane: Boolean(row.autonomous_lane),
    gap3Grandfathered: Boolean(row.gap3_grandfathered),
  };
}

export function mapRemediationLog(rows: Array<Record<string, unknown>>): RemediationLogEntry[] {
  return rows.map((r) => ({
    timestamp: String(r.created_at ?? ""),
    actionType: String(r.action_type ?? ""),
    category: r.action_category as RemediationLogEntry["category"],
    inputSummary: String(r.input_summary ?? ""),
    outputSummary: String(r.output_summary ?? ""),
  }));
}

export function mapLedgerEvents(rows: Array<Record<string, unknown>>): LedgerEventSummary[] {
  return rows.map((r) => ({
    eventId: String(r.event_id ?? r.id ?? ""),
    eventType: String(r.event_type ?? ""),
    eventCategory: String(r.event_category ?? ""),
    createdAt: String(r.created_at ?? ""),
    payload: r.payload ?? {},
  }));
}

export interface GapQueueRow {
  id: string;
  firm_client_id: string;
  engagement_id: string;
  close_period_id: string;
  account_category: string;
  assertion_id: string;
  gap_root_cause_code: string;
  gap_recommendation: string | null;
  severity: string;
  resolution_status: string;
  created_at: string;
  engagements?: { engagement_name?: string } | null;
  firm_clients?: { name?: string } | null;
}

export function mapGapQueueRow(row: GapQueueRow): {
  id: string;
  origin: "gap";
  firmClientName: string | null;
  engagementName: string | null;
  accountCategory: string;
  assertionId: string;
  severity: "info" | "warn" | "error";
  status: "pending" | "decided";
  gapRootCauseCode: string;
  gapRecommendation: string | null;
  createdAt: string;
} {
  const sev =
    row.severity === "critical" ? "error" : row.severity === "warning" ? "warn" : "info";
  return {
    id: row.id,
    origin: "gap",
    firmClientName: row.firm_clients?.name ?? null,
    engagementName: row.engagements?.engagement_name ?? null,
    accountCategory: row.account_category,
    assertionId: row.assertion_id,
    severity: sev as "info" | "warn" | "error",
    status: row.resolution_status === "open" ? "pending" : "decided",
    gapRootCauseCode: row.gap_root_cause_code,
    gapRecommendation: row.gap_recommendation,
    createdAt: row.created_at,
  };
}
