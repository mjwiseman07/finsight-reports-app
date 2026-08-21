/**
 * JE-1 source custody loaders.
 * Exact CC run → exact accounting sync → exact authoritative recon runs.
 * No pointer/latest/period fallback. No provider write.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { asIsoDate } from "@/lib/audit-ready/measurement-snapshots/validate";
import { JE_PROPOSAL_ERROR, JE_SOURCE_RECON_KINDS } from "./types";
import type { JeProposalAccountMeta, JeSourceReconKind } from "./types";

export class JeProposalCustodyError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "JeProposalCustodyError";
    this.code = code;
  }
}

function requireText(value: unknown): string {
  return String(value || "").trim();
}

export type CcObservationReconSlot = {
  runId: string | null;
  authoritative: boolean;
  baselineSyncId: string | null;
};

export type CcObservationSummary = {
  reconciliations: {
    ar: CcObservationReconSlot | null;
    ap: CcObservationReconSlot | null;
    inventory: CcObservationReconSlot | null;
  };
};

export type SourceContinuousCloseRun = {
  id: string;
  companyId: string;
  engagementId: string;
  firmClientId: string | null;
  accountingSyncId: string;
  periodEnd: string;
  mode: string;
  status: string;
  readiness: string | null;
  observationSummary: CcObservationSummary;
};

export type SourceAccountingSync = {
  id: string;
  companyId: string;
  periodStart: string | null;
  periodEnd: string;
  validationStatus: string;
  sourceSystem: string;
};

export type SourceReconRun = {
  id: string;
  engagementId: string;
  periodEnd: string | null;
  tieOutKind: JeSourceReconKind;
  status: string;
  reconOutcome: string | null;
  baselineSyncId: string;
};

export type EngagementCustody = {
  id: string;
  companyId: string;
  firmId: string | null;
  firmClientId: string | null;
  arControlAccountId: string | null;
  apControlAccountId: string | null;
  inventoryControlAccountId: string | null;
};

const SLOT_TO_KIND: Record<"ar" | "ap" | "inventory", JeSourceReconKind> = {
  ar: "ar_aging",
  ap: "ap_aging",
  inventory: "inventory",
};

function parseObservationSlot(raw: unknown): CcObservationReconSlot | null {
  if (raw == null) return null;
  if (!raw || typeof raw !== "object") {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_SUMMARY_MALFORMED,
      "observation_summary reconciliations slot is malformed.",
    );
  }
  const row = raw as Record<string, unknown>;
  return {
    runId: row.runId == null || row.runId === "" ? null : String(row.runId),
    authoritative: Boolean(row.authoritative),
    baselineSyncId:
      row.baselineSyncId == null || row.baselineSyncId === ""
        ? null
        : String(row.baselineSyncId),
  };
}

export function parseCcObservationSummary(
  raw: unknown,
): CcObservationSummary {
  if (!raw || typeof raw !== "object") {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_SUMMARY_MALFORMED,
      "continuous_close_runs.observation_summary is missing or malformed.",
    );
  }
  const summary = raw as Record<string, unknown>;
  const reconciliations = summary.reconciliations;
  if (!reconciliations || typeof reconciliations !== "object") {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_SUMMARY_MALFORMED,
      "observation_summary.reconciliations is missing or malformed.",
    );
  }
  const slots = reconciliations as Record<string, unknown>;
  return {
    reconciliations: {
      ar: parseObservationSlot(slots.ar),
      ap: parseObservationSlot(slots.ap),
      inventory: parseObservationSlot(slots.inventory),
    },
  };
}

/**
 * Prove the requested recon run was an authoritative slot on the exact
 * source Continuous Close observation_summary. Do not invent authority from
 * a standalone tie-out row.
 */
export function resolveAuthoritativeCcReconSlot(args: {
  observationSummary: CcObservationSummary;
  requestedRunId: string;
  sourceAccountingSyncId: string;
}): { slotName: "ar" | "ap" | "inventory"; expectedKind: JeSourceReconKind } {
  const requested = requireText(args.requestedRunId);
  const matches: Array<"ar" | "ap" | "inventory"> = [];
  for (const slotName of ["ar", "ap", "inventory"] as const) {
    const slot = args.observationSummary.reconciliations[slotName];
    if (slot?.runId && slot.runId === requested) matches.push(slotName);
  }
  if (matches.length === 0) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_SLOT_ABSENT,
      "Requested recon run is not present in the source Continuous Close observation_summary.",
    );
  }
  if (matches.length > 1) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_SUMMARY_MALFORMED,
      "Requested recon run maps to multiple Continuous Close observation slots.",
    );
  }
  const slotName = matches[0];
  const slot = args.observationSummary.reconciliations[slotName];
  if (!slot || slot.authoritative !== true) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_NOT_AUTHORITATIVE,
      "Source Continuous Close recon slot is not authoritative.",
    );
  }
  if (slot.runId !== requested) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_SLOT_ABSENT,
      "Source Continuous Close recon slot runId mismatch.",
    );
  }
  if (!slot.baselineSyncId) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_SLOT_BASELINE_MISMATCH,
      "Source Continuous Close recon slot baselineSyncId is missing.",
    );
  }
  if (slot.baselineSyncId !== args.sourceAccountingSyncId) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_SLOT_BASELINE_MISMATCH,
      "Source Continuous Close recon slot baselineSyncId must equal the CC accounting sync.",
    );
  }
  return { slotName, expectedKind: SLOT_TO_KIND[slotName] };
}

export async function loadEngagementCustody(
  engagementId: string,
): Promise<EngagementCustody> {
  const id = requireText(engagementId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("audit_ready_engagements")
    .select(
      "id, company_id, firm_id, firm_client_id, " +
        "ar_control_qbo_account_id, ap_control_qbo_account_id, inventory_control_qbo_account_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new JeProposalCustodyError(JE_PROPOSAL_ERROR.WRITE_FORBIDDEN, error.message);
  if (!data?.id || !data.company_id) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.WRITE_FORBIDDEN,
      "Engagement was not found.",
    );
  }
  return {
    id: String(data.id),
    companyId: String(data.company_id),
    firmId: data.firm_id ? String(data.firm_id) : null,
    firmClientId: data.firm_client_id ? String(data.firm_client_id) : null,
    arControlAccountId: data.ar_control_qbo_account_id
      ? String(data.ar_control_qbo_account_id)
      : null,
    apControlAccountId: data.ap_control_qbo_account_id
      ? String(data.ap_control_qbo_account_id)
      : null,
    inventoryControlAccountId: data.inventory_control_qbo_account_id
      ? String(data.inventory_control_qbo_account_id)
      : null,
  };
}

export async function loadExactContinuousCloseRun(args: {
  runId: string;
  expectedEngagementId: string;
  expectedCompanyId: string;
}): Promise<SourceContinuousCloseRun> {
  const runId = requireText(args.runId);
  if (!runId) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.CC_RUN_REQUIRED,
      "sourceContinuousCloseRunId is required.",
    );
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("continuous_close_runs")
    .select(
      "id, company_id, engagement_id, firm_client_id, accounting_sync_id, " +
        "period_end, mode, status, readiness, observation_summary",
    )
    .eq("id", runId)
    .maybeSingle();
  if (error) {
    throw new JeProposalCustodyError(JE_PROPOSAL_ERROR.CC_RUN_NOT_FOUND, error.message);
  }
  if (!data?.id) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.CC_RUN_NOT_FOUND,
      "continuous_close_runs row was not found.",
    );
  }
  if (String(data.engagement_id) !== args.expectedEngagementId) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.CC_ENGAGEMENT_MISMATCH,
      "CC run engagement_id does not match proposal engagement.",
    );
  }
  if (String(data.company_id) !== args.expectedCompanyId) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.CC_COMPANY_MISMATCH,
      "CC run company_id does not match engagement company.",
    );
  }
  if (String(data.status) !== "completed") {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.CC_STATUS_INVALID,
      "CC run status must be completed.",
    );
  }
  if (String(data.mode) !== "OBSERVE") {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.CC_MODE_INVALID,
      "CC run mode must be OBSERVE.",
    );
  }
  return {
    id: String(data.id),
    companyId: String(data.company_id),
    engagementId: String(data.engagement_id),
    firmClientId: data.firm_client_id ? String(data.firm_client_id) : null,
    accountingSyncId: String(data.accounting_sync_id),
    periodEnd: asIsoDate(data.period_end) || String(data.period_end).slice(0, 10),
    mode: String(data.mode),
    status: String(data.status),
    readiness: data.readiness ? String(data.readiness) : null,
    observationSummary: parseCcObservationSummary(data.observation_summary),
  };
}

export async function loadExactSourceAccountingSync(args: {
  accountingSyncId: string;
  expectedCompanyId: string;
  expectedPeriodEnd: string;
}): Promise<SourceAccountingSync> {
  const syncId = requireText(args.accountingSyncId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounting_syncs")
    .select(
      "id, company_id, report_period_start, report_period_end, validation_status, source_system",
    )
    .eq("id", syncId)
    .maybeSingle();
  if (error || !data?.id) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.SYNC_NOT_FOUND,
      "Source accounting_syncs row was not found.",
    );
  }
  if (String(data.validation_status || "") !== "SUCCESS") {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.SYNC_NOT_SUCCESS,
      "Source accounting_syncs.validation_status must be SUCCESS.",
    );
  }
  if (String(data.company_id) !== args.expectedCompanyId) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.SYNC_COMPANY_MISMATCH,
      "Source accounting sync company mismatch.",
    );
  }
  const periodEnd = asIsoDate(data.report_period_end) || String(data.report_period_end).slice(0, 10);
  if (periodEnd !== args.expectedPeriodEnd) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.SYNC_PERIOD_MISMATCH,
      "Source accounting sync period_end mismatch.",
    );
  }
  return {
    id: String(data.id),
    companyId: String(data.company_id),
    periodStart: data.report_period_start
      ? asIsoDate(data.report_period_start) || String(data.report_period_start).slice(0, 10)
      : null,
    periodEnd,
    validationStatus: String(data.validation_status),
    sourceSystem: String(data.source_system || ""),
  };
}

/**
 * Load the exact audit_ready_tie_out_runs row after CC observation_summary
 * has already proven the run was an authoritative slot.
 *
 * Durable run custody is baseline_sync_id. Do NOT invent a second custody
 * column on the tie-out run table — that is not part of the CC-2A contract.
 */
export async function loadExactAuthoritativeReconRun(args: {
  runId: string;
  expectedEngagementId: string;
  expectedPeriodEnd: string;
  expectedBaselineSyncId: string;
  expectedKind: JeSourceReconKind;
}): Promise<SourceReconRun> {
  const runId = requireText(args.runId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("audit_ready_tie_out_runs")
    .select(
      "id, engagement_id, period_end, tie_out_kind, status, recon_outcome, baseline_sync_id",
    )
    .eq("id", runId)
    .maybeSingle();
  if (error || !data?.id) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_NOT_FOUND,
      `Tie-out run ${runId} was not found.`,
    );
  }
  if (String(data.engagement_id) !== args.expectedEngagementId) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_ENGAGEMENT_MISMATCH,
      "Recon run engagement mismatch.",
    );
  }
  const periodEnd = data.period_end
    ? asIsoDate(data.period_end) || String(data.period_end).slice(0, 10)
    : null;
  if (periodEnd !== args.expectedPeriodEnd) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_PERIOD_MISMATCH,
      "Recon run period_end mismatch.",
    );
  }
  if (String(data.status || "") !== "completed") {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_NOT_COMPLETED,
      "Recon run must be completed.",
    );
  }
  if (!data.recon_outcome) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_OUTCOME_MISSING,
      "Recon run recon_outcome is required.",
    );
  }
  if (!data.baseline_sync_id) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_BASELINE_NULL,
      "NULL baseline_sync_id is not an allowed JE-1 source.",
    );
  }
  if (String(data.baseline_sync_id) !== args.expectedBaselineSyncId) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_BASELINE_MISMATCH,
      "Recon baseline_sync_id must equal the CC source accounting sync.",
    );
  }
  const kind = String(data.tie_out_kind || "");
  if (!(JE_SOURCE_RECON_KINDS as readonly string[]).includes(kind)) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_KIND_UNSUPPORTED,
      `Recon kind ${kind} is not a JE-1 authoritative source kind.`,
    );
  }
  if (kind !== args.expectedKind) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_KIND_MISMATCH,
      "Recon tie_out_kind does not match the source Continuous Close observation slot.",
    );
  }
  return {
    id: String(data.id),
    engagementId: String(data.engagement_id),
    periodEnd,
    tieOutKind: kind as JeSourceReconKind,
    status: String(data.status),
    reconOutcome: data.recon_outcome ? String(data.recon_outcome) : null,
    baselineSyncId: String(data.baseline_sync_id),
  };
}

export async function assertClosePeriodNotLocked(args: {
  firmClientId: string | null;
  txnDate: string;
}): Promise<void> {
  const firmClientId = requireText(args.firmClientId);
  if (!firmClientId) return;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("close_periods")
    .select("id, status")
    .eq("firm_client_id", firmClientId)
    .in("status", ["locked", "signed_off"])
    .lte("period_start", args.txnDate)
    .gte("period_end", args.txnDate)
    .maybeSingle();
  if (error) {
    throw new JeProposalCustodyError(JE_PROPOSAL_ERROR.PERIOD_LOCKED, error.message);
  }
  if (data?.id) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.PERIOD_LOCKED,
      "Close period is locked or signed_off for txnDate.",
    );
  }
}

/**
 * Load account metadata from persisted qbo_coa_mirror (no provider write).
 * Fail closed if any account id is missing.
 */
export async function loadAccountsFromCoaMirror(args: {
  firmClientId: string;
  accountIds: readonly string[];
}): Promise<Map<string, JeProposalAccountMeta>> {
  const ids = [...new Set(args.accountIds.map((id) => String(id).trim()).filter(Boolean))];
  const map = new Map<string, JeProposalAccountMeta>();
  if (ids.length === 0) return map;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("qbo_coa_mirror")
    .select("external_account_id, account_type, account_subtype, active, account_name")
    .eq("firm_client_id", args.firmClientId)
    .in("external_account_id", ids);
  if (error) {
    throw new JeProposalCustodyError(JE_PROPOSAL_ERROR.ACCOUNT_NOT_FOUND, error.message);
  }
  for (const row of data || []) {
    map.set(String(row.external_account_id), {
      accountId: String(row.external_account_id),
      accountType: String(row.account_type || ""),
      accountSubtype: row.account_subtype ? String(row.account_subtype) : null,
      active: Boolean(row.active),
      name: row.account_name ? String(row.account_name) : null,
    });
  }
  for (const id of ids) {
    if (!map.has(id)) {
      throw new JeProposalCustodyError(
        JE_PROPOSAL_ERROR.ACCOUNT_NOT_FOUND,
        `Account ${id} was not found in qbo_coa_mirror.`,
      );
    }
  }
  return map;
}

export type { JeSourceReconKind };
