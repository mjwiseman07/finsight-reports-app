// -----------------------------------------------------------------------------
// Phase 42.7F — Wiring Verifier Runner
//
// Pure runner (no test-framework imports) so it can be loaded by:
//   1. Vitest (via architecture-lane/verifier-42-7f/__tests__/wiringVerifier.test.ts)
//   2. Node ts-node scripts (scripts/verify-phase-42-7f.js,
//      scripts/generate-d0-wiring-evidence.js)
//
// Do not add "vitest" imports to this file — they will break the two script
// callers which run under a plain CommonJS transpile loader.
// -----------------------------------------------------------------------------

import { WIRING_CASES } from "./caseMatrix";
import { assertHopsMatchEntries } from "./expectedHopManifest";
import { runWiredTraversal } from "./runWiredTraversal";

export interface WiringVerifierCaseRecord {
  readonly id: string;
  readonly decision: string;
  readonly expected: string;
  readonly outcome: string;
  readonly reason: string;
}

export interface WiringVerifierEvidence {
  readonly evidenceVersion: "42.7F";
  readonly generatedAt: string;
  readonly totalCases: number;
  readonly passCount: number;
  readonly failCount: number;
  readonly cases: readonly WiringVerifierCaseRecord[];
}

const FROZEN_GENERATED_AT = "2026-06-24T00:00:00Z";

function pushCase(
  cases: WiringVerifierCaseRecord[],
  counters: { passCount: number; failCount: number },
  input: {
    id: string;
    decision: string;
    expected: string;
    actual: string;
    reason: string;
  },
): void {
  if (input.actual !== input.expected) {
    counters.failCount += 1;
  } else {
    counters.passCount += 1;
  }
  cases.push(
    Object.freeze({
      id: input.id,
      decision: input.decision,
      expected: input.expected,
      outcome: input.actual,
      reason: input.reason,
    }),
  );
}

export async function runWiringVerifierTests(): Promise<WiringVerifierEvidence> {
  const cases: WiringVerifierCaseRecord[] = [];
  const counters = { passCount: 0, failCount: 0 };

  for (const wiringCase of WIRING_CASES) {
    const evidence = await runWiredTraversal(wiringCase);
    const hopMismatch =
      evidence.hopMismatch ??
      assertHopsMatchEntries(
        wiringCase.expectedHops,
        evidence.entries.map((entry) => ({ kind: entry.kind, payload: entry.payload as Record<string, unknown> })),
      );

    const resolutionOk =
      evidence.resolutionReturned === wiringCase.expectedOutcome.resolutionReturned
        ? "pass"
        : "fail";
    pushCase(cases, counters, {
      id: wiringCase.id,
      decision: "resolution-returned",
      expected: "pass",
      actual: resolutionOk,
      reason: wiringCase.isFailClosed
        ? "fail-closed case must not return resolution"
        : "traversal must return resolution",
    });

    if (wiringCase.isFailClosed) {
      pushCase(cases, counters, {
        id: `${wiringCase.id}.throw`,
        decision: "fail-closed-threw",
        expected: "threw",
        actual: evidence.errorMessage?.includes("fail-closed-simulated") ? "threw" : "no-throw",
        reason: "fail-closed hop must throw to caller",
      });
    }

    const chainOk =
      evidence.chainValid === wiringCase.expectedOutcome.chainValid ? "pass" : "fail";
    pushCase(cases, counters, {
      id: `${wiringCase.id}.chain`,
      decision: "hash-chain",
      expected: "pass",
      actual: chainOk,
      reason: "verifyAuditChain on produced JSONL",
    });

    pushCase(cases, counters, {
      id: `${wiringCase.id}.hops`,
      decision: "expected-hops",
      expected: "pass",
      actual: hopMismatch === null ? "pass" : "fail",
      reason: hopMismatch ?? "expected hops matched produced entries",
    });
  }

  return Object.freeze({
    evidenceVersion: "42.7F" as const,
    generatedAt: FROZEN_GENERATED_AT,
    totalCases: cases.length,
    passCount: counters.passCount,
    failCount: counters.failCount,
    cases: Object.freeze(cases),
  });
}

if (typeof require !== "undefined" && require.main === module) {
  runWiringVerifierTests().then((result) => {
    // eslint-disable-next-line no-console
    console.log(
      `wiring-verifier: ${result.passCount}/${result.totalCases} passed, ${result.failCount} failed`,
    );
    process.exit(result.failCount === 0 ? 0 : 1);
  });
}
