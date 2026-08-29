/**
 * JE-1 source custody loaders.
 * Exact CC run → exact accounting sync → exact authoritative recon runs.
 * No pointer/latest/period fallback. No provider write.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { asIsoDate } from "@/lib/audit-ready/measurement-snapshots/validate";
import {
  JE_PROPOSAL_ERROR,
  JE_SOURCE_RECON_KINDS,
  JE_LIVE_PROVIDER_SOURCE_RECON_KINDS,
} from "./types";
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

/** Live-provider BS account slot — baselineSyncId must stay null (no synthetic sync). */
export type CcObservationBsAccountSlot = {
  runId: string | null;
  authoritative: boolean;
  baselineSyncId: null;
  measurementSource: "live_provider";
  qboAccountId: string;
};

export type CcObservationSummary = {
  reconciliations: {
    ar: CcObservationReconSlot | null;
    ap: CcObservationReconSlot | null;
    inventory: CcObservationReconSlot | null;
    /** Optional governed live-provider BS liability source slot. */
    bsAccount: CcObservationBsAccountSlot | null;
  };
};

export type CcReconSlotName = "ar" | "ap" | "inventory" | "bsAccount";

export type ResolvedCcReconSlot = {
  slotName: CcReconSlotName;
  expectedKind: JeSourceReconKind;
  measurementMode: "sync_backed" | "live_provider";
  /** Exact QBO account for live_provider bs_account_recon. */
  qboAccountId: string | null;
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
  /** NULL for live_provider bs_account_recon; non-null for sync-backed kinds. */
  baselineSyncId: string | null;
  measurementMode: "sync_backed" | "live_provider";
  qboAccountId: string | null;
  totalsStatus: string | null;
  providerBackedGlEndingBalanceCents: number | null;
  preparedOrTbEndingBalanceCents: number | null;
  tieVarianceCents: number | null;
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

function parseBsAccountSlot(raw: unknown): CcObservationBsAccountSlot | null {
  if (raw == null) return null;
  if (!raw || typeof raw !== "object") {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_SUMMARY_MALFORMED,
      "observation_summary.reconciliations.bsAccount is malformed.",
    );
  }
  const row = raw as Record<string, unknown>;
  const qboAccountId = requireText(row.qboAccountId);
  if (!qboAccountId) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_LIVE_PROVIDER_SLOT_INVALID,
      "bsAccount slot requires qboAccountId.",
    );
  }
  if (String(row.measurementSource || "") !== "live_provider") {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_LIVE_PROVIDER_SLOT_INVALID,
      "bsAccount slot measurementSource must be live_provider.",
    );
  }
  if (row.baselineSyncId != null && String(row.baselineSyncId).trim() !== "") {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_LIVE_PROVIDER_SLOT_INVALID,
      "bsAccount slot baselineSyncId must be null (no synthetic sync).",
    );
  }
  return {
    runId: row.runId == null || row.runId === "" ? null : String(row.runId),
    authoritative: Boolean(row.authoritative),
    baselineSyncId: null,
    measurementSource: "live_provider",
    qboAccountId,
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
      bsAccount:
        "bsAccount" in slots ? parseBsAccountSlot(slots.bsAccount) : null,
    },
  };
}

/**
 * Prove the requested recon run was an authoritative slot on the exact
 * source Continuous Close observation_summary. Do not invent authority from
 * a standalone tie-out row.
 *
 * Sync-backed slots (ar/ap/inventory) require baselineSyncId === CC sync.
 * Live-provider bsAccount requires baselineSyncId NULL + measurementSource.
 */
export function resolveAuthoritativeCcReconSlot(args: {
  observationSummary: CcObservationSummary;
  requestedRunId: string;
  sourceAccountingSyncId: string;
}): ResolvedCcReconSlot {
  const requested = requireText(args.requestedRunId);
  const syncBackedMatches: Array<"ar" | "ap" | "inventory"> = [];
  for (const slotName of ["ar", "ap", "inventory"] as const) {
    const slot = args.observationSummary.reconciliations[slotName];
    if (slot?.runId && slot.runId === requested) syncBackedMatches.push(slotName);
  }
  const bsSlot = args.observationSummary.reconciliations.bsAccount;
  const bsMatch = Boolean(bsSlot?.runId && bsSlot.runId === requested);

  if (syncBackedMatches.length === 0 && !bsMatch) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_SLOT_ABSENT,
      "Requested recon run is not present in the source Continuous Close observation_summary.",
    );
  }
  if (syncBackedMatches.length + (bsMatch ? 1 : 0) > 1) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_SUMMARY_MALFORMED,
      "Requested recon run maps to multiple Continuous Close observation slots.",
    );
  }

  if (bsMatch && bsSlot) {
    if (bsSlot.authoritative !== true) {
      throw new JeProposalCustodyError(
        JE_PROPOSAL_ERROR.RECON_NOT_AUTHORITATIVE,
        "Source Continuous Close bsAccount slot is not authoritative.",
      );
    }
    if (bsSlot.measurementSource !== "live_provider" || bsSlot.baselineSyncId != null) {
      throw new JeProposalCustodyError(
        JE_PROPOSAL_ERROR.RECON_LIVE_PROVIDER_SLOT_INVALID,
        "bsAccount slot must be live_provider with null baselineSyncId.",
      );
    }
    // CC still has a real accounting_sync_id for proposal period custody;
    // BS measurement itself is live_provider and must not borrow that sync.
    void args.sourceAccountingSyncId;
    return {
      slotName: "bsAccount",
      expectedKind: "bs_account_recon",
      measurementMode: "live_provider",
      qboAccountId: bsSlot.qboAccountId,
    };
  }

  const slotName = syncBackedMatches[0];
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
  return {
    slotName,
    expectedKind: SLOT_TO_KIND[slotName],
    measurementMode: "sync_backed",
    qboAccountId: null,
  };
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
 * Sync-backed kinds (ar/ap/inventory): durable custody is baseline_sync_id
 * equal to the CC accounting sync. NULL baseline is rejected.
 *
 * Live-provider bs_account_recon: baseline_sync_id MUST remain NULL
 * (no synthetic sync). Account binding comes from artifact + slot.
 */
export async function loadExactAuthoritativeReconRun(args: {
  runId: string;
  expectedEngagementId: string;
  expectedPeriodEnd: string;
  /** Required for sync_backed; must be null for live_provider. */
  expectedBaselineSyncId: string | null;
  expectedKind: JeSourceReconKind;
  measurementMode: "sync_backed" | "live_provider";
  /** Required for live_provider bs_account_recon. */
  expectedQboAccountId?: string | null;
}): Promise<SourceReconRun> {
  const runId = requireText(args.runId);
  const liveProvider = args.measurementMode === "live_provider";
  if (
    liveProvider &&
    !(JE_LIVE_PROVIDER_SOURCE_RECON_KINDS as readonly string[]).includes(
      args.expectedKind,
    )
  ) {
    throw new JeProposalCustodyError(
      JE_PROPOSAL_ERROR.RECON_KIND_UNSUPPORTED,
      `Kind ${args.expectedKind} is not a live_provider JE source kind.`,
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("audit_ready_tie_out_runs")
    .select(
      "id, engagement_id, period_end, tie_out_kind, status, recon_outcome, " +
        "baseline_sync_id, totals_status, subledger_total_cents, gl_total_cents, " +
        "totals_variance_cents",
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

  let qboAccountId: string | null = null;
  let providerBackedGlEndingBalanceCents: number | null = null;
  let preparedOrTbEndingBalanceCents: number | null = null;
  let tieVarianceCents: number | null = null;
  let totalsStatus: string | null = data.totals_status
    ? String(data.totals_status)
    : null;

  if (liveProvider) {
    if (data.baseline_sync_id) {
      throw new JeProposalCustodyError(
        JE_PROPOSAL_ERROR.RECON_LIVE_PROVIDER_BASELINE_NOT_NULL,
        "live_provider bs_account_recon must keep baseline_sync_id NULL (no synthetic sync).",
      );
    }
    if (args.expectedBaselineSyncId != null) {
      throw new JeProposalCustodyError(
        JE_PROPOSAL_ERROR.RECON_LIVE_PROVIDER_SLOT_INVALID,
        "live_provider load must not expect a baseline sync id.",
      );
    }
    // BS resolver does not stamp recon_outcome; totals_status is the custody signal.
    if (!totalsStatus) {
      throw new JeProposalCustodyError(
        JE_PROPOSAL_ERROR.RECON_OUTCOME_MISSING,
        "live_provider bs_account_recon requires totals_status.",
      );
    }
    if (
      data.subledger_total_cents == null ||
      data.gl_total_cents == null ||
      data.totals_variance_cents == null
    ) {
      throw new JeProposalCustodyError(
        JE_PROPOSAL_ERROR.RECON_BS_SOURCE_FACTS_INVALID,
        "live_provider bs_account_recon requires GL/TB/variance cents on the run.",
      );
    }
    providerBackedGlEndingBalanceCents = Number(data.subledger_total_cents);
    preparedOrTbEndingBalanceCents = Number(data.gl_total_cents);
    tieVarianceCents = Number(data.totals_variance_cents);

    const { data: artifact, error: artErr } = await supabase
      .from("audit_ready_bs_recon_artifacts")
      .select("qbo_account_id")
      .eq("run_id", runId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (artErr || !artifact?.qbo_account_id) {
      throw new JeProposalCustodyError(
        JE_PROPOSAL_ERROR.RECON_LIVE_PROVIDER_ACCOUNT_MISMATCH,
        "bs_account_recon artifact with qbo_account_id is required.",
      );
    }
    qboAccountId = String(artifact.qbo_account_id);
    const expectedAccount = requireText(args.expectedQboAccountId);
    if (!expectedAccount || qboAccountId !== expectedAccount) {
      throw new JeProposalCustodyError(
        JE_PROPOSAL_ERROR.RECON_LIVE_PROVIDER_ACCOUNT_MISMATCH,
        "bs_account_recon account must match the CC bsAccount slot qboAccountId.",
      );
    }
  } else {
    if (!data.recon_outcome) {
      throw new JeProposalCustodyError(
        JE_PROPOSAL_ERROR.RECON_OUTCOME_MISSING,
        "Recon run recon_outcome is required.",
      );
    }
    if (!data.baseline_sync_id) {
      throw new JeProposalCustodyError(
        JE_PROPOSAL_ERROR.RECON_BASELINE_NULL,
        "NULL baseline_sync_id is not an allowed JE-1 sync-backed source.",
      );
    }
    if (
      !args.expectedBaselineSyncId ||
      String(data.baseline_sync_id) !== args.expectedBaselineSyncId
    ) {
      throw new JeProposalCustodyError(
        JE_PROPOSAL_ERROR.RECON_BASELINE_MISMATCH,
        "Recon baseline_sync_id must equal the CC source accounting sync.",
      );
    }
  }

  return {
    id: String(data.id),
    engagementId: String(data.engagement_id),
    periodEnd,
    tieOutKind: kind as JeSourceReconKind,
    status: String(data.status),
    reconOutcome: data.recon_outcome ? String(data.recon_outcome) : null,
    baselineSyncId: data.baseline_sync_id
      ? String(data.baseline_sync_id)
      : null,
    measurementMode: liveProvider ? "live_provider" : "sync_backed",
    qboAccountId,
    totalsStatus,
    providerBackedGlEndingBalanceCents,
    preparedOrTbEndingBalanceCents,
    tieVarianceCents,
  };
}

/**
 * Map COA account type → BS Asset/Liability/Equity for first-run liability path.
 * Fail-closed: unknown types return null (caller must reject).
 */
export function bsClassificationFromCoaAccountType(
  accountType: string,
): "Asset" | "Liability" | "Equity" | null {
  const t = String(accountType || "").trim();
  if (
    t === "Other Current Liability" ||
    t === "Long Term Liability" ||
    t === "Accounts Payable" ||
    t === "Credit Card"
  ) {
    return "Liability";
  }
  if (
    t === "Bank" ||
    t === "Other Current Asset" ||
    t === "Fixed Asset" ||
    t === "Other Asset" ||
    t === "Accounts Receivable"
  ) {
    return "Asset";
  }
  if (t === "Equity") return "Equity";
  return null;
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
