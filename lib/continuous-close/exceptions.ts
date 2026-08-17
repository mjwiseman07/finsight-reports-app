/**
 * Continuous Close exception classification (OBSERVE) — fail-closed corrected.
 *
 * Required statement-control failures → block.
 * open_material / material residual → block.
 * provider_action_required on required recon → block; on optional → review.
 */

import type { StatementControlResult } from "@/lib/integrations/accounting/statement-control";
import type {
  ContinuousCloseAssertionSignal,
  ContinuousCloseUrmNormalizedInput,
} from "./types";
import {
  isMaterialResidualBlocked,
  type ContinuousCloseObservePolicy,
} from "./policy";

export type ContinuousCloseExceptionClass =
  | "statement_control_fail"
  | "statement_control_missing"
  | "assertion_gap"
  | "urm_open"
  | "urm_blocked"
  | "sync_identity_invalid"
  | "mode_not_executable"
  | "freshness_stale";

export type ContinuousCloseExceptionDisposition = "block" | "review" | "info";

export type ContinuousCloseException = {
  /** Deterministic id: `${exceptionClass}:${code}:${source||"_"}` */
  exceptionId: string;
  exceptionClass: ContinuousCloseExceptionClass;
  code: string;
  disposition: ContinuousCloseExceptionDisposition;
  message: string;
  source?: string;
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
  statementControl: StatementControlResult | null;
  statementControlContractVersion: number | null;
  assertion: ContinuousCloseAssertionSignal | null;
  urmInputs: ContinuousCloseUrmNormalizedInput[];
  syncIdentityOk: boolean;
  syncIdentityReason?: string;
  modeExecutable: boolean;
  freshnessStale?: boolean;
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

  if (input.freshnessStale) {
    pushException(out, {
      exceptionClass: "freshness_stale",
      code: "cc.freshness.stale",
      disposition: "block",
      message: "Accounting sync exceeds OBSERVE freshness max age.",
      source: "freshness",
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
    if (
      blockRate != null &&
      summary.gap > 0 &&
      summary.gapRate > blockRate
    ) {
      pushException(out, {
        exceptionClass: "assertion_gap",
        code: "cc.assertion.gap_rate_blocked",
        disposition: "block",
        message: `Assertion gap rate exceeds explicit policy block threshold.`,
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

  for (const signal of input.urmInputs) {
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
      });
      continue;
    }

    if (signal.required) {
      if (input.policy.urm.requiredBlockOutcomes.includes(signal.outcome)) {
        pushException(out, {
          exceptionClass: "urm_blocked",
          code: `cc.urm.required_block.${signal.workpaperKind}`,
          disposition: "block",
          message: `Required URM workpaper '${signal.workpaperKind}' outcome '${signal.outcome}' blocks close readiness.`,
          source: signal.workpaperId,
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
        });
      }
      continue;
    }

    // Optional workpaper
    if (input.policy.urm.optionalBlockOutcomes.includes(signal.outcome)) {
      pushException(out, {
        exceptionClass: "urm_blocked",
        code: `cc.urm.optional_block.${signal.workpaperKind}`,
        disposition: "block",
        message: `Optional URM workpaper '${signal.workpaperKind}' outcome '${signal.outcome}' still blocks (material/failed).`,
        source: signal.workpaperId,
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
      });
    }
  }

  return sortContinuousCloseExceptions(out);
}
