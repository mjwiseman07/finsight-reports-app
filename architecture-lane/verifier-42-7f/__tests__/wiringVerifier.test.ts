// -----------------------------------------------------------------------------
// Phase 42.7F — Wiring Verifier Vitest Suite
//
// This file is the vitest entry point for the wiring verifier. The actual
// runner logic lives in ../wiringVerifierRunner.ts so it can also be loaded by
// scripts/verify-phase-42-7f.js and scripts/generate-d0-wiring-evidence.js
// under a plain CommonJS ts-node loader (which cannot resolve "vitest").
//
// Promoting the wiring verifier into `npm test` gives it first-class CI
// coverage — every commit now exercises resolution, fail-closed, hash-chain,
// and expected-hop invariants across the entire WIRING_CASES matrix.
// -----------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { runWiringVerifierTests } from "../wiringVerifierRunner";

// Re-export runner types & function so existing consumers that still import
// from this path continue to work. Prefer importing directly from
// ../wiringVerifierRunner for new code.
export {
  runWiringVerifierTests,
  type WiringVerifierCaseRecord,
  type WiringVerifierEvidence,
} from "../wiringVerifierRunner";

describe("Phase 42.7F — wiring verifier", () => {
  it("all wiring cases pass (resolution + fail-closed + hash-chain + expected hops)", async () => {
    const result = await runWiringVerifierTests();

    // Emit a compact per-case diff on failure so debugging does not require
    // re-running the standalone script.
    if (result.failCount !== 0) {
      const failures = result.cases.filter((c) => c.outcome !== c.expected);
      // eslint-disable-next-line no-console
      console.error(
        `wiring-verifier failures (${failures.length}/${result.totalCases}):`,
        failures.map(
          (c) => `${c.id} [${c.decision}] expected=${c.expected} actual=${c.outcome} — ${c.reason}`,
        ),
      );
    }

    expect(result.failCount).toBe(0);
    expect(result.totalCases).toBeGreaterThan(0);
    expect(result.evidenceVersion).toBe("42.7F");
  });
});
