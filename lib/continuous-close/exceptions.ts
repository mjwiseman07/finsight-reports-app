/**
 * Continuous Close exception classification — final fail-closed hardening.
 */

import type { StatementControlResult } from "@/lib/integrations/accounting/statement-control";
import type {
  ContinuousCloseAssertionSignal,
  ContinuousCloseFreshnessStatus,
  ContinuousCloseUrmNormalizedInput,
} from "./types";
import {
  isMaterialResidualBlocked,
  isPolicyRequiredReconKind,
  isReconciledOutcome,
  validateObservePolicy,
  type ContinuousCloseObservePolicy,
} from "./policy";

export type ContinuousCloseExceptionClass =
  | "policy_invalid"
  | "run_identity_invalid"
  | "statement_control_fail"
  | "statement_control_missing"
  | "assertion_gap"
  | "urm_open"
  | "urm_blocked"
  | "urm_missing_required"
  | "urm_cross_sync"
  | "urm_evidence_insufficient"
  | "urm_requiredness_contradiction"
  | "sync_identity_invalid"
  | "mode_not_executable"
  | "freshness_stale"
  | "freshness_unknown";

export type ContinuousCloseExceptionDisposition = "block" | "review" | "info";

export type ContinuousCloseException = {
  exceptionId: string;
  exceptionClass: ContinuousCloseExceptionClass;
  code: string;
  disposition: ContinuousCloseExceptionDisposition;
  message: string;
  source?: string;
  /** Structured custody fields (optional per class). */
  workpaperId?: string;
  workpaperKind?: string;
  accountingSyncId?: string;
  sourceAccountingSyncId?: string;
  asOfDate?: string | null;
  urmRunId?: string | null;
  unidentifiedResidualCents?: number | null;
  grossVarianceCents?: number | null;
  identifiedTotalCents?: number | null;
  evidenceCount?: number | null;
};

const DISPOSITION_ORDER: Record<ContinuousCloseExceptionDisposition, number> = {
  block: 0,
  review: 1,
  info: 2,
};

export function buildExceptionId(
  exceptionClass: ContinuousCloseExceptionClass,
  code: string,
  source?: string,
): string {
  return `${exceptionClass}:${code}:${source || "_"}`;
}

export function sortContinuousCloseExceptions(
  exceptions: readonly ContinuousCloseException[],
): ContinuousCloseException[] {
  return [...exceptions].sort((a, b) => {
    const d = DISPOSITION_ORDER[a.disposition] - DISPOSITION_ORDER[b.disposition];
    if (d !== 0) return d;
    return a.exceptionId.localeCompare(b.exceptionId);
  });
}

function pushException(
  out: ContinuousCloseException[],
  partial: Omit<ContinuousCloseException, "exceptionId">,
) {
  out.push({
    ...partial,
    exceptionId: buildExceptionId(partial.exceptionClass, partial.code, partial.source),
  });
}

export function classifyContinuousCloseExceptions(input: {
  policy: ContinuousCloseObservePolicy;
  observeAccountingSyncId: string;
  statementControl: StatementControlResult | null;
  statementControlContractVersion: number | null;
  assertion: ContinuousCloseAssertionSignal | null;
  urmInputs: ContinuousCloseUrmNormalizedInput[];
  syncIdentityOk: boolean;
  syncIdentityReason?: string;
  runIdentityOk: boolean;
  runIdentityReason?: string;
  modeExecutable: boolean;
  freshnessStatus: ContinuousCloseFreshnessStatus;
}): ContinuousCloseException[] {
  const out: ContinuousCloseException[] = [];

  if (!input.modeExecutable) {
    pushException(out, {
      exceptionClass: "mode_not_executable",
      code: "cc.mode.not_executable",
      disposition: "block",
      message: "Continuous Close mode is declared but not executable in CC-1.",
    });
    return sortContinuousCloseExceptions(out);
  }

  if (!input.runIdentityOk) {
    pushException(out, {
      exceptionClass: "run_identity_invalid",
      code: `cc.run.${input.runIdentityReason || "invalid"}`,
      disposition: "block",
      message: "Continuous Close run identity requires non-empty runId and observedAt.",
    });
    return sortContinuousCloseExceptions(out);
  }

  if (!input.syncIdentityOk) {
    pushException(out, {
      exceptionClass: "sync_identity_invalid",
      code: `cc.sync.${input.syncIdentityReason || "invalid"}`,
      disposition: "block",
      message:
        "Continuous Close requires resolved provider tenant, company, connection, and sync identity.",
    });
    return sortContinuousCloseExceptions(out);
  }

  const policyValidation = validateObservePolicy(input.policy);
  if (!policyValidation.ok) {
    pushException(out, {
      exceptionClass: "policy_invalid",
      code: `cc.policy.${policyValidation.reason}`,
      disposition: "block",
      message:
        "No required statement controls or required recon kinds configured — fail closed.",
      source: "policy",
    });
    return sortContinuousCloseExceptions(out);
  }

  if (input.freshnessStatus === "stale") {
    pushException(out, {
      exceptionClass: "freshness_stale",
      code: "cc.freshness.stale",
      disposition: "block",
      message: "Accounting sync exceeds OBSERVE freshness max age.",
      source: "freshness",
      accountingSyncId: input.observeAccountingSyncId,
    });
  } else if (input.freshnessStatus === "unknown") {
    pushException(out, {
      exceptionClass: "freshness_unknown",
      code: "cc.freshness.unknown",
      disposition: "block",
      message:
        "Freshness gate is configured but syncedAt is missing or invalid — unknown freshness fails closed.",
      source: "freshness",
      accountingSyncId: input.observeAccountingSyncId,
    });
  }

  const contractVersion = Number(input.statementControlContractVersion || 0);
  if (
    input.policy.requireStatementControlSnapshotWhenContracted &&
    contractVersion >= 1 &&
    !input.statementControl
  ) {
    pushException(out, {
      exceptionClass: "statement_control_missing",
      code: "cc.statement_control.missing",
      disposition: "block",
      message:
        "Statement control contract is present but the control snapshot is missing (fail closed).",
      source: "statement_control",
    });
  }

  if (input.statementControl) {
    const lines = [
      ...input.statementControl.balanceSheet.lines,
      ...input.statementControl.incomeStatement.lines,
    ];

    for (const key of input.policy.statementControlRequiredKeys) {
      const line = lines.find((l) => l.key === key);
      if (!line) {
        pushException(out, {
          exceptionClass: "statement_control_fail",
          code: `cc.statement_control.missing_line.${key}`,
          disposition: "block",
          message: `Required statement-control line '${key}' is absent.`,
          source: key,
        });
        continue;
      }
      if (!line.passes) {
        pushException(out, {
          exceptionClass: "statement_control_fail",
          code: `cc.statement_control.fail.${key}`,
          disposition: "block",
          message: line.reason || `Required statement control '${key}' did not pass.`,
          source: key,
        });
      }
    }

    for (const key of input.policy.statementControlOptionalKeys) {
      if (input.policy.statementControlRequiredKeys.includes(key)) continue;
      const line = lines.find((l) => l.key === key);
      if (!line || !line.passes) {
        pushException(out, {
          exceptionClass: "statement_control_fail",
          code: `cc.statement_control.optional_fail.${key}`,
          disposition: "review",
          message: line?.reason || `Optional statement control '${key}' did not pass.`,
          source: key,
        });
      }
    }
  }

  if (input.assertion) {
    const { summary } = input.assertion;
    const blockRate = input.policy.assertion.blockGapRate;
    if (blockRate != null && summary.gap > 0 && summary.gapRate > blockRate) {
      pushException(out, {
        exceptionClass: "assertion_gap",
        code: "cc.assertion.gap_rate_blocked",
        disposition: "block",
        message: "Assertion gap rate exceeds explicit policy block threshold.",
        source: "assertions",
      });
    } else if (summary.gap > 0 && input.policy.assertion.gapsRequireReview) {
      pushException(out, {
        exceptionClass: "assertion_gap",
        code: "cc.assertion.gaps_present",
        disposition: "review",
        message: `${summary.gap} assertion gap(s) require review.`,
        source: "assertions",
      });
    } else if (summary.gap > 0) {
      pushException(out, {
        exceptionClass: "assertion_gap",
        code: "cc.assertion.gaps_info",
        disposition: "info",
        message: `${summary.gap} assertion gap(s) noted.`,
        source: "assertions",
      });
    }
  }

  // Missing required recon kinds → BLOCK
  const presentKinds = new Set(input.urmInputs.map((u) => u.workpaperKind));
  for (const kind of input.policy.requiredReconKinds) {
    if (!presentKinds.has(kind)) {
      pushException(out, {
        exceptionClass: "urm_missing_required",
        code: `cc.urm.missing_required.${kind}`,
        disposition: "block",
        message: `Required recon kind '${kind}' has no URM projection for this OBSERVE run.`,
        source: kind,
        workpaperKind: kind,
      });
    }
  }

  for (const signal of input.urmInputs) {
    const structured = {
      workpaperId: signal.workpaperId,
      workpaperKind: signal.workpaperKind,
      sourceAccountingSyncId: signal.sourceAccountingSyncId,
      accountingSyncId: input.observeAccountingSyncId,
      asOfDate: signal.asOfDate,
      urmRunId: signal.urmRunId,
      unidentifiedResidualCents: signal.unidentifiedResidualCents,
      grossVarianceCents: signal.grossVarianceCents,
      identifiedTotalCents: signal.identifiedTotalCents,
      evidenceCount: signal.evidenceCount,
    };

    // Policy is sole requiredness authority — signal.required cannot upgrade or downgrade.
    const treatAsRequired = isPolicyRequiredReconKind(input.policy, signal.workpaperKind);
    if (signal.required !== treatAsRequired) {
      pushException(out, {
        exceptionClass: "urm_requiredness_contradiction",
        code: `cc.urm.requiredness_contradiction.${signal.workpaperKind}`,
        disposition: "info",
        message: treatAsRequired
          ? `Signal required=false ignored — policy requires recon kind '${signal.workpaperKind}'.`
          : `Signal required=true ignored — recon kind '${signal.workpaperKind}' is not policy-required.`,
        source: signal.workpaperId,
        ...structured,
      });
    }

    if (
      input.policy.requireUrmSourceSyncMatch &&
      signal.sourceAccountingSyncId !== input.observeAccountingSyncId
    ) {
      pushException(out, {
        exceptionClass: "urm_cross_sync",
        code: `cc.urm.cross_sync.${signal.workpaperKind}`,
        disposition: "block",
        message: `URM workpaper '${signal.workpaperKind}' source sync does not match OBSERVE sync (custody fail closed).`,
        source: signal.workpaperId,
        ...structured,
      });
      continue;
    }

    const materialBlocked = isMaterialResidualBlocked({
      outcome: signal.outcome,
      unidentifiedResidualCents: signal.unidentifiedResidualCents,
      materialityThresholdCents: signal.materialityThresholdCents,
    });

    if (materialBlocked) {
      pushException(out, {
        exceptionClass: "urm_blocked",
        code: `cc.urm.material.${signal.workpaperKind}`,
        disposition: "block",
        message: `URM workpaper '${signal.workpaperKind}' has material open residual (fail closed).`,
        source: signal.workpaperId,
        ...structured,
      });
      continue;
    }

    if (
      input.policy.evidence.requireEvidenceForReconciled &&
      isReconciledOutcome(signal.outcome) &&
      signal.evidenceCount < input.policy.evidence.minEvidenceCountForReconciled
    ) {
      pushException(out, {
        exceptionClass: "urm_evidence_insufficient",
        code: `cc.urm.evidence.${signal.workpaperKind}`,
        disposition: treatAsRequired ? "block" : "review",
        message: treatAsRequired
          ? `Required reconciled URM workpaper '${signal.workpaperKind}' lacks required evidence count (fail closed).`
          : `Optional reconciled URM workpaper '${signal.workpaperKind}' lacks required evidence count.`,
        source: signal.workpaperId,
        ...structured,
      });
      // Required missing evidence is terminal for this signal's outcome path.
      if (treatAsRequired) continue;
    }

    if (treatAsRequired) {
      if (input.policy.urm.requiredBlockOutcomes.includes(signal.outcome)) {
        pushException(out, {
          exceptionClass: "urm_blocked",
          code: `cc.urm.required_block.${signal.workpaperKind}`,
          disposition: "block",
          message: `Required URM workpaper '${signal.workpaperKind}' outcome '${signal.outcome}' blocks close readiness.`,
          source: signal.workpaperId,
          ...structured,
        });
        continue;
      }
      if (input.policy.urm.requiredReviewOutcomes.includes(signal.outcome)) {
        pushException(out, {
          exceptionClass: "urm_open",
          code: `cc.urm.required_review.${signal.workpaperKind}`,
          disposition: "review",
          message: `Required URM workpaper '${signal.workpaperKind}' outcome '${signal.outcome}' requires review.`,
          source: signal.workpaperId,
          ...structured,
        });
      }
      continue;
    }

    if (input.policy.urm.optionalBlockOutcomes.includes(signal.outcome)) {
      pushException(out, {
        exceptionClass: "urm_blocked",
        code: `cc.urm.optional_block.${signal.workpaperKind}`,
        disposition: "block",
        message: `Optional URM workpaper '${signal.workpaperKind}' outcome '${signal.outcome}' still blocks (material/failed).`,
        source: signal.workpaperId,
        ...structured,
      });
      continue;
    }
    if (input.policy.urm.optionalReviewOutcomes.includes(signal.outcome)) {
      pushException(out, {
        exceptionClass: "urm_open",
        code: `cc.urm.optional_review.${signal.workpaperKind}`,
        disposition: "review",
        message: `Optional URM workpaper '${signal.workpaperKind}' outcome '${signal.outcome}' requires review.`,
        source: signal.workpaperId,
        ...structured,
      });
    }
  }

  return sortContinuousCloseExceptions(out);
}
