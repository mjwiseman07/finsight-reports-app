/**
 * Expected-effect verification against refreshed canonical/URM evidence.
 *
 * Provider API success is not proof. Incomplete, stale, partial, or lagged
 * evidence never returns VERIFIED.
 */

import type { ContinuousCloseException } from "@/lib/continuous-close/exceptions";
import type { JeExpectedEffect, JeProposalLine } from "./types";
import type {
  Je4EffectConclusion,
  Je4ReadinessState,
  PostWriteCanonicalEvidence,
  PostWriteVisibleJournalLine,
} from "./post-write-verification-types";

export type PostWriteEffectCheck = {
  code: string;
  ok: boolean;
  detail: string;
};

export type PostWriteEffectVerification = {
  conclusion: Exclude<Je4EffectConclusion, "NOT_EVALUATED">;
  code: string;
  message: string;
  checks: PostWriteEffectCheck[];
};

type EffectStep =
  | { ok: true; check: PostWriteEffectCheck }
  | {
      ok: false;
      conclusion: "MISMATCH" | "INCOMPLETE" | "PENDING_PROVIDER_VISIBILITY";
      code: string;
      message: string;
      check: PostWriteEffectCheck;
    };

function lineKey(line: PostWriteVisibleJournalLine): string {
  return `${line.accountId}|${line.debitCents}|${line.creditCents}`;
}

function multiset(lines: readonly PostWriteVisibleJournalLine[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const key = lineKey(line);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function sameMultiset(
  left: readonly PostWriteVisibleJournalLine[],
  right: readonly PostWriteVisibleJournalLine[],
): boolean {
  const a = multiset(left);
  const b = multiset(right);
  if (a.size !== b.size) return false;
  for (const [key, count] of a) {
    if (b.get(key) !== count) return false;
  }
  return true;
}

function proposalLines(
  lines: readonly JeProposalLine[],
): PostWriteVisibleJournalLine[] {
  return lines.map((line) => ({
    accountId: String(line.accountId),
    debitCents: line.debitCents,
    creditCents: line.creditCents,
  }));
}

function sumCents(
  lines: readonly PostWriteVisibleJournalLine[],
  field: "debitCents" | "creditCents",
): number {
  return lines.reduce((total, line) => total + line[field], 0);
}

function finish(args: {
  conclusion: PostWriteEffectVerification["conclusion"];
  code: string;
  message: string;
  checks: PostWriteEffectCheck[];
}): PostWriteEffectVerification {
  return args;
}

function reconKey(reconKind: string): string {
  const kind = reconKind.trim();
  if (kind === "ar") return "ar_aging";
  if (kind === "ap") return "ap_aging";
  return kind;
}

function netCredit(
  lines: readonly PostWriteVisibleJournalLine[],
  accountId: string,
): number {
  return lines
    .filter((line) => line.accountId === accountId)
    .reduce((total, line) => total + line.creditCents - line.debitCents, 0);
}

function checkEffect(
  effect: JeExpectedEffect,
  evidence: PostWriteCanonicalEvidence,
  lines: readonly PostWriteVisibleJournalLine[],
  exceptions: readonly ContinuousCloseException[] | null,
): EffectStep {
  switch (effect.type) {
    case "CC_EXCEPTION_CLEAR": {
      if (!exceptions) {
        return {
          ok: false,
          conclusion: "INCOMPLETE",
          code: "je4_exceptions_missing",
          message: "Continuous Close exceptions are required to prove an exception clear.",
          check: {
            code: "cc_exception_clear",
            ok: false,
            detail: effect.exceptionCode,
          },
        };
      }
      const stillPresent = exceptions.some(
        (item) => item.code === effect.exceptionCode,
      );
      if (stillPresent) {
        return {
          ok: false,
          conclusion: "MISMATCH",
          code: "je4_exception_still_present",
          message: `Exception ${effect.exceptionCode} is still present on the post-write OBSERVE run.`,
          check: {
            code: "cc_exception_clear",
            ok: false,
            detail: effect.exceptionCode,
          },
        };
      }
      return {
        ok: true,
        check: {
          code: "cc_exception_clear",
          ok: true,
          detail: effect.exceptionCode,
        },
      };
    }
    case "RECON_OUTCOME_TARGET": {
      const slot = evidence.reconEvidence[reconKey(effect.reconKind)];
      if (!slot || !slot.authoritative || !slot.outcome) {
        return {
          ok: false,
          conclusion: "INCOMPLETE",
          code: "je4_recon_outcome_unproven",
          message: `Recon outcome for ${effect.reconKind} is not proven on the post-write sync.`,
          check: {
            code: "recon_outcome",
            ok: false,
            detail: effect.reconKind,
          },
        };
      }
      if (slot.outcome !== effect.targetOutcome) {
        return {
          ok: false,
          conclusion: "MISMATCH",
          code: "je4_recon_outcome_mismatch",
          message: `Recon ${effect.reconKind} outcome ${slot.outcome} does not match ${effect.targetOutcome}.`,
          check: {
            code: "recon_outcome",
            ok: false,
            detail: `${slot.outcome}!=${effect.targetOutcome}`,
          },
        };
      }
      return {
        ok: true,
        check: {
          code: "recon_outcome",
          ok: true,
          detail: effect.reconKind,
        },
      };
    }
    case "RESIDUAL_DELTA": {
      const slot = evidence.reconEvidence[reconKey(effect.reconKind)];
      if (!slot || !slot.authoritative || slot.residualDeltaCents == null) {
        return {
          ok: false,
          conclusion: "INCOMPLETE",
          code: "je4_residual_not_observable",
          message: `Residual delta for ${effect.reconKind} is not observable on the post-write sync.`,
          check: {
            code: "residual_delta",
            ok: false,
            detail: effect.reconKind,
          },
        };
      }
      if (slot.residualDeltaCents !== effect.expectedDeltaCents) {
        return {
          ok: false,
          conclusion: "MISMATCH",
          code: "je4_residual_mismatch",
          message: `Residual delta for ${effect.reconKind} does not match the proposal.`,
          check: {
            code: "residual_delta",
            ok: false,
            detail: String(slot.residualDeltaCents),
          },
        };
      }
      return {
        ok: true,
        check: {
          code: "residual_delta",
          ok: true,
          detail: effect.reconKind,
        },
      };
    }
    case "ACCOUNT_RECLASS": {
      const credit = lines.some(
        (line) =>
          line.accountId === effect.fromAccountId &&
          line.creditCents === effect.amountCents &&
          line.debitCents === 0,
      );
      const debit = lines.some(
        (line) =>
          line.accountId === effect.toAccountId &&
          line.debitCents === effect.amountCents &&
          line.creditCents === 0,
      );
      if (!credit || !debit) {
        return {
          ok: false,
          conclusion: "MISMATCH",
          code: "je4_reclass_mismatch",
          message: "Visible journal lines do not show the expected reclass amount.",
          check: {
            code: "account_reclass",
            ok: false,
            detail: `${effect.fromAccountId}->${effect.toAccountId}`,
          },
        };
      }
      return {
        ok: true,
        check: {
          code: "account_reclass",
          ok: true,
          detail: `${effect.fromAccountId}->${effect.toAccountId}`,
        },
      };
    }
    case "BS_ACCOUNT_GL_DELTA": {
      const balance = evidence.accountBalancesCents[effect.qboAccountId];
      if (balance == null || !Number.isInteger(balance)) {
        return {
          ok: false,
          conclusion: "INCOMPLETE",
          code: "je4_gl_balance_absent",
          message: `Post-write trial balance has no integer balance for ${effect.qboAccountId}.`,
          check: {
            code: "bs_gl_delta",
            ok: false,
            detail: effect.qboAccountId,
          },
        };
      }
      if (balance !== effect.expectedPostGlBalanceCents) {
        return {
          ok: false,
          conclusion: "MISMATCH",
          code: "je4_gl_balance_mismatch",
          message: `GL balance for ${effect.qboAccountId} does not match the expected post balance.`,
          check: {
            code: "bs_gl_delta",
            ok: false,
            detail: String(balance),
          },
        };
      }
      const movement = netCredit(lines, effect.qboAccountId);
      if (movement !== effect.expectedDeltaCents) {
        return {
          ok: false,
          conclusion: "MISMATCH",
          code: "je4_gl_delta_mismatch",
          message:
            "Liability natural-sign credit movement does not match the expected GL delta.",
          check: {
            code: "bs_gl_delta_movement",
            ok: false,
            detail: String(movement),
          },
        };
      }
      return {
        ok: true,
        check: {
          code: "bs_gl_delta",
          ok: true,
          detail: effect.qboAccountId,
        },
      };
    }
    default:
      return {
        ok: false,
        conclusion: "INCOMPLETE",
        code: "je4_effect_unsupported",
        message: "Expected effect type is not supported.",
        check: { code: "effect_type", ok: false, detail: "unsupported" },
      };
  }
}

export function verifyPostWriteExpectedEffects(args: {
  lines: readonly JeProposalLine[];
  totalDebitsCents: number;
  totalCreditsCents: number;
  expectedEffects: readonly JeExpectedEffect[];
  evidence: PostWriteCanonicalEvidence;
  exceptions: readonly ContinuousCloseException[] | null;
  readiness: { state: Je4ReadinessState } | null;
  continuousCloseRunId: string | null;
  sourceContinuousCloseRunId: string;
}): PostWriteEffectVerification {
  const checks: PostWriteEffectCheck[] = [];

  if (args.evidence.partial) {
    return finish({
      conclusion: "INCOMPLETE",
      code: "je4_partial_sync",
      message: "Partial canonical sync cannot prove expected accounting effects.",
      checks: [{ code: "partial_sync", ok: false, detail: "partial" }],
    });
  }

  if (args.evidence.validationStatus !== "SUCCESS") {
    return finish({
      conclusion: "INCOMPLETE",
      code: "je4_sync_not_success",
      message: "Canonical sync validation_status must be SUCCESS.",
      checks: [
        {
          code: "validation_status",
          ok: false,
          detail: args.evidence.validationStatus,
        },
      ],
    });
  }

  if (args.evidence.visibleJournalLines == null) {
    return finish({
      conclusion: "PENDING_PROVIDER_VISIBILITY",
      code: "je4_pending_provider_visibility",
      message:
        "Verified provider journal is not visible on the refreshed canonical sync.",
      checks: [{ code: "provider_visibility", ok: false, detail: "absent" }],
    });
  }

  const visible = args.evidence.visibleJournalLines;
  const expectedLines = proposalLines(args.lines);
  if (expectedLines.length === 0) {
    return finish({
      conclusion: "INCOMPLETE",
      code: "je4_lines_missing",
      message: "Proposal lines are required to prove debit and credit economics.",
      checks: [{ code: "lines", ok: false, detail: "empty" }],
    });
  }

  if (!sameMultiset(visible, expectedLines)) {
    return finish({
      conclusion: "MISMATCH",
      code: "je4_line_economics_mismatch",
      message: "Visible journal lines do not match proposal debit and credit economics.",
      checks: [{ code: "line_economics", ok: false, detail: "multiset" }],
    });
  }
  checks.push({ code: "line_economics", ok: true, detail: "matched" });

  const debitSum = sumCents(visible, "debitCents");
  const creditSum = sumCents(visible, "creditCents");
  if (
    debitSum !== args.totalDebitsCents ||
    creditSum !== args.totalCreditsCents ||
    debitSum !== creditSum
  ) {
    return finish({
      conclusion: "MISMATCH",
      code: "je4_amount_mismatch",
      message: "Visible debit and credit totals do not match proposal amounts.",
      checks: [
        ...checks,
        { code: "amounts", ok: false, detail: `${debitSum}/${creditSum}` },
      ],
    });
  }
  checks.push({ code: "amounts", ok: true, detail: String(debitSum) });

  if (args.expectedEffects.length === 0) {
    return finish({
      conclusion: "INCOMPLETE",
      code: "je4_effects_missing",
      message: "Expected effects are required. Line match alone is not effect proof.",
      checks: [...checks, { code: "expected_effects", ok: false, detail: "empty" }],
    });
  }

  for (const effect of args.expectedEffects) {
    const step = checkEffect(effect, args.evidence, visible, args.exceptions);
    checks.push(step.check);
    if (!step.ok) {
      return finish({
        conclusion: step.conclusion,
        code: step.code,
        message: step.message,
        checks,
      });
    }
  }

  if (!args.continuousCloseRunId) {
    return finish({
      conclusion: "INCOMPLETE",
      code: "je4_cc_run_missing",
      message: "A post-write Continuous Close run is required before effects are verified.",
      checks: [...checks, { code: "cc_run", ok: false, detail: "missing" }],
    });
  }
  if (args.continuousCloseRunId === args.sourceContinuousCloseRunId) {
    return finish({
      conclusion: "INCOMPLETE",
      code: "je4_pre_write_cc_reused",
      message: "The pre-write Continuous Close run cannot prove post-write effects.",
      checks: [...checks, { code: "cc_run", ok: false, detail: "pre_write" }],
    });
  }
  if (!args.readiness) {
    return finish({
      conclusion: "INCOMPLETE",
      code: "je4_readiness_missing",
      message: "Close readiness from the new OBSERVE run is required.",
      checks: [...checks, { code: "readiness", ok: false, detail: "missing" }],
    });
  }

  checks.push({
    code: "readiness",
    ok: true,
    detail: args.readiness.state,
  });
  return finish({
    conclusion: "VERIFIED",
    code: "je4_effects_verified",
    message: `Expected accounting effects are verified. Close readiness is ${args.readiness.state} from the post-write OBSERVE run.`,
    checks,
  });
}
