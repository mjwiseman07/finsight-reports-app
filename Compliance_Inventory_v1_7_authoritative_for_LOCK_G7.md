# Phase 42.7 + G7 — Compliance Inventory v1.7 (authoritative for LOCK-G7)

```
============================================================
COMPLIANCE INVENTORY — REFERENCE DOCUMENT (LOCK-G7)
Companion to Phase_42_7E_Memory_Framework_Dimension.md
Promoted from v1.6 (LOCK-42.7 recon2) at G7-C7c.
Historical anchor: Compliance_Inventory_v1_6_authoritative_for_lock_42_7_recon2.md
============================================================
```

**Document metadata**
- `phase`: `42.7 + G7` (cross-phase compliance overlay — LOCKED)
- `name`: `Compliance Inventory v1.7`
- `documentClass`: `compliance-register` (not a build spec; not `executable`)
- `lockTag`: `LOCK-G7`
- `g7Status`: `LOCKED`
- `schemaVersion`: `1.2.0`
- `registerState`: `0 fix-now / 91 doc-lim / 0 defer / 110 satisfied (201 total)`
- `realFilingsTested`: `45`
- `crossoverValidators`: `7`
- `cascadeStages`: `29`
- `containsVerticalComplianceLogic`: `true` (by reference — control identifiers only)
- `builderNeverAuthorsContent`: `true` (no business content; only control mapping)
- `isNotReplacementForHuman`: `true` (this register supports human auditor review; does not replace SOC examination)
- `complianceClass`: `SOC1 + SOC2-T2 + HIPAA`
- `companionDoc`: `Phase_42_7E_Memory_Framework_Dimension.md`
- `appliesToPhases`: [`42.7A`, `42.7A.2`, `42.7A.3`, `42.7A.4`, `42.7B`, `42.7C`, `42.7D`, `42.7E`, `42.7B.1`, `42.7C.2`, `42.7D.1-audit`, `42.7A.5`, `42.7F`, `42.7G`]
- `branchTarget`: `architecture-lane-refactor-baseline`
- `repoRoot`: `C:\Users\mattj\finsight-reports`
- `governanceEmail`: `mwiseman@advisacor.com`

---

## 0. Purpose of this register

This document exists for three audiences:

1. **Cursor / engineering** — to confirm that each phase ships the specific control evidence its compliance class requires, before LOCK-42.7 is granted.
2. **External SOC examiner** — to walk a clear evidence path from each Trust Services Criterion / SOC 1 control objective / HIPAA safeguard down to the specific phase, file, test suite, and audit log entry that satisfies it.
3. **Founder (Matthew Wiseman, Wiseman Financial Technologies LLC)** — to retain a single source of truth for "what compliance lift did each phase actually contribute," so no phase silently fails an audit on a control nobody mapped.

**Standing rule:** every Phase 42.7 deliverable, going forward, must be entered in this register at the time it is built. A phase that does not appear here is, by definition, unaudited.

---

## 1. Compliance frameworks in scope

### 1.1 SOC 1 (ICFR — Internal Control over Financial Reporting)

Advisacor produces output that flows into customer financial statements (treatment resolutions, journal advisories, KPI computations, disclosure suggestions). It is therefore a **service organization affecting user-entity financial reporting**, which places it under SOC 1 SSAE 18 scope.

Core SOC 1 control objectives that apply to this build sequence:

| Control objective | Description | Where Advisacor must demonstrate |
|---|---|---|
| **CO-SOC1-1 Authorization** | Each financial-output decision traces to an authorized input (citation, rule, election, role) | Phase 42.7B role adapter, 42.7C panel consumer, 42.7D org-edge, 42.7E fingerprint dimension |
| **CO-SOC1-2 Completeness** | All transactions/decisions are processed; nothing dropped silently | Phase 38 D0 wiring evidence, 42.7E cache eviction logging, 42.7F wiring verifier |
| **CO-SOC1-3 Accuracy** | Output reflects the authorized rule applied to the authorized input at point-in-time | Phase 42.7E `electionFingerprint` cache key dimension (locked decision E1) |
| **CO-SOC1-4 Cutoff / period integrity** | Decisions are tagged with the rule version effective at decision time | Phase 42.7A.4 sync election registry + 42.7E audit log timestamp + chain |
| **CO-SOC1-5 Change management** | Rule/registry changes go through authorized review | Phase 42.7A.5 (retrofit, pending) — CODEOWNERS, PR template, registry changelog |
| **CO-SOC1-6 Restricted access** | Internal data structures (cache, registry) cannot be tampered with by unauthorized code | Phase 42.7E E5 `RESOLVER_INTERNAL` symbol; Phase 39 LOCK |
| **CO-SOC1-7 Monitoring** | Anomalies (cache thrash, fingerprint mismatch storms, audit-write failures) are surfaced | Phase 42.7E `getCacheMetrics()`, fail-closed audit writer, 42.7G D0 rollup |

### 1.2 SOC 2 Type 2 — Trust Services Criteria (TSC)

Advisacor processes customer financial + (for healthcare vertical) protected health information. Type 2 = effectiveness over a period (typically 6–12 months), not just design.

Five trust services categories; **Security (Common Criteria CC1–CC9) is mandatory**, plus we are scoping in **Availability (A1)**, **Confidentiality (C1)**, and **Processing Integrity (PI1.1–PI1.5)**. Privacy (P1–P8) is **out of current scope** but flagged where it touches PHI handling (see §6).

| TSC | Title | Phase 42.7 touchpoint |
|---|---|---|
| **CC1** | Control environment | Doctrine bindings on every spec (`isNotReplacementForHuman`, `builderNeverAuthorsContent`); founder sign-off via mwiseman@advisacor.com |
| **CC2** | Communication and information | Phase Atlas, build specs, this Compliance Inventory itself |
| **CC3** | Risk assessment | Retrofit phases (42.7B.1, 42.7C.2, 42.7D.1-audit, 42.7A.5) — explicit gap acknowledgment |
| **CC4** | Monitoring activities | Phase 42.7E `getCacheMetrics()`; Phase 42.7G D0_WIRING_EVIDENCE rollup; Phase 42.7F wiring verifier |
| **CC5** | Control activities | Verifier scripts in every phase (42.7B 50/50, 42.7C 7/7, 42.7D 10/10, 42.7E 7 verifier checks planned) |
| **CC6** | Logical and physical access controls | Phase 42.7E E5 cache surface authorization (`RESOLVER_INTERNAL` symbol); Phase 39 LOCK persona scoping |
| **CC7** | System operations | Phase 42.7E audit log fail-closed behavior on write failure; daily rotation; hash chain |
| **CC8** | Change management | Phase 42.7A.5 (retrofit, pending) — CODEOWNERS, PR template, registry change log; Phase Atlas lock SHAs |
| **CC9** | Risk mitigation | Phase 42.7E hash-chained audit log = tamper evidence; LRU + TTL ceilings = DoS bounding |
| **A1** | Availability — capacity / bounded resources | Phase 42.7E LRU max 10,000 (hard ceiling 100,000); TTL 6h/1h; cache cannot grow unbounded |
| **C1** | Confidentiality | Phase 42.7E E6 PHI tenant segregation; segregated Maps; `purgePHIForTenant()` API |
| **PI1.1** | Processing inputs are complete, valid, accurate, authorized | Phase 42.7C panel consumer (industry → framework); Phase 42.7D org-edge (org override); Phase 42.7A.4 sync registry |
| **PI1.2** | Processing produces outputs that meet specifications | TreatmentResolution 5-key shape contract; D0 6-key top-level contract |
| **PI1.3** | System processing is timely | Phase 42.7E per-process cache + TTL — fresh-enough guarantee |
| **PI1.4** | Outputs are accurate, complete, distributed appropriately | Phase 42.7C citationHandlesConsulted, matchedRules; advisories array |
| **PI1.5** | Outputs are stored completely, accurately, and protected | Phase 42.7E audit log JSONL durable append + hash chain |

### 1.3 HIPAA (Health Insurance Portability and Accountability Act)

Triggered specifically by the **healthcare vertical** (Phases 42.N1, 42.O, 42.P) and any **email intake module** (Phase 39 module 12) that may receive PHI. Three rule sets apply:

| Safeguard family | Identifier | Title | Phase 42.7 touchpoint |
|---|---|---|---|
| **Administrative** | §164.308(a)(1)(i) | Security management process | Doctrine bindings; this register; founder governance via mwiseman@advisacor.com |
| **Administrative** | §164.308(a)(3) | Workforce security | Phase 39 LOCK personas + role escalation registry (42.7B) |
| **Administrative** | §164.308(a)(4) | Information access management | Phase 42.7E E5 + E6 |
| **Administrative** | §164.308(a)(5)(ii)(C) | Log-in monitoring | Phase 42.7E audit log records caller identity for `phi-covered` entries |
| **Administrative** | §164.308(b)(1) | Business Associate Contracts (BAA) | OUT OF SCOPE for this phase; flagged for legal — see §7 |
| **Physical** | §164.310(d)(1) | Device and media controls | Storage layer concern — flagged §7, deferred to infra phase |
| **Technical** | §164.312(a)(1) | Access control | Phase 42.7E E5 `RESOLVER_INTERNAL`; Phase 39 persona scoping |
| **Technical** | §164.312(a)(2)(iv) | Encryption and decryption | Storage encryption — flagged §7, deferred to infra |
| **Technical** | **§164.312(b)** | **Audit controls** | **Phase 42.7E `AuditLogWriter` interface + `FileAppendAuditLogWriter`** |
| **Technical** | §164.312(c)(1) | Integrity controls | Phase 42.7E hash chain on audit log entries |
| **Technical** | §164.312(d) | Person or entity authentication | Phase 42.7E E6 caller identity capture on `phi-covered` entries |
| **Technical** | §164.312(e)(1) | Transmission security | Out of cache scope; flagged §7 for API gateway phase |

---

## 2. Master compliance matrix — phase × control class

Coverage status legend:
- **C** = Covered: control evidence is implemented and tested in this phase
- **G** = Gap: control is relevant but not yet implemented; remediation phase identified
- **N/A** = Not applicable to this phase
- **R** = Referenced: phase relies on a control implemented elsewhere (cite the implementing phase)

| Phase | SOC 1 (CO-1..7) | SOC 2 CC1–CC9 | SOC 2 A1/C1/PI1.1–1.5 | HIPAA §164.308 / .310 / .312 | Retrofit pointer |
|---|---|---|---|---|---|
| 42.7A scaffolding (`96f6048`) | 1:R 2:R 3:R 4:C 5:**C** 6:C 7:R | CC1:C CC2:C CC3:**C** CC4:R CC5:R CC6:R CC7:R CC8:**C** CC9:R | A1:R C1:R PI1.1:R PI1.2:R PI1.3:R PI1.4:R PI1.5:R | .308:R .310:N/A .312:R | **CLOSED by 42.7A.5 at `2c8a5e5`** |
| 42.7A.2 + A.3 (`c4b4dc4`) | 1:C 2:R 3:C 4:C 5:**C** 6:R 7:R | CC1:R CC2:C CC3:**C** CC4:R CC5:C CC6:R CC7:R CC8:**C** CC9:R | PI1.1:C PI1.2:C PI1.4:C others:R | .308(a)(4):R .312:R | **CLOSED by 42.7A.5 at `2c8a5e5`** |
| 42.7A.4 sync registry (`b36a16b`) | 1:C 2:C 3:C 4:**C** 5:**C** 6:R 7:R | CC1:R CC2:C CC3:**C** CC5:C CC8:**C** | PI1.1:C PI1.2:C PI1.3:R PI1.5:R | — | **CLOSED by 42.7A.5 at `2c8a5e5`** |
| 42.7B role adapter (`1a3e09e`) | 1:C 2:R 3:C 4:R 5:R 6:C 7:**C** | CC1:R CC2:C CC3:R CC4:**C** CC5:C CC6:C CC7:**C** | PI1.1:C PI1.2:C PI1.4:C | .308(a)(3):C **.312(b):C** **.312(d):C** | **CLOSED by 42.7B.1 at `8ee3286`** |
| 42.7C panel consumer (`c8bddc8`) | 1:C 2:C 3:C 4:R 5:R 6:R 7:**C** | CC1:R CC2:C CC3:R CC4:**C** CC5:C CC6:R CC7:**C** | PI1.1:**C** PI1.2:C PI1.3:R PI1.4:C PI1.5:**C** | **.312(b):C** | **CLOSED by 42.7C.2 at `ea23461`** |
| 42.7D org-edge (`20b4bdf`) | 1:C 2:C 3:C 4:R 5:R 6:R 7:**C** | CC1:R CC2:C CC3:R CC4:**C** CC5:C CC6:R CC7:**C** | PI1.1:C PI1.2:C PI1.4:C PI1.5:**C** | **.312(b):C** | **CLOSED by 42.7D.1-audit at `36919c8`** |
| **42.7E memory + audit log** (✅ `15d2b57`) | 1:**C** 2:**C** 3:**C** 4:**C** 5:R 6:**C** 7:**C** | CC1:R CC2:C CC3:R CC4:**C** CC5:C CC6:**C** CC7:**C** CC8:R CC9:**C** | A1:**C** C1:**C** PI1.3:**C** PI1.5:**C** | .308(a)(5)(ii)(C):**C** .312(a)(1):**C** **.312(b):C** .312(c)(1):**C** .312(d):**C** | none (this IS the foundation) |
| 42.7B.1 escalation audit retrofit (✅ `8ee3286`) | 7:C | CC4:C CC7:C | PI1.5:C | .312(b):C .312(d):C | — |
| 42.7C.2 panel decision audit retrofit (✅ `ea23461`) | 1:C(strengthen) 7:C | CC4:C CC7:C | PI1.5:C | .312(b):C | — |
| 42.7D.1-audit org-edge audit retrofit (✅ `36919c8`) | 1:C(strengthen) 7:C | CC4:C CC7:C | PI1.5:C | .312(b):C | — |
| 42.7A.5 registry change-mgmt (✅ `2c8a5e5`) | 5:C | CC8:C CC3:C | — | — | — |
| 42.7F cross-phase wiring verifier (✅ `0032bf1`) | 2:**C** 7:C | CC4:C(cross-phase) CC5:C(cross-phase) | PI1.1–PI1.5:**all-C end-to-end** | **.312(b):C(cross-phase) .312(c)(1):C(cross-phase)** | — |
| 42.7G D0_WIRING_EVIDENCE + LOCK-42.7 | 1–7:rollup | CC1–CC9:rollup | A1, C1, PI1:rollup | .308/.310/.312:rollup | LOCK gate |

**Reading the matrix:** every cell marked `G` (gap) MUST have a non-blank retrofit pointer. A `G` without a retrofit phase is a release blocker.

---

## 3. Phase-by-phase compliance contribution (already shipped)

### 3.1 Phase 42.7A scaffolding — SHA `96f6048` + `04a3337`

**What it shipped:** Module skeleton, npm alias `@advisacor/architecture-lane`, package structure under `architecture-lane/`.

| Control | Status | Evidence |
|---|---|---|
| SOC 1 CO-4 (period integrity) | C | Branch `architecture-lane-refactor-baseline` is the period-stable build target |
| SOC 1 CO-6 (restricted access) | C | Module-scoped exports; nothing global |
| SOC 2 CC1 (control environment) | C | Doctrine bindings declared in spec |
| SOC 2 CC2 (information) | C | Atlas entry recorded |
| SOC 2 CC8 (change management) | **G** | No CODEOWNERS, no PR template at this point |
| HIPAA §164.312 | R | No PHI flows yet; defers to 42.7E |

**Gaps closed by later phase:** SOC 2 CC8 → 42.7A.5 (pending)

### 3.2 Phase 42.7A.2 + A.3 — SHA `c4b4dc4` — curated rules + MFG/RTL shims

**What it shipped:** Curated industry rules paste; manufacturing & retail shims converting to architecture-lane format.

| Control | Status | Evidence |
|---|---|---|
| SOC 1 CO-1 (authorization) | C | Every curated rule cites an authorized standards source (see source map) |
| SOC 1 CO-3 (accuracy) | C | Rules byte-identical to source paste; verifier confirms |
| SOC 1 CO-4 (period integrity) | C | Shim conversion preserves source rule version |
| SOC 2 CC5 (control activities) | C | Shim verifier scripts run on each build |
| SOC 2 PI1.1 (input validity) | C | Industry → rule mapping is authorized via curated paste |
| SOC 2 PI1.2 (output spec) | C | TreatmentResolution shape preserved |
| SOC 2 PI1.4 (output accuracy) | C | `matchedRules` array carries provenance |

**Gaps:** CC8 — same 42.7A.5 deferral.

### 3.3 Phase 42.7A.4 sync election registry — SHA `b36a16b`

**What it shipped:** Sync registry for elections (e.g., FIFO vs. weighted-average, percentage-of-completion vs. completed-contract).

| Control | Status | Evidence |
|---|---|---|
| **SOC 1 CO-4 (period integrity)** | **C** | Election registry is the authoritative "what election applies in this period" source — directly satisfies cutoff requirements |
| SOC 1 CO-1 (authorization) | C | Election entries require explicit handle; no inference |
| SOC 1 CO-3 (accuracy) | C | Registry lookup is deterministic |
| SOC 2 PI1.1 (input validity) | C | Election handle must exist in registry or resolver rejects |
| SOC 2 CC2 (information) | C | Registry is single source of truth |

**This phase is the foundation for 42.7E's `electionFingerprint` cache key dimension.** Without 42.7A.4, fingerprinting has no canonical input.

### 3.4 Phase 42.7B role adapter + escalation registry — SHA `1a3e09e` (50/50 tests)

**[2026-06-24 update: Gaps closed by 42.7B.1 at `8ee3286`. SOC 2 CC4, CC7 and HIPAA §164.312(b), §164.312(d) all flipped G→C. See §5.1 for retrofit detail.]**


**What it shipped:** Role adapter mapping Phase 39 personas to escalation thresholds; escalation registry storing materiality + complexity tiers.

| Control | Status | Evidence |
|---|---|---|
| SOC 1 CO-1 (authorization) | C | Escalation thresholds tied to role authority |
| SOC 1 CO-3 (accuracy) | C | Adapter is deterministic mapping |
| SOC 2 CC5 (control activities) | C | 50/50 tests gate the build |
| **SOC 2 CC4 (monitoring)** | **G** | Escalation events emitted but not persisted — **42.7B.1 retrofit required** |
| **SOC 2 CC7 (operations)** | **G** | No audit trail of escalation decisions — **42.7B.1** |
| SOC 2 CC6 (logical access) | C | Adapter is internal-only; not exposed |
| HIPAA §164.308(a)(3) (workforce security) | C | Role → authority mapping is the workforce control |
| **HIPAA §164.312(b) (audit controls)** | **G** | Escalation events not yet logged — **42.7B.1** |
| HIPAA §164.312(d) (entity authentication) | **G** | Caller identity not captured on escalation — **42.7B.1** |

**Critical retrofit gating:** 42.7B.1 must land before LOCK-42.7.

### 3.5 Phase 42.7C Industry Panel Consumer — SHA `c8bddc8` (87/87 tests, 7/7 verifier)

**[2026-06-24 update: Gaps closed by 42.7C.2 at `ea23461`. SOC 2 CC4, CC7, PI1.5 and HIPAA §164.312(b) all flipped G→C. Retrofit shipped 52/52 tests + 10/10 verifier; pure-core byte-identity preserved via rename-only extraction (`CapabilityGate.ts` → `capabilityGatePure.ts`). 428/428 regression preserved. See §5.2 for retrofit detail.]**


**What it shipped:** Industry → framework panel consumer; chooses an applicable framework given a tenant's industry classification.

| Control | Status | Evidence |
|---|---|---|
| SOC 1 CO-1 (authorization) | C | Panel result cites the rule and the industry classification handle |
| SOC 1 CO-3 (accuracy) | C | 87/87 deterministic outputs |
| SOC 2 CC5 (control activities) | C | 7/7 verifier suite |
| **SOC 2 CC4 (monitoring)** | **G** | Panel decisions not persisted — **42.7C.2 retrofit** |
| **SOC 2 CC7 (operations)** | **G** | No audit trail — **42.7C.2** |
| **SOC 2 PI1.1 (input validity)** | **C** | Industry handle validation is strict; unknown handles rejected |
| SOC 2 PI1.2 (output spec) | C | Framework result conforms to 5-key TreatmentResolution shape |
| SOC 2 PI1.4 (output accuracy) | C | `citationHandlesConsulted` array carried through |
| **SOC 2 PI1.5 (output storage)** | **G** | Decisions ephemeral — **42.7C.2** |

**Critical retrofit gating:** 42.7C.2 must land before LOCK-42.7.

### 3.6 Phase 42.7D Org→Standards Edge — SHA `20b4bdf` (60/60 tests, 10/10 verifier)

**[2026-06-24 update: Gaps closed by 42.7D.1-audit at `36919c8`. SOC 2 CC4, CC7, PI1.5 and HIPAA §164.312(b) all flipped G→C. Retrofit shipped 48/48 tests + 10/10 verifier; pure-core byte-identity preserved via rename-only extraction (`disagreement-detector.ts` → `orgStandardsEdgePure.ts`, SHA `cb7d9474…0311ad`). 476/476 cumulative regression preserved. See §5.3 for retrofit detail. **Audit retrofit sequence (B.1 + C.2 + D.1-audit) now complete — every audit emission point exists.**]**


**What it shipped:** Organization-level overrides on standard framework choice (e.g., a PCC-qualifying org electing to deviate from US GAAP on a specific topic).

| Control | Status | Evidence |
|---|---|---|
| SOC 1 CO-1 (authorization) | C | Org override requires an attested org policy handle |
| SOC 1 CO-3 (accuracy) | C | 60/60 + 10/10 verifier |
| SOC 2 CC5 | C | Verifier suite |
| **SOC 2 CC4 (monitoring)** | **G** | Org-vs-standards disagreement not persisted — **42.7D.1-audit retrofit** |
| **SOC 2 CC7 (operations)** | **G** | No audit trail of override application — **42.7D.1-audit** |
| SOC 2 PI1.1 (input validity) | C | Org override handles validated |
| **SOC 2 PI1.5 (output storage)** | **G** | Disagreement event ephemeral — **42.7D.1-audit** |

**Critical retrofit gating:** 42.7D.1-audit must land before LOCK-42.7.

---

## 4. Phase 42.7E — compliance contribution (✅ SHIPPED at `15d2b57`, 2026-06-24)

**Status update (2026-06-24):** All §4 control claims below moved from "target" to "verified shipped." Verification evidence: `npm run verify:memory-cache` 90/90, `npm run verify:audit-log` 41/41, `node scripts/verify-phase-42-7e.js` 12/12, regression suites preserved at 50/50 + 87/87 + 60/60. Total 290/290. `resolveTreatmentPure.ts` byte-identical to `20b4bdf`. Cursor delivered Spec-floor + 5 net-positive adds: `redaction.ts` (PHI/PII hashing), `verifyAuditChain()` (tamper verifier), `StaticTenantClassifier`, expanded verifier 7→12 checks, `InMemoryAuditLogWriter` production-throw guard.


Phase 42.7E is the **single largest compliance lift** of the 42.7 sequence. It does three things that no prior phase did:

1. Introduces `electionFingerprint` as a cache key dimension → SOC 1 CO-3 reproducibility upgraded from "tested" to "structurally guaranteed."
2. Introduces the `AuditLogWriter` interface + `FileAppendAuditLogWriter` → satisfies HIPAA §164.312(b) at the platform level and provides the shared logging contract that 42.7B.1, 42.7C.2, and 42.7D.1-audit retrofits will consume.
3. Introduces PHI tenant classification (`standard` vs `phi-covered`) with segregated Maps + `purgePHIForTenant()` → satisfies HIPAA §164.308(a)(4) information access management and SOC 2 C1 confidentiality.

| Control | Status in 42.7E | Evidence file (target) |
|---|---|---|
| **SOC 1 CO-1 (authorization)** | **C** | `electionFingerprint` ensures the authorized election at decision time is recoverable |
| **SOC 1 CO-2 (completeness)** | **C** | Eviction events logged; nothing dropped silently |
| **SOC 1 CO-3 (accuracy)** | **C** | Cache key is `(memoryHandle, framework, electionFingerprint?)` |
| **SOC 1 CO-4 (period integrity)** | **C** | TTL + timestamps on every cache entry; rule version captured in fingerprint |
| **SOC 1 CO-6 (restricted access)** | **C** | `RESOLVER_INTERNAL` symbol blocks unauthorized cache surface use |
| **SOC 1 CO-7 (monitoring)** | **C** | `getCacheMetrics()` surfaces hit/miss/eviction; fail-closed on audit-write failure |
| **SOC 2 CC4 (monitoring)** | **C** | Metrics API + audit log foundation |
| **SOC 2 CC6 (logical access)** | **C** | `RESOLVER_INTERNAL` (E5 decision) |
| **SOC 2 CC7 (operations)** | **C** | Fail-closed audit writer; daily rotation; bounded resources |
| **SOC 2 CC9 (risk mitigation)** | **C** | Hash chain on audit log = tamper evidence |
| **SOC 2 A1 (availability / bounded resources)** | **C** | LRU max 10,000 (hard ceiling 100,000); TTL ceiling 24h; cache cannot OOM the process |
| **SOC 2 C1 (confidentiality)** | **C** | PHI tenants get segregated Map + 1h TTL + caller-identity audit detail |
| **SOC 2 PI1.3 (timeliness)** | **C** | Per-process cache + TTL bound staleness |
| **SOC 2 PI1.5 (output storage)** | **C** | Durable JSONL append log with hash chain |
| **HIPAA §164.308(a)(5)(ii)(C) (log-in monitoring)** | **C** | Caller identity recorded on `phi-covered` cache access |
| **HIPAA §164.312(a)(1) (access control)** | **C** | `RESOLVER_INTERNAL` + tenant classification gate |
| **HIPAA §164.312(b) (audit controls)** | **C** | `AuditLogWriter` interface + `FileAppendAuditLogWriter` implementation |
| **HIPAA §164.312(c)(1) (integrity controls)** | **C** | Hash chain prevents tampering; daily rotation preserves chain across files |
| **HIPAA §164.312(d) (entity authentication)** | **C** | Caller identity captured on `phi-covered` entries |

**Phase 42.7E test requirement to claim these controls:** ≥131 tests total (≥90 cache behavior + ≥41 audit log behavior, including hash-chain integrity, daily rotation correctness, fail-closed on write failure, PHI segregation correctness, `purgePHIForTenant()` correctness).

---

## 5. Retrofit phases — gap closure plan

These four phases exist solely to close compliance gaps in already-shipped 42.7B / 42.7C / 42.7D and to lock in 42.7A change management. None of them is optional; LOCK-42.7 cannot be granted until all four land.

### 5.1 Phase 42.7B.1 — Escalation registry audit retrofit (✅ SHIPPED at `8ee3286`, 2026-06-24)

**Status:** Shipped. 376/376 tests passing (48 new + 8/8 verifier; all 7 prior verifiers preserved). Pure-core preserved via rename-only extraction with byte-identity verified.

- **Closes:** SOC 2 CC4, CC7; HIPAA §164.312(b), §164.312(d); SOC 1 CO-7 for escalation events. **All four gap cells closed as of `8ee3286`.**
- **Mechanism:** Wire `AuditLogWriter` from 42.7E into the escalation registry. Every escalation decision writes an entry with: caller persona handle, materiality tier, complexity tier, target role handle, timestamp, decision outcome.
- **Estimated tests:** ~30 (mostly verifying that no escalation code path bypasses the writer; plus fail-closed behavior).
- **Cannot start before:** 42.7E ships (depends on `AuditLogWriter`).
- **Gates:** LOCK-42.7.

### 5.2 Phase 42.7C.2 — Panel consumer decision audit retrofit (✅ SHIPPED at `ea23461`, 2026-06-24)

**Status:** ✅ SHIPPED at `ea23461`, 2026-06-24. 52/52 tests passing (spec floor 40, +12 overdelivery) + 10/10 verifier checks (spec floor 8, +2 overdelivery). 428/428 regression preserved. Pure-core preserved via rename-only extraction (`CapabilityGate.ts` → `capabilityGatePure.ts`); pure-core SHA `8ca0891fab6e6e90db478468f7f765fa9fdb0bd0d34565029e4df551055bf242` byte-identical to `c8bddc8`. Cursor overdelivery: added `derivePanelDecisionContextPure.ts`, `locked-citation-handles.ts`, `validatePanelDecisionEntry()`.

- **Closes:** SOC 2 CC4, CC7, PI1.5; HIPAA §164.312(b); SOC 1 CO-1 strengthening (industry→framework decisions reproducible from log alone). **All four gap cells closed as of `ea23461`.**
- **Mechanism:** Wired `AuditLogWriter` from 42.7E into the panel consumer. Every panel call writes one entry to the audit log (including `advisoryCount: 0` calls); advisories generated in the call are bundled into a single `advisoriesGenerated[]` array on that entry. Full caller identity captured on every entry. PHI classification on every entry. Hash chain participation via existing 42.7E chain. Fail-closed on audit-write failure (inherits 42.7E E7). Extends 42.7E `AuditLogEntry` union with `panel.decision` variant. Citation handles restricted to the 5 locked anchors.
- **Tests shipped:** 52/52 (spec floor 40) + 10/10 verifier (spec floor 8).
- **Cannot start before:** 42.7E ships. ✅ Dependency satisfied at `15d2b57`.
- **Gates:** LOCK-42.7. ✅ G4 satisfied.

### 5.3 Phase 42.7D.1-audit — Org-edge reconciliation audit retrofit (✅ SHIPPED at `36919c8`, 2026-06-24)

**Status:** ✅ SHIPPED at `36919c8`, 2026-06-24. 48/48 tests passing (spec floor 40, +8 overdelivery, ~20%) + 10/10 verifier checks (spec floor 8, +2 overdelivery, +25%). 476/476 cumulative regression preserved. Pure-core preserved via rename-only extraction (`disagreement-detector.ts` → `orgStandardsEdgePure.ts`); pure-core SHA `cb7d9474c98f239676c802c58813b1117e756c07002d92efbc6adc7dfe0311ad` byte-identical to `20b4bdf` logic block. `disagreement-detector.ts` retained as thin re-export shim. Cursor overdelivery: added `deriveOrgEdgeReconciliationContextPure.ts`, `validateOrgEdgeReconciliationEntry()`, `org-edge` actor.via wiring on 42.7E writers, 10-group test taxonomy A–J.

- **Closes:** SOC 2 CC4, CC7, PI1.5; HIPAA §164.312(b); SOC 1 CO-1 strengthening (org-vs-standards decisions reproducible from log alone). **All four gap cells closed as of `36919c8`.**
- **Mechanism:** Wired `AuditLogWriter` from 42.7E into the org→standards edge. Every reconciliation call writes exactly one `orgEdge.reconciliation` audit entry — agreement cases (`diff: { kind: "none" }`), disagreement cases (`diff: { kind: "override-applied", orgPolicyHandle, panelFrameworkHandle, resolvedFrameworkHandle, attestationChain, resolutionRule }`), and no-election cases (no org election present). Full caller identity captured on every entry. PHI classification duplicated at entry root + inside `callerIdentity`. Hash chain participation via existing 42.7E chain (no parallel chain). Fail-closed on audit-write failure (inherits 42.7E E7). Extends 42.7E `AuditLogEntry` union with `orgEdge.reconciliation` variant. Citation handles restricted to the 5 locked anchors (reuses `locked-citation-handles.ts` from 42.7C.2; no duplicate allow-list). **Disagreement events are first-class log entries; agreement events are also first-class log entries — no silent path through the org-edge exists.**
- **Tests shipped:** 48/48 (spec floor 40) + 10/10 verifier (spec floor 8).
- **Cannot start before:** 42.7E ships. ✅ Dependency satisfied at `15d2b57`.
- **Gates:** LOCK-42.7. ✅ G5 satisfied.

**Retrofit sequence closure:** 42.7B.1 (`8ee3286`) + 42.7C.2 (`ea23461`) + 42.7D.1-audit (`36919c8`) — all three audit retrofits shipped. Every audit emission point that LOCK-42.7 requires now exists in code. Phase 42.7F (cross-phase wiring verifier) is the first phase whose tests can structurally pass only because all three retrofits exist.

### 5.4 Phase 42.7A.5 — Registry change-management controls

- **Closes:** SOC 2 CC8 (change management); SOC 1 CO-5; SOC 2 CC3 (risk assessment) supporting evidence.
- **Mechanism:** Three documentation/process artifacts:
  1. **CODEOWNERS** entries for `architecture-lane/registries/**` requiring mwiseman@advisacor.com review on every change.
  2. **PR template** with checklist: "Does this change a registry? If so, has the change been logged in `REGISTRY_CHANGE_LOG.md`? Has the affected tenant population been identified?"
  3. **`REGISTRY_CHANGE_LOG.md`** — append-only markdown log; each entry has date, registry name, change summary, justification, attestation by author.
- **Estimated artifacts:** 3 docs, no code, no tests (process control, not runtime control).
- **Cannot start before:** independent (can land in parallel with 42.7E or after).
- **Gates:** LOCK-42.7.

---

## 6. Forward-mapping — phases not yet specced

### 6.1 Phase 42.7F — Cross-phase wiring verifier

- **Closes / strengthens:** SOC 2 CC4, CC5; SOC 2 PI1.1–PI1.5 (verified end-to-end); SOC 1 CO-2 (completeness verified across phases).
- **Mechanism:** A verifier script that exercises every wiring point between 42.7A, B, C, D, E, B.1, C.2, D.1-audit and asserts that audit log entries are produced at every expected hop. Effectively a "no silent path" guarantee.
- **Status:** Spec not yet drafted; will follow LOCK-42.7E commit.

### 6.2 Phase 42.7G — D0_WIRING_EVIDENCE + LOCK-42.7

- **Closes / strengthens:** Rollup of all LOCK-42.7 invariants (LOCK-42.7.1 through LOCK-42.7.7).
- **Mechanism:** Generates `D0_WIRING_EVIDENCE.json` conforming to the 6-key D0 contract (`evidenceVersion`, `generatedAt`, `totalCases`, `passCount`, `failCount`, `cases`). Each case = one LOCK invariant + one compliance class evidence pointer. Failure to produce a passing D0 evidence document blocks LOCK-42.7.
- **Status:** Spec not yet drafted; final phase of 42.7.

---

## 7. Out-of-scope items (flagged, not deferred silently)

The following compliance items are **acknowledged as relevant** but are explicitly out of scope for the Phase 42.7 sequence. Each is flagged for a future infrastructure or governance phase.

| Item | Framework | Why deferred | Owner / next-phase pointer |
|---|---|---|---|
| Storage encryption at rest | HIPAA §164.312(a)(2)(iv) | Storage layer is platform / Supabase concern, not application | Infra phase (TBD); flag for legal review |
| Transmission security (TLS, API gateway) | HIPAA §164.312(e)(1); SOC 2 CC6.7 | API gateway phase | Infra phase (TBD) |
| Device/media controls | HIPAA §164.310(d)(1) | Operator-device concern | Governance phase; founder-side policy |
| **Business Associate Agreements (BAA)** | HIPAA §164.308(b)(1) | Legal-contract artifact, not engineering | Legal phase; required before healthcare-vertical GA |
| Privacy (P1–P8) Trust Services Category | SOC 2 Privacy | Not in current SOC 2 scope; expand after Type 2 Security/Availability/Confidentiality/PI examination completes | Future SOC 2 expansion phase |
| Backup + disaster recovery | SOC 2 A1.3 | Infra layer | Infra phase |
| Vulnerability management / pen testing | SOC 2 CC7.1, CC4.1 | Operational program, not phase deliverable | Governance program; mwiseman@advisacor.com |
| Vendor risk management (subprocessors) | SOC 2 CC9.2 | Procurement/legal concern | Governance phase |

**Standing rule on out-of-scope items:** they are flagged here so an external auditor cannot accuse Advisacor of having "missed" them. They are deferred, not omitted.

---

## 8. PHI handling — concrete control map

Healthcare-vertical tenants (Phase 42.N1 / 42.O / 42.P) and email intake (Phase 39 module 12) may bring PHI into the system. The following table is the canonical PHI control map for Phase 42.7.

| PHI control concern | Control implementation | Phase | HIPAA cite |
|---|---|---|---|
| PHI tenants identified | Tenant classification `standard` / `phi-covered` set at registration; no autodetection | 42.7E (E6) | §164.308(a)(4) |
| PHI cache isolation | Separate `Map` instance per tenant class; no cross-class lookups | 42.7E (E6) | §164.312(a)(1) |
| PHI cache TTL | 1 hour (vs. 6 hours standard) | 42.7E (E3) | §164.312(c)(1) (integrity via freshness) |
| PHI cache purge | `purgePHIForTenant(tenantId)` API; human-confirmed in prod | 42.7E (E6) | §164.308(a)(3) (workforce-driven action) |
| PHI cache access audit | Every `phi-covered` cache access (hit, miss, write, evict, purge) writes to audit log WITH caller identity | 42.7E (E2 + E6 + E7) | §164.312(b) |
| PHI audit log integrity | Hash chain; daily rotation preserves chain across files | 42.7E (E7) | §164.312(c)(1) |
| PHI audit log durability | Append-only JSONL; fail-closed on write failure | 42.7E (E7) | §164.312(b) |
| Email intake PHI containment | Email module (Phase 39 mod 12) tags incoming items; tagged items routed only to `phi-covered` tenants | Phase 39 (existing) | §164.308(a)(4) |
| Persona access to PHI | Phase 39 persona scoping prevents lower-tier personas (e.g., `ai-staff-accountant`) from reading PHI-tagged content above their authority | Phase 39 LOCK | §164.308(a)(3) |
| Disclosure logging (PHI access by personas) | Audit log entry per persona access | 42.7B.1 retrofit | §164.312(b); §164.528 (accounting of disclosures — partial) |

**Critical gap acknowledged:** §164.528 full disclosure accounting (6-year retention; patient-requestable) is NOT in current scope. PHI disclosure accounting at the patient level is a customer-side feature; Advisacor provides the audit log as the substrate, but the disclosure-accounting product feature itself is post-LOCK-42.7.

---

## 9. Audit log = first-class compliance artifact

The audit log produced by `FileAppendAuditLogWriter` (Phase 42.7E) is the single most important compliance evidence artifact this build sequence produces. It is the substrate that satisfies:

- HIPAA §164.312(b) Audit controls (directly)
- HIPAA §164.312(c)(1) Integrity (via hash chain)
- HIPAA §164.308(a)(5)(ii)(C) Log-in monitoring (via caller identity capture)
- SOC 2 CC4 Monitoring activities (the log IS the monitoring substrate)
- SOC 2 CC7 System operations (operational events appear here)
- SOC 2 CC9 Risk mitigation (tamper evidence via hash chain)
- SOC 2 PI1.5 Output storage (cached outputs' access pattern is the storage event log)
- SOC 1 CO-7 Monitoring (anomaly detection feeds from this log)

**Mandatory operational characteristics** (lift directly into 42.7E acceptance tests):

| Characteristic | Requirement | Test (in 42.7E ≥41 audit log tests) |
|---|---|---|
| Append-only | No update/delete API; only append | Mutation API absence test |
| Hash chain | Each entry includes hash of previous entry | Chain integrity test; chain-break detection test |
| Daily rotation | Date-named JSONL file per UTC day | Rotation test at UTC midnight boundary |
| Cross-file chain preservation | First entry of a new day's file references last entry of previous day | Cross-file chain test |
| Fail-closed on write | If write fails, the action that triggered the log entry fails | Fail-closed test (mock disk-full) |
| Caller identity on PHI | Every `phi-covered` entry has non-null caller identity | PHI caller-identity required test |
| Deterministic format | JSONL, UTC ISO-8601 timestamps, fixed field order | Schema conformance test |
| Bounded by retention policy | Retention configured externally (default ≥6 years for HIPAA) | Retention config respected test |

**Founder ops note:** rotated audit log files MUST be archived to durable, encrypted storage with no online edit path. Online edit ability defeats the entire chain integrity argument. This is an operational responsibility (mwiseman@advisacor.com) — flagged for the infra phase but called out here so it is not forgotten.

---

## 10. LOCK-42.7 compliance gates

LOCK-42.7 cannot be granted unless ALL of the following are true:

| Gate | Required state | Verifier |
|---|---|---|
| **G1** | Every shipped phase (42.7A through 42.7E) appears in §3 / §4 of this document with no unmapped `G` cells | Manual review against §2 matrix |
| **G2** | 42.7E ships with ≥131 tests passing and ≥7-check verifier passing | Phase 42.7E acceptance |
| **G3** | 42.7B.1 escalation audit retrofit shipped | Phase 42.7B.1 acceptance |
| **G4** | 42.7C.2 panel decision audit retrofit shipped | Phase 42.7C.2 acceptance |
| **G5** | 42.7D.1-audit org-edge disagreement persistence shipped | Phase 42.7D.1-audit acceptance |
| **G6** ✅ | 42.7A.5 registry change-management controls in place (CODEOWNERS, PR template, REGISTRY_CHANGE_LOG.md) | **Phase 42.7A.5 shipped at `2c8a5e5`, 2026-06-24** — 8/8 verifier checks pass |
| **G7** ✅ | 42.7F cross-phase wiring verifier passes | **Phase 42.7F shipped at `0032bf1`, 2026-06-24** — 48 cases / 147 assertions / 6 meta-checks pass |
| **G8** | 42.7G D0_WIRING_EVIDENCE produces passing D0 doc; all 7 LOCK-42.7 invariants `passCount > 0`, `failCount = 0` | Phase 42.7G acceptance |
| **G9** | Every "out of scope" item in §7 is acknowledged in writing and assigned to a future phase (no silent omission) | Manual review |
| **G10** | This Compliance Inventory is the version-controlled companion to the 42.7G LOCK commit (cite SHA) | Manual review at LOCK commit |

---

## 11. Citation source map (compliance frameworks)

| Framework / standard | Authoritative source |
|---|---|
| SOC 1 SSAE 18 | AICPA — Statement on Standards for Attestation Engagements No. 18 |
| SOC 2 Trust Services Criteria (2017, updated 2022) | AICPA — TSP Section 100 |
| HIPAA Security Rule | 45 CFR Part 164, Subpart C (§§164.302–164.318) |
| HIPAA Administrative Safeguards | 45 CFR §164.308 |
| HIPAA Physical Safeguards | 45 CFR §164.310 |
| HIPAA Technical Safeguards | 45 CFR §164.312 |
| HIPAA Disclosure Accounting | 45 CFR §164.528 |
| HIPAA Breach Notification | 45 CFR Part 164, Subpart D |

(No URLs cited in this internal compliance register; all references are framework section identifiers that an external SOC examiner will recognize. This document is intended to be paired with framework PDFs supplied by the examiner or the certifying CPA firm.)

---

## 13. G7 disclosure substrate — LOCK-G7 attestation (v1.7 delta)

### 13.1 Real-filing test coverage

All G7 emitters tested against real SEC/SEDAR/Companies House/equivalent filings via external-truth corpus:

- **45** extracted filings across 9 verticals (`tests/external-truth/filings/**/extracted.json`)
- Register provenance queryable per assertion (`emitter_path` + optional `assertion_hook` — B1 confirmed)

### 13.2 SOC 1 / SOC 2 Type 2 readiness

- **SOC 1 CO-2 (Completeness):** Register closure chain (`closed_in`, `reclassified_in`, `collapse_step`) auditable per gap
- **SOC 2 CC4/CC5:** Crossover validators provide framework-integrity monitoring above per-lane emitters
- **SOC 2 PI1.1–PI1.5:** Emitter-path integrity validator re-validates satisfaction hooks against real emitter source

### 13.3 HIPAA (Healthcare vertical)

HC payor mix + implicit price concession + allowance rollforward emitters operate inside the **42.5J/K HIPAA contract boundary**. PHI-covered tenant segregation preserved from 42.7E; crossover validators do not bypass lane gates.

### 13.4 Framework non-comingling

Enforced at lane-gate level for all 9 verticals × US GAAP + IFRS (IPSAS for NPO). `frameworkConsistencyValidator` (cascade stage 23) provides entity-level comingling surveillance. Audit attestation evidence ready in `docs/decisions/Phase_G7_C7b/C7b-execution.md`.

### 13.5 C7b backlog closure (compliance-relevant)

| Item | Compliance impact |
|---|---|
| B1 | Emitter provenance auditable — SOC 1 CO-1 strengthened |
| B2 | Evidence timestamp stability — CC7 monitoring noise reduced |
| B3 | Collapse-step documentation — CC8 change-management traceability |
| B4 | Matrix wiring policy — CC5 control activities for new emitters |
| B5 | Lessor surveillance — active monitoring (stage 26 advisory) |
| B6 | Classification integrity — register triage auditable |

---

## 12. Document control

- **Version**: 1.7 (LOCK-G7)
- **Status**: **LOCKED at LOCK-G7 tag.** G7 disclosure substrate frozen. Historical anchor: `Compliance_Inventory_v1_6_authoritative_for_lock_42_7_recon2.md`.
- **G7 sequence sealed:** C0 → C5 → C5.5 → C6 → C6.1 → C6.2 → C7a (-1..-15) → C7b (`b705706`) → C7c (LOCK-G7 tag)
- **Register at LOCK:** 0 fix-now / 91 doc-lim / 0 defer / 110 satisfied (201 total); schema v1.2.0
- **Next phase:** G10 mock-co regression; F-series blocked on G10 + Phase 35 + 42.5C
- **Owner**: Matthew Wiseman, founder, Wiseman Financial Technologies LLC (mwiseman@advisacor.com)
- **Review cadence**: Every phase commit in the 42.7 sequence must trigger a §2 matrix update before the next phase begins
- **Successor document**: At LOCK-42.7, this Inventory is frozen and a new `Phase_42_8_Compliance_Inventory.md` (or equivalent) is initiated for the next phase
- **Pairing requirement**: This document MUST be checked into the repo at LOCK-42.7G commit so the SOC examiner has a single repo-resident artifact

```
============================================================
END — Compliance Inventory v1.7 (LOCK-G7)
G7 disclosure substrate frozen. Next: G10 mock-co regression.
============================================================
```
