/**
 * Continuous Close exception classification (OBSERVE).
 *
 * Normalizes statement-control failures, assertion gaps, and URM open/block
 * outcomes into a single exception list. Does not create review-queue rows or
 * invent URM residuals.
 */

import type { StatementControlResult } from "@/lib/integrations/accounting/statement-control";
import type {
  ContinuousCloseAssertionSignal,
  ContinuousCloseUrmSignal,
} from "./types";
import type { ContinuousCloseObservePolicy } from "./policy";

export type ContinuousCloseExceptionClass =
  | "statement_control_fail"
  | "statement_control_missing"
  | "assertion_gap"
  | "urm_open"
  | "urm_blocked"
  | "sync_identity_invalid"
  | "mode_not_executable";

export type ContinuousCloseException = {
  exceptionClass: ContinuousCloseExceptionClass;
  code: string;
  severity: "info" | "open" | "block";
  message: string;
  source?: string;
};

export function classifyContinuousCloseExceptions(input: {
  policy: ContinuousCloseObservePolicy;
  statementControl: StatementControlResult | null;
  statementControlContractVersion: number | null;
  assertion: ContinuousCloseAssertionSignal | null;
  urmSignals: ContinuousCloseUrmSignal[];
  syncIdentityOk: boolean;
  syncIdentityReason?: string;
  modeExecutable: boolean;
}): ContinuousCloseException[] {
  const out: ContinuousCloseException[] = [];

  if (!input.modeExecutable) {
    out.push({
      exceptionClass: "mode_not_executable",
      code: "cc.mode.not_executable",
      severity: "block",
      message: "Continuous Close mode is declared but not executable in CC-1.",
    });
    return out;
  }

  if (!input.syncIdentityOk) {
    out.push({
      exceptionClass: "sync_identity_invalid",
      code: `cc.sync.${input.syncIdentityReason || "invalid"}`,
      severity: "block",
      message: "Continuous Close requires resolved provider tenant, company, connection, and sync identity.",
    });
    return out;
  }

  const contractVersion = Number(input.statementControlContractVersion || 0);
  if (
    input.policy.requireStatementControlWhenContracted &&
    contractVersion >= 1 &&
    !input.statementControl
  ) {
    out.push({
      exceptionClass: "statement_control_missing",
      code: "cc.statement_control.missing",
      severity: "block",
      message: "Statement control contract is present but the control snapshot is missing (fail closed).",
      source: "statement_control",
    });
  }

  if (input.statementControl) {
    const lines = [
      ...input.statementControl.balanceSheet.lines,
      ...input.statementControl.incomeStatement.lines,
    ];
    for (const key of input.policy.requiredStatementControlKeys) {
      const line = lines.find((l) => l.key === key);
      if (!line) {
        out.push({
          exceptionClass: "statement_control_fail",
          code: `cc.statement_control.missing_line.${key}`,
          severity: "open",
          message: `Required statement-control line '${key}' is absent.`,
          source: key,
        });
        continue;
      }
      if (!line.passes) {
        out.push({
          exceptionClass: "statement_control_fail",
          code: `cc.statement_control.fail.${key}`,
          severity: "open",
          message: line.reason || `Statement control '${key}' did not pass.`,
          source: key,
        });
      }
    }
  }

  if (input.assertion) {
    const { summary, maxGapRate } = input.assertion;
    const limit = Math.min(maxGapRate, input.policy.maxAssertionGapRate);
    if (summary.gap > 0 && summary.gapRate > limit) {
      out.push({
        exceptionClass: "assertion_gap",
        code: "cc.assertion.gap_rate_exceeded",
        severity: "open",
        message: `Assertion gap rate ${(summary.gapRate * 100).toFixed(1)}% exceeds OBSERVE limit ${(limit * 100).toFixed(1)}%.`,
        source: "assertions",
      });
    } else if (summary.gap > 0) {
      out.push({
        exceptionClass: "assertion_gap",
        code: "cc.assertion.gaps_present",
        severity: "info",
        message: `${summary.gap} assertion gap(s) present within OBSERVE tolerance.`,
        source: "assertions",
      });
    }
  }

  for (const signal of input.urmSignals) {
    if (input.policy.urmBlockOutcomes.includes(signal.outcome)) {
      out.push({
        exceptionClass: "urm_blocked",
        code: `cc.urm.blocked.${signal.workpaperKind}`,
        severity: "block",
        message: `URM workpaper '${signal.workpaperKind}' outcome '${signal.outcome}' blocks OBSERVE readiness.`,
        source: signal.workpaperKind,
      });
      continue;
    }
    if (input.policy.urmOpenOutcomes.includes(signal.outcome)) {
      out.push({
        exceptionClass: "urm_open",
        code: `cc.urm.open.${signal.workpaperKind}`,
        severity: "open",
        message: `URM workpaper '${signal.workpaperKind}' remains open (${signal.outcome}).`,
        source: signal.workpaperKind,
      });
    }
  }

  return out;
}
