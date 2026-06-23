---
status: DRAFT / SPEC ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: true
phase: Retail Vertical Knowledge Stack — Wave 2 / Phase RTL-6 / v1.1 Schema Parity Patch
artifact: Cursor Build Spec Patch (amendment to Phase_RTL_6_Build_Spec.md)
locked: false
supersedes: Phase_RTL_6_Build_Spec.md §3 (Verifier Architecture) and §5 (D0 Evidence JSON Schema) field names only
preserves: All 31 PCs, all check categories, all anti-patterns, all DoD criteria
---

# Phase RTL-6 v1.1 — D0 Evidence Schema Parity Patch

**DRAFT / SPEC ONLY — NOT EXECUTABLE.** Amendment to `Phase_RTL_6_Build_Spec.md`. Composition not reimplementation. Additive only — no edits to existing CHK numbering.

---

## 0. Why this patch exists

Manufacturing Wave 2 locked at commit `9d3afb5` produces D0 evidence with the following field schema (verified live against `ops/compliance/manufacturing-knowledge-stack/D0_MFG_KNOWLEDGE_STACK_EVIDENCE.json`):

```
evidenceVersion : MFG-K-I-1
generatedAt     : 2026-06-23T04:57:30.011Z
totalCases      : 29
passCount       : 29
failCount       : 0
cases           : [ ... ]
```

The original `Phase_RTL_6_Build_Spec.md` §3 and §5 proposed a different field schema (`phase`, `verifiedAt`, `totalChecks`, `passedChecks`, `checks[]`). That divergence would create two incompatible D0 shapes across verticals, breaking any future tooling that aggregates compliance evidence across manufacturing + retail (+ fund accounting + healthcare).

**Decision:** retail D0 evidence must match the manufacturing schema exactly for all shared fields. Schema parity across verticals is worth more than the cosmetic field-name change.

**Retail-only extensions** (`commitHash`, `registerHash`, `waveOneDocsHashes`) are permitted as additive top-level keys beyond the MFG baseline — PC-RTL-VERIFY-LOCK-06 requires every MFG field name to be present, not that the schemas be identical byte-for-byte.

---

## 1. What this patch changes

**Only the JSON field names emitted by the RTL-K-I verifier.** Nothing else.

- All 31 PCs remain unchanged.
- All check categories remain unchanged.
- All anti-patterns remain unchanged.
- All DoD criteria remain unchanged.
- All TypeScript internal type names remain unchanged (the patch only affects the JSON serialization step).

---

## 2. Field-name mapping (verifier output JSON only)

| Original spec field name | Patched field name (matches MFG) | Type | Source |
|---|---|---|---|
| `phase: 'RTL-K-I-Wave2-D0'` | `evidenceVersion: 'RTL-K-I-1'` | string | MFG schema |
| `verifiedAt` | `generatedAt` | string (ISO-8601) | MFG schema |
| `totalChecks` | `totalCases` | number | MFG schema |
| `passedChecks` | `passCount` | number | MFG schema |
| `failedChecks` | `failCount` | number | MFG schema |
| `checks[]` | `cases[]` | array | MFG schema |
| `commitHash` | `commitHash` | string | unchanged (retail extension) |
| `registerHash` | `registerHash` | string | unchanged (retail extension) |
| `waveOneDocsHashes` | `waveOneDocsHashes` | object | unchanged (retail extension) |

Inside each case object — same parity rule. **Verified MFG per-case shape** (commit `9d3afb5`):

```json
{
  "id": "CHK-MFG-PC-01",
  "decision": "ALLOW",
  "expected": "ALLOW",
  "outcome": "PASS",
  "reason": "contract_kpi_v01"
}
```

Retail must emit the same five field names per case: `id`, `decision`, `expected`, `outcome`, `reason`. Do not use `caseId`, `status`, `evidence`, or `failureDetail` — those do not appear in manufacturing D0.

**Cursor must read** `ops/compliance/manufacturing-knowledge-stack/D0_MFG_KNOWLEDGE_STACK_EVIDENCE.json` **before authoring the RTL-K-I writer** and copy the per-case field names exactly.

---

## 3. Replacement code block for Phase_RTL_6_Build_Spec.md §5

Replace the `D0Evidence` interface in §5 with:

```typescript
/**
 * D0 evidence schema — matches manufacturing Wave 2 lock (commit 9d3afb5).
 * Shared field names are normative across verticals; do not diverge per vertical.
 * commitHash / registerHash / waveOneDocsHashes are retail additive extensions.
 */
interface D0Evidence {
  evidenceVersion: "RTL-K-I-1"; // NOT 'phase' — matches MFG-K-I-1 pattern
  generatedAt: string; // ISO-8601 timestamp — NOT 'verifiedAt'
  commitHash: string;
  totalCases: number; // NOT 'totalChecks'
  passCount: number; // NOT 'passedChecks'
  failCount: number; // NOT 'failedChecks'
  cases: VerifierCaseResult[]; // NOT 'checks'
  registerHash: string; // SHA-256 of Retail_Citation_Verification_Register.xlsx
  waveOneDocsHashes: { [filename: string]: string };
}

/** Per-case shape — copied verbatim from MFG D0 (9d3afb5). */
interface VerifierCaseResult {
  id: string; // e.g. 'PC-RTL-VERIFY-LOCK-01' or 'CHK-RTL-PC-01' per RTL naming
  decision: "ALLOW" | "DENY";
  expected: "ALLOW" | "DENY";
  outcome: "PASS" | "FAIL";
  reason: string; // machine-readable slug; NOT 'failureDetail' or 'evidence'
}
```

---

## 4. Replacement code block for §3 (Verifier Architecture)

The internal `VerifierCheck` and `VerifierResult` TypeScript types can remain unchanged inside the verifier runtime. **Only the final JSON serialization step changes.** The orchestrator's final write step must map:

```typescript
function emitD0Evidence(results: VerifierResult[]): D0Evidence {
  return {
    evidenceVersion: "RTL-K-I-1",
    generatedAt: new Date().toISOString(),
    commitHash: readCurrentCommitHash(),
    totalCases: results.length,
    passCount: results.filter((r) => r.passed).length,
    failCount: results.filter((r) => !r.passed).length,
    cases: results.map(serializeCaseToMFGSchema),
    registerHash: sha256OfFile("Retail_Citation_Verification_Register.xlsx"),
    waveOneDocsHashes: hashWaveOneRetailDocs(),
  };
}

function serializeCaseToMFGSchema(result: VerifierResult): VerifierCaseResult {
  return {
    id: result.id,
    decision: result.decision,
    expected: result.expected,
    outcome: result.passed ? "PASS" : "FAIL",
    reason: result.reasonSlug,
  };
}
```

The `serializeCaseToMFGSchema` helper is the one place to mirror manufacturing's per-case field names. Implementing it correctly is gated by PC-RTL-VERIFY-LOCK-06 below.

---

## 5. New acceptance criterion

Add to the existing 31 PCs:

**PC-RTL-VERIFY-LOCK-06 (HIGH priority):** Schema parity with manufacturing.

```
Description: The D0 evidence JSON emitted by RTL-K-I must use the same top-level field names as MFG-K-I (evidenceVersion, generatedAt, totalCases, passCount, failCount, cases). The per-case object field names must also match MFG-K-I exactly (id, decision, expected, outcome, reason).
Failure condition: any shared top-level field name in retail D0 evidence does not appear in manufacturing D0 evidence, OR any per-case field name in manufacturing D0 evidence is missing from retail D0 evidence (other than vertical-specific suffixes in evidenceVersion). Retail-only additive keys (commitHash, registerHash, waveOneDocsHashes) are permitted.
Implementation: load D0_MFG_KNOWLEDGE_STACK_EVIDENCE.json at verifier startup, extract required MFG keys + first case object keys, assert retail emits the same set for shared fields.
Evidence string: `Schema parity verified: retail D0 shared keys {keys} match manufacturing D0 shared keys {keys}`.
```

This brings the verifier to **32 PCs total**. Update DoD §9 to read **32+/32+ PASS** instead of 31+/31+.

---

## 6. Anti-patterns added

- Do not invent new field names "to make retail feel like its own vertical." Schema parity is the requirement.
- Do not emit both old and new field names ("for backwards compatibility"). There's no retail D0 evidence in production yet, so no backwards compatibility exists.
- Do not skip PC-RTL-VERIFY-LOCK-06. If MFG D0 evidence is unreadable at build time, that's a CRITICAL FLAG, not a reason to bypass the check.
- Do not rename per-case fields to `caseId` / `status` / `evidence` / `failureDetail` — manufacturing uses `id` / `decision` / `expected` / `outcome` / `reason`.

---

## 7. Definition of Done (additive)

Append to original §9:

- D0 evidence JSON shared top-level fields match manufacturing exactly: `evidenceVersion`, `generatedAt`, `totalCases`, `passCount`, `failCount`, `cases`
- Per-case object field names copied verbatim from manufacturing D0 evidence: `id`, `decision`, `expected`, `outcome`, `reason`
- Retail extensions present: `commitHash`, `registerHash`, `waveOneDocsHashes`
- PC-RTL-VERIFY-LOCK-06 PASS

---

## 8. Hand-off note

When retail Wave 2 locks at its future commit hash (analogous to manufacturing's `9d3afb5`), aggregate-tooling that reads compliance evidence across verticals (current and future: manufacturing, retail, fund accounting, healthcare) will be able to consume both D0 files with a single parser for the shared field set.

This same patch pattern applies to fund accounting Wave 2's verifier when authored — it must also match the MFG/RTL shared schema.

---

**End of Phase RTL-6 v1.1 Schema Parity Patch.**
