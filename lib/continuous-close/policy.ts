/**
 * Continuous Close policy — OBSERVE required-control design.
 *
 * Policy is a pure snapshot: it declares which controls must pass for
 * observe_ready, and which capabilities each mode holds. It never posts JEs
 * or calls providers.
 */

import type {
  ContinuousCloseCapability,
  ContinuousCloseMode,
  ExecutableContinuousCloseMode,
} from "./types";
import { EXECUTABLE_CONTINUOUS_CLOSE_MODES } from "./types";
import type { StatementControlLineKey } from "@/lib/integrations/accounting/statement-control";

/** Statement-control lines that must pass for OBSERVE readiness. */
export type RequiredStatementControlKey = Extract<
  StatementControlLineKey,
  "cash" | "ar" | "total_assets" | "total_liabilities" | "total_equity" | "bs_equation" | "net_income"
>;

export type ContinuousCloseObservePolicy = {
  mode: ExecutableContinuousCloseMode;
  /** Fail closed when contract version is present but statementControl is missing. */
  requireStatementControlWhenContracted: boolean;
  requiredStatementControlKeys: readonly RequiredStatementControlKey[];
  /** Assertion gap rate above this blocks observe_ready. */
  maxAssertionGapRate: number;
  /** URM outcomes that open exceptions (do not invent residuals). */
  urmOpenOutcomes: readonly string[];
  /** URM outcomes treated as hard blocks. */
  urmBlockOutcomes: readonly string[];
};

export const DEFAULT_OBSERVE_POLICY: ContinuousCloseObservePolicy = {
  mode: "OBSERVE",
  requireStatementControlWhenContracted: true,
  requiredStatementControlKeys: [
    "cash",
    "ar",
    "total_assets",
    "total_liabilities",
    "total_equity",
    "bs_equation",
    "net_income",
  ],
  maxAssertionGapRate: 0.25,
  urmOpenOutcomes: [
    "open_review",
    "open_material",
    "provider_action_required",
  ],
  urmBlockOutcomes: ["failed"],
};

export function isExecutableContinuousCloseMode(
  mode: ContinuousCloseMode,
): mode is ExecutableContinuousCloseMode {
  return (EXECUTABLE_CONTINUOUS_CLOSE_MODES as readonly string[]).includes(mode);
}

export function capabilityForMode(mode: ContinuousCloseMode): ContinuousCloseCapability {
  if (mode === "OBSERVE") {
    return {
      mayReadSyncSnapshot: true,
      mayEvaluateControls: true,
      mayClassifyExceptions: true,
      mayComposeReadiness: true,
      maySummarizeMemory: true,
      mayEmitObserveReceipt: true,
      mayProposeRemediation: false,
      mayRequireHumanReview: false,
      mayAutoPostJournalEntries: false,
      mayWriteProviderErp: false,
    };
  }

  // Declared future modes — not executable in CC-1; capabilities stay non-writing.
  if (mode === "PROPOSE") {
    return {
      mayReadSyncSnapshot: true,
      mayEvaluateControls: true,
      mayClassifyExceptions: true,
      mayComposeReadiness: true,
      maySummarizeMemory: true,
      mayEmitObserveReceipt: true,
      mayProposeRemediation: true,
      mayRequireHumanReview: false,
      mayAutoPostJournalEntries: false,
      mayWriteProviderErp: false,
    };
  }

  if (mode === "REVIEW_REQUIRED") {
    return {
      mayReadSyncSnapshot: true,
      mayEvaluateControls: true,
      mayClassifyExceptions: true,
      mayComposeReadiness: true,
      maySummarizeMemory: true,
      mayEmitObserveReceipt: true,
      mayProposeRemediation: true,
      mayRequireHumanReview: true,
      mayAutoPostJournalEntries: false,
      mayWriteProviderErp: false,
    };
  }

  // GOVERNED_AUTO — still no ERP write in this module; future block owns posting.
  return {
    mayReadSyncSnapshot: true,
    mayEvaluateControls: true,
    mayClassifyExceptions: true,
    mayComposeReadiness: true,
    maySummarizeMemory: true,
    mayEmitObserveReceipt: true,
    mayProposeRemediation: true,
    mayRequireHumanReview: true,
    mayAutoPostJournalEntries: false,
    mayWriteProviderErp: false,
  };
}

/**
 * Sync identity rule (locked — do not invent companies):
 * 1. Provider tenant/realm is authoritative for connection binding.
 * 2. companyId must already be resolved by accounting sync persistence
 *    (`resolveCompanyIdForSyncPersist` precedence).
 * 3. Continuous Close refuses to run when tenant/realm, companyId,
 *    connectionId, or syncId is missing.
 */
export function assertContinuousCloseSyncIdentity(identity: {
  tenantOrRealmId?: string | null;
  companyId?: string | null;
  accountingConnectionId?: string | null;
  accountingSyncId?: string | null;
}): { ok: true } | { ok: false; reason: string } {
  if (!String(identity.tenantOrRealmId || "").trim()) {
    return { ok: false, reason: "missing_tenant_or_realm_id" };
  }
  if (!String(identity.companyId || "").trim()) {
    return { ok: false, reason: "missing_company_id" };
  }
  if (!String(identity.accountingConnectionId || "").trim()) {
    return { ok: false, reason: "missing_accounting_connection_id" };
  }
  if (!String(identity.accountingSyncId || "").trim()) {
    return { ok: false, reason: "missing_accounting_sync_id" };
  }
  return { ok: true };
}
