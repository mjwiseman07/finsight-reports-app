/**
 * Phase 42.7F / VC-5a meta-verifier — matrix coverage self-checks.
 */
import { LEGACY_WIRING_CASES, WIRING_CASES } from "./caseMatrix";
import {
  EXTENDED_CASE_COUNT,
  EXTENDED_CASE_COUNT_BY_VERTICAL,
  LEGACY_CASE_COUNT,
  TOTAL_CASE_COUNT,
} from "./lib/extendedVerticalCases";
import { assertVerticalApplicabilityRegistryComplete } from "./lib/vertical-applicability";
import { runAllLockVcTraversals } from "./lib/lock-vc-traversals";
import {
  EXTENDED_CASES_PER_VERTICAL,
  EXTENDED_VERIFIER_VERTICALS,
  LEGACY_VERIFIER_VERTICALS,
  VERIFIER_AUDIT_CHANNELS,
  VERIFIER_VERTICALS,
  type VerifierVertical,
} from "./lib/vertical-registry";

export interface MetaVerifierStepResult {
  readonly id: string;
  readonly name: string;
  readonly status: "PASS" | "FAIL";
  readonly detail: string;
}

const PERSONAS = [
  "ai-staff-accountant",
  "ai-senior-accountant",
  "ai-accounting-manager",
  "ai-controller-helper",
  "ai-cfo-helper",
  "ai-staff-auditor",
] as const;

const LEGACY_CASE_IDS = [
  ...Array.from({ length: 45 }, (_, i) => `WV-${String(i + 1).padStart(3, "0")}`),
  "WV-FC1",
  "WV-FC2",
  "WV-FC3",
] as const;

function step(
  id: string,
  name: string,
  run: () => string,
): MetaVerifierStepResult {
  try {
    const detail = run();
    return { id, name, status: "PASS", detail };
  } catch (error) {
    return {
      id,
      name,
      status: "FAIL",
      detail: (error as Error).message || String(error),
    };
  }
}

export function runMetaVerifierSteps(): readonly MetaVerifierStepResult[] {
  const cases = WIRING_CASES;
  const legacyCases = LEGACY_WIRING_CASES;

  return [
    step("42.7F-self-01", "case matrix contains >= 40 cases", () => {
      if (cases.length < 40) {
        throw new Error(`expected >= 40 cases, got ${cases.length}`);
      }
      return `${cases.length} cases in matrix`;
    }),
    step("42.7F-self-02", "every persona appears at least once", () => {
      const missing = PERSONAS.filter(
        (persona) => !cases.some((entry) => entry.input.persona === persona),
      );
      if (missing.length > 0) {
        throw new Error(`missing personas: ${missing.join(", ")}`);
      }
      return "all 6 personas covered";
    }),
    step("42.7F-self-03", "legacy tenant x industry combinations preserved", () => {
      const industries = [...LEGACY_VERIFIER_VERTICALS];
      const missing: string[] = [];
      for (const tenantClassification of ["standard", "phi-covered"] as const) {
        for (const industry of industries) {
          const found = legacyCases.some(
            (entry) =>
              entry.input.tenantClassification === tenantClassification &&
              entry.input.industry === industry,
          );
          if (!found) {
            missing.push(`${tenantClassification}:${industry}`);
          }
        }
      }
      if (missing.length > 0) {
        throw new Error(`missing legacy tenant×industry combos: ${missing.join(", ")}`);
      }
      return "6 legacy tenant×industry combinations covered";
    }),
    step("42.7F-self-04", "every election x escalation combination appears", () => {
      const elections = ["no-election", "agreement-with-panel", "override-applied"] as const;
      const escalations = [
        "no-escalation",
        "escalated",
        "gate-blocked",
        "degraded-confidence",
      ] as const;
      const missing: string[] = [];
      for (const orgElectionState of elections) {
        for (const escalationOutcome of escalations) {
          const found = cases.some(
            (entry) =>
              entry.input.orgElectionState === orgElectionState &&
              entry.input.escalationOutcome === escalationOutcome,
          );
          if (!found) {
            missing.push(`${orgElectionState}:${escalationOutcome}`);
          }
        }
      }
      if (missing.length > 0) {
        throw new Error(`missing election×escalation combos: ${missing.join(", ")}`);
      }
      return "12 election×escalation combinations covered";
    }),
    step("42.7F-self-05", "exactly 3 fail-closed cases exist", () => {
      const fc = cases.filter((entry) => entry.isFailClosed);
      if (fc.length !== 3) {
        throw new Error(`expected 3 FC cases, got ${fc.length}`);
      }
      const hops = fc.map((entry) => entry.input.failClosedHop).sort().join(",");
      if (!hops.includes("escalation") || !hops.includes("panel") || !hops.includes("org-edge")) {
        throw new Error("FC cases must cover escalation, panel, and org-edge hops");
      }
      return "FC1/FC2/FC3 present";
    }),
    step("42.7F-self-06", "every case has at least one expected hop", () => {
      const empty = cases.filter((entry) => entry.expectedHops.length === 0);
      if (empty.length > 0) {
        throw new Error(`cases missing expected hops: ${empty.map((e) => e.id).join(", ")}`);
      }
      return "all cases have expected-hop manifests";
    }),
    step("VC-5a-self-07", "all 9 W2 verticals appear in matrix", () => {
      const missing = VERIFIER_VERTICALS.filter(
        (vertical) => !cases.some((entry) => entry.input.industry === vertical),
      );
      if (missing.length > 0) {
        throw new Error(`missing verticals: ${missing.join(", ")}`);
      }
      return "all 9 verticals present";
    }),
    step("VC-5a-self-08", "every tenant x industry combination for 9 verticals", () => {
      const missing: string[] = [];
      for (const tenantClassification of ["standard", "phi-covered"] as const) {
        for (const industry of VERIFIER_VERTICALS) {
          const found = cases.some(
            (entry) =>
              entry.input.tenantClassification === tenantClassification &&
              entry.input.industry === industry,
          );
          if (!found) {
            missing.push(`${tenantClassification}:${industry}`);
          }
        }
      }
      if (missing.length > 0) {
        throw new Error(`missing tenant×industry combos: ${missing.join(", ")}`);
      }
      return "18 tenant×industry combinations covered (9 verticals × 2 tenants)";
    }),
    step("VC-5a-self-09", "legacy 48 cases preserved verbatim", () => {
      if (legacyCases.length !== LEGACY_CASE_COUNT) {
        throw new Error(`expected ${LEGACY_CASE_COUNT} legacy cases, got ${legacyCases.length}`);
      }
      const legacyIds = legacyCases.map((entry) => entry.id);
      for (const id of LEGACY_CASE_IDS) {
        if (!legacyIds.includes(id)) {
          throw new Error(`missing legacy case id ${id}`);
        }
      }
      return `${LEGACY_CASE_COUNT} legacy cases with stable IDs WV-001..WV-045 + WV-FC1..3`;
    }),
    step("VC-5a-self-10", "extended case block count", () => {
      if (EXTENDED_CASE_COUNT !== EXTENDED_VERIFIER_VERTICALS.length * EXTENDED_CASES_PER_VERTICAL) {
        throw new Error(
          `expected ${EXTENDED_VERIFIER_VERTICALS.length * EXTENDED_CASES_PER_VERTICAL} extended cases, got ${EXTENDED_CASE_COUNT}`,
        );
      }
      return `${EXTENDED_CASE_COUNT} extended cases (${EXTENDED_CASES_PER_VERTICAL} per new vertical)`;
    }),
    step("VC-5a-self-11", "total case count is 144", () => {
      if (TOTAL_CASE_COUNT !== 144 || cases.length !== 144) {
        throw new Error(`expected 144 total cases, got ${cases.length}`);
      }
      return "144 total cases (48 legacy + 96 extended)";
    }),
    ...EXTENDED_VERIFIER_VERTICALS.map((vertical) =>
      step(
        `VC-5a-self-${vertical}`,
        `${vertical} has ${EXTENDED_CASES_PER_VERTICAL} extended cases`,
        () => {
          const count = cases.filter((entry) => entry.input.industry === vertical).length;
          const expected = EXTENDED_CASE_COUNT_BY_VERTICAL[vertical];
          if (count < expected) {
            throw new Error(`expected >= ${expected} cases for ${vertical}, got ${count}`);
          }
          return `${count} cases for ${vertical}`;
        },
      ),
    ),
    step("VC-5a-self-17", "audit channel applicability registry complete", () => {
      assertVerticalApplicabilityRegistryComplete();
      return `${VERIFIER_AUDIT_CHANNELS.length} channels × ${VERIFIER_VERTICALS.length} verticals registered`;
    }),
    step("VC-5a-self-18", "extended cases start at WV-049", () => {
      const extendedIds = cases
        .filter((entry) => EXTENDED_VERIFIER_VERTICALS.includes(entry.input.industry as VerifierVertical))
        .map((entry) => entry.id)
        .filter((id) => id.startsWith("WV-0"));
      const first = extendedIds.sort()[0];
      if (first !== "WV-049") {
        throw new Error(`expected first extended id WV-049, got ${first}`);
      }
      return "extended block starts at WV-049";
    }),
    ...runAllLockVcTraversals().map(({ id, result }) =>
      step(`LOCK-VC-${id}`, `LOCK-VC traversal ${id}`, () => {
        if (!result.passed) {
          throw new Error(`missing: ${result.missing.join(", ")}`);
        }
        return `${id} cleared (${result.missing.length} missing)`;
      }),
    ),
  ];
}

export function runMetaVerifier(): {
  readonly passCount: number;
  readonly failCount: number;
  readonly totalSteps: number;
  readonly steps: readonly MetaVerifierStepResult[];
} {
  const steps = runMetaVerifierSteps();
  const passCount = steps.filter((entry) => entry.status === "PASS").length;
  const failCount = steps.length - passCount;
  return Object.freeze({
    passCount,
    failCount,
    totalSteps: steps.length,
    steps: Object.freeze(steps),
  });
}

if (require.main === module) {
  const result = runMetaVerifier();
  for (const entry of result.steps) {
    if (entry.status === "PASS") {
      console.log(`PASS ${entry.id} ${entry.name} — ${entry.detail}`);
    } else {
      console.error(`FAIL ${entry.id} ${entry.name}:`, entry.detail);
    }
  }
  if (result.failCount > 0) {
    console.error(`Phase 42.7F meta-verifier failed (${result.failCount}/${result.totalSteps} steps).`);
    process.exit(1);
  }
  console.log(`Phase 42.7F meta-verifier passed (${result.passCount}/${result.totalSteps} steps).`);
}
