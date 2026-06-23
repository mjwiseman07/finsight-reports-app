---
status: DRAFT / SPEC ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: true
phase: Manufacturing Vertical Knowledge Stack — Wave 2 / MFG-K-I
artifact: Verifier + D0 Evidence Sub-Spec
locked: false
mode: SPEC AUTHORING — MACHINE VERIFICATION; D0 EMISSION
---

# MFG-K-I — Verifier + D0 Evidence Sub-Spec

**Module:** MFG-K-I — Verifier + D0 Evidence  
**Baseline:** `d65e3ff` (MFG-K-H)  
**Authority:** [`docs/Phase_MFG_2_Build_Spec.md`](../../Phase_MFG_2_Build_Spec.md) section 9, Wave 1 sources, K-0..K-H sub-specs

**DRAFT / SPEC ONLY — NOT EXECUTABLE** as a deployed panel path. Machine verifier + D0 evidence generator.

---

## 1. Purpose

Machine-verify the Wave 2 manufacturing knowledge stack against:

- Wave 1 sources (`Manufacturing_KPIs_Sources.md`, citation register)
- K-0 contracts (`ReportingBasis`, `ManufacturingBasisContracts`)
- K-F panel contract
- K-G evaluator (formula parity, sign convention via `makeSignedDollar`)
- K-H composition (spine barrel imports, `applicableBasis`, authorization)

Emit D0 evidence artifact on **every** run.

---

## 2. Script location

| Item | Path |
|---|---|
| Verifier | `scripts/verify-manufacturing-knowledge-stack.js` |
| npm script | `verify:manufacturing-knowledge-stack` (additive in `package.json`) |
| D0 output | `ops/compliance/manufacturing-knowledge-stack/D0_MFG_KNOWLEDGE_STACK_EVIDENCE.json` |

Convention: Node `.js` (matches `scripts/verify-*.js` precedent).

---

## 3. Wave 1 source ingestion

| Source | Usage |
|---|---|
| `docs/manufacturing/wave1/Manufacturing_KPIs_Sources.md` | KPI ID → formula, sub-segment matrix |
| `docs/manufacturing/wave1/Manufacturing_Citation_Verification_Register.xlsx` | Verification Register sheet |

**Formula whitespace rule:** collapse all whitespace runs to single space, trim, string-equal. Operators and parentheses must match exactly (after LaTeX normalization: `\times` → `*`, RHS extraction after `=`).

---

## 4. Planning-doc checks (a)–(f)

| Check | PC coverage | Implementation |
|---|---|---|
| (a) Contract↔KPI mapping | PC-01..03 | Parse `contract.ts` `MFG-V`/`MFG-FV` comment IDs |
| (b) Formula parity | PC-04..13 | JSDoc formula comments vs KPI doc formulas |
| (c) Citation register | PC-14..15 | Register rows + HEAD/GET fetch; drift detection |
| (d) Sub-segment matrix | PC-16 | KPI tables + evaluator sub-segment constants |
| (e) No FDA/ITAR/TSCA overlay | PC-17..19 | Grep manufacturing lane for forbidden imports |
| (f) Spine-export-only | PC-20..21, PC-29 | Composition + spine barrel scans |

---

## 5. PC enumeration — 29 cases

Authoritative list: [`docs/Phase_MFG_2_Build_Spec.md`](../../Phase_MFG_2_Build_Spec.md) section 9.5 (updated to 29 cases).

**PC-29 (K-H addendum):** Spine barrel lock — `lib/intelligence/synthetic/spine/index.ts` re-exports only.

Verifier maintains a `cases` array of exactly 29 entries, each with `id`, `decision`, `expected`, `outcome`, `reason`.

---

## 6. PC-24 bi-directional lease guard

All four sub-assertions required:

| Input category | Framework | Expected output |
|---|---|---|
| `asc842_candidate` | `us_gaap` | `asc842_candidate` |
| `asc842_candidate` | `ifrs_iasb` | `ifrs16_lessee_candidate` |
| `ifrs16_lessee_candidate` | `us_gaap` | `asc842_candidate` |
| `ifrs16_lessee_candidate` | `ifrs_iasb` | `ifrs16_lessee_candidate` |

Plus static check: `buildLeaseIntelligenceObservation.ts` calls `basisOf(reportingFramework)`.

---

## 7. PC-29 spine barrel lock

Permitted in `lib/intelligence/synthetic/spine/index.ts`:

- Blank lines, comments
- `export { ... } from '...'` (multiline)
- `export type { ... } from '...'`
- `export * from '...'`

Prohibited: `function`, `class`, `const`, `let`, `var`, `interface`, non-re-export `import`.

Fail reason: `SPINE_BARREL_NON_RE_EXPORT`.

---

## 8. D0 evidence emission (Amendment 1)

Every run writes `ops/compliance/manufacturing-knowledge-stack/D0_MFG_KNOWLEDGE_STACK_EVIDENCE.json`:

```json
{
  "evidenceVersion": "MFG-K-I-1",
  "generatedAt": "<ISO-8601>",
  "totalCases": 29,
  "passCount": <number>,
  "failCount": <number>,
  "cases": [
    { "id": "CHK-MFG-PC-01", "decision": "ALLOW", "expected": "ALLOW", "outcome": "PASS", "reason": "<slug>" }
  ]
}
```

- Create output directory if missing
- Atomic write (`.tmp` then rename)
- Exit 0 only when `failCount === 0` AND D0 file exists post-write

---

## 9. Citation spot-check (Amendment 2)

- HIGH-priority register rows fetched fresh each run
- Subscription-gated 200 (DART, asc.fasb.org) accepted without body spot-check
- Drift: register-time bad status + fresh 4xx/5xx → `CITATION_DRIFT_<register_id>`
- `ASC606-BAH` register row updated to `VERIFIED` / status=200 on first verifier run (committed with K-I)

---

## 10. No-throw policy

Verifier uses `process.exit()` and `console.error` for failures. No uncaught exceptions. Runtime errors captured in D0 cases array.

---

## 11. Non-goals

- No fix-up logic at runtime (register xlsx updated in K-I commit, not by verifier)
- No git operations
- No external API calls beyond register URL HEAD/GET
- No Wave 1 source doc edits (register xlsx status update is compliance metadata, not KPI source prose)
- No Phase 42 file edits

---

**END — MFG-K-I Verifier + D0 Evidence Sub-Spec**
