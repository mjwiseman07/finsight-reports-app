# Phase 42.6 Planning Document — External Attestations & Engagements (v1.0)

## External Attestations & Engagements

**Document Owner:** Matthew Wiseman  
**Company:** Wiseman Financial Technologies LLC  
**Product:** Advisacor  
**Phase:** Phase 42.6 — External Attestations & Engagements  
**Status:** Planning — Ready for Review. Depends on Phase 42.5 LOCK.  
**Depends On:** Phase 42.5 LOCKED ([`PHASE_42_5_LOCK.md`](PHASE_42_5_LOCK.md)); **LOCK-42.5.3** (D0) satisfied at 42.5 lock time  
**Blocks:** Phase 54 **full** commercial clearance (EXIT-54.1, 54.2, 54.3 complete, 54.4 legal-ready, 54.6 public, 54.7)  
**Date:** June 20, 2026  
**Namespace:** `docs/trust/engagements/`, `docs/trust/attestations/`, `ops/compliance/soc/observation/`  
**Related:** [`PHASE_42_5_PLANNING_DOCUMENT.md`](PHASE_42_5_PLANNING_DOCUMENT.md) (spine + D0 + readiness drafts)

---

## Purpose

Phase 42.6 owns everything whose **deliverable is an independent act by a licensed or qualified external party** — CPA attestation, HIPAA counsel sign-off, pen-test execution, formal SOC observation window, public trust claims backed by issued reports.

Phase 42.5 owns the **control layer code**, **internal D0 proof** (42.5O / LOCK-42.5.3), and **readiness artifact drafts** the founder can produce and sign. Phase 42.6 owns **external attestation** of those artifacts and **operational gates** that require engaged professionals.

**Binding rule:** No AI verification pass substitutes for licensed CPA attestation, HIPAA counsel sign-off, or qualified pen-test execution.

---

## Architectural Position

```text
… → Universal Control Spine + Overlays (Phase 42.5)   ← code + D0 + drafts + founder LOCK
-> External Attestations & Engagements (Phase 42.6)   ← THIS PHASE
-> Commercial Launch (Phase 54)
```

Phase 42.6 is a **consumer** of 42.5 readiness packs (42.5Q/R/U/V/W/X drafts). It does not rebuild the spine. Any change to control spine or HIPAA overlay after CPA engagement requires re-running 42.5O verifier + probe + PC-01..20 per **LOCK-42.6.1** reliance rules (inherited from former LOCK-42.5.4).

---

## Exit Criteria (Phase 42.6)

Phase 42.6 is complete and lockable only when all are true:

- **LOCK-42.6.1** through **LOCK-42.6.6** satisfied (see Lock Conditions).
- **EXIT-54.1**, **EXIT-54.2**, **EXIT-54.3** (complete, not draft), **EXIT-54.4** (legal-reviewed), **EXIT-54.6** (public publish), **EXIT-54.7** satisfied per Q6 path decided at **LOCK-42.5.2**.
- Professional Hand-Off List items executed or documented with engaged party.
- **PHASE_42_6_LOCK.md** created with founder attestation.

Phase 42.6 does **not** re-prove D0 unless the spine or overlay changed after 42.5 LOCK (then re-run 42.5O per reliance rules).

---

## Non-Goals

Phase 42.6 does not include:

- Rebuilding control-spine code (42.5 Waves 1–3).
- Re-running D0 as a default gate (only on spine/overlay change post-engagement).
- Per-vertical knowledge stacks.
- Public trust-page claims before reports support them.
- In-house substitution for CPA, counsel, or pentest firm deliverables.

---

## Module Order and Build Steps

**Build cadence:** one module at a time → audit → commit. External party scheduling is outside software control.

### Wave Index

**Wave 1 — Engagements & Observation**

- **42.6A** CPA SOC Engagement
- **42.6B** SOC Observation Window Start
- **42.6D** SOC System Description External Review *(may run parallel with 42.6A)*

**Wave 2 — Counsel & Security Testing**

- **42.6E** HIPAA Counsel Attestation
- **42.6F** BAA Legal Review & Execution Readiness
- **42.6G** NPRM Counsel Posture Review
- **42.6H** Pen-Test Engagement & Execution

**Wave 3 — Issuance, Publish & Lock**

- **42.6C** SOC Report Issuance *(long pole; after observation window)*
- **42.6I** Professional Engagements Coordination *(tracker; may start at 42.5 LOCK)*
- **42.6J** Trust Page Publish
- **42.6K** Phase 42.6 Final Audit and Lock

**Recommended build sequence:** 42.6I (shell) → 42.6A → 42.6D → 42.6B → 42.6E + 42.6F + 42.6G (parallel where possible) → 42.6H → 42.6C → 42.6J → 42.6K

---

### 42.6A CPA SOC Engagement

Execute signed CPA engagement for SOC 1 + SOC 2 Type II. Consumes 42.5Q/R readiness packs.

**Namespace:** `docs/trust/engagements/cpa/`

**External party:** **Licensed CPA firm** (one firm, SOC 1 + SOC 2)

**Outputs:**

- Signed SOC 1 + SOC 2 engagement letter on file
- Engagement readiness checklist from 42.5Q consumed
- Reliance rules documented: spine/overlay change → re-run 42.5O before continued audit reliance

**Guardrails:**

- Prerequisite: **Phase 42.5 LOCK** + **LOCK-42.5.3** (D0) at lock time
- No observation window date recorded without signed letter

**Build steps:**

1. Confirm 42.5Q/R draft packs current at engagement date.
2. Select and engage one CPA firm (Q3 posture: SOC 1 + SOC 2 Type II).
3. Execute engagement letter; file in `docs/trust/engagements/cpa/`.
4. Document reliance / re-proof obligation on spine changes.
5. Audit module → PASS; commit.

**Maps to:** **LOCK-42.6.1** (migrated from LOCK-42.5.4); EXIT-54.1/54.2 prerequisite.

---

### 42.6B SOC Observation Window Start

Record formal SOC 2 Type II observation window start. Evidence collection cadence from 42.5R plan goes live.

**Namespace:** `ops/compliance/soc/observation/`

**External party:** **CPA firm** (receives evidence)

**Outputs:**

- Observation window start date recorded (signed acknowledgment from CPA)
- Evidence collection cadence activated per 42.5R plan
- Deviation-log discipline live
- **GL-2** satisfied

**Guardrails:**

- **LOCK-42.6.1** must be executed first
- Wave 4 SOC readiness artifacts from 42.5 complete at 42.5 LOCK
- Under Path B (LOCK-42.5.2): **EXIT-54.7** explicit gate
- Under Path A: EXIT-54.7 implied by issued Type II at EXIT-54.2

**Build steps:**

1. Confirm 42.5 LOCK and LOCK-42.6.1 satisfied.
2. Record observation window start date with CPA firm.
3. Activate evidence collection cadence from 42.5R.
4. Enable deviation-log discipline.
5. Document GL-2 gate satisfaction.
6. Audit module → PASS; commit.

**Maps to:** **GL-2**; **EXIT-54.7**; SOC Type II Timeline (below).

---

### 42.6C SOC Report Issuance

Track CPA issuance of SOC 1 and SOC 2 reports per Q6 path (LOCK-42.5.2 decided in Phase 42.5).

**Namespace:** `docs/trust/attestations/soc/`

**External party:** **Licensed CPA firm**

**Outputs:**

- SOC 1 report issued (EXIT-54.1)
- SOC 2 report issued, ≥ Security + Availability + Confidentiality (EXIT-54.2)
- Report metadata recorded (issuance date, observation window, categories)
- Processing Integrity resolution per Q2 (CPA) if applicable

**Guardrails:**

- Path A: wait for issued Type II before GL-5 trust claims
- Path B: Type I may unblock earlier commercial posture; Type II in-flight during Phase 54

**Build steps:**

1. Execute Q6 path per LOCK-42.5.2 (Path A or B).
2. Track observation window completion per 42.6B.
3. Receive and file issued reports.
4. Update 42.5X placeholders with true issuance dates (do not publish until 42.6J).
5. Audit module → PASS; commit.

**Maps to:** **EXIT-54.1**; **EXIT-54.2**; **GL-5** precursor.

---

### 42.6D SOC System Description External Review

CPA/professional review of system description boundary drafted in 42.5Q/R.

**Namespace:** `docs/trust/attestations/soc/system-description-review/`

**External party:** **CPA firm** (+ founder as needed)

**Outputs:**

- System description **reviewed** vs finalized 42/42M/42I namespace
- Review sign-off or review memo on file
- Divergence process documented (update 42.5Q before HIPAA pack scope changes)

**Guardrails:**

- Consumes **42.5Q/R drafts** — does not rewrite from scratch unless review finds gap
- **LOCK-42.5.8 draft half** satisfied in 42.5 (42.5Q system description draft); **review half** satisfied here

**Build steps:**

1. Submit 42.5Q system description to CPA for boundary review.
2. Incorporate review feedback; update 42.5Q/R if required.
3. File review memo / sign-off.
4. Audit module → PASS; commit.

**Maps to:** **LOCK-42.6.2** (migrated from LOCK-42.5.8 review portion); 42.5Q draft at 42.5 LOCK.

---

### 42.6E HIPAA Counsel Attestation

HIPAA counsel engagement and sign-off on D3/D4 deliverables drafted in 42.5V/W.

**Namespace:** `docs/trust/engagements/hipaa-counsel/`

**External party:** **HIPAA counsel / qualified consultant**

**Outputs:**

- Counsel engagement letter on file
- D3 HIPAA pack counsel sign-off (42.5V draft → **complete**)
- D4 posture review coordination (feeds 42.6G)
- **EXIT-54.3** satisfied (complete, not draft)

**Guardrails:**

- Not substitutable by AI verification
- 42.5V steps 1–7 must be complete at 42.5 LOCK

**Build steps:**

1. Engage HIPAA counsel for D3 + D4 review scope.
2. Submit 42.5V HIPAA pack draft.
3. Incorporate counsel feedback; finalize pack.
4. Obtain counsel sign-off; file attestation.
5. Audit module → PASS; commit.

**Maps to:** **LOCK-42.6.3** (migrated from LOCK-42.5.5); **EXIT-54.3**; **GL-4** precursor.

---

### 42.6F BAA Legal Review & Execution Readiness

Counsel review of BAA/DPA stack drafted in 42.5U.

**Namespace:** `docs/trust/engagements/baa/`

**External party:** **HIPAA counsel** (H-3, H-7)

**Outputs:**

- BAA/DPA templates **legal-reviewed**
- Counterparty-ready execution package
- Subprocessor BAA negotiation plan for PHI-touching vendors (incl. LLM endpoints)
- **EXIT-54.4** satisfied

**Guardrails:**

- 42.5U inventory + draft templates complete at 42.5 LOCK
- Vendor negotiation (H-7) may continue in parallel with early GL-4 prep

**Build steps:**

1. Submit 42.5U BAA/DPA drafts to HIPAA counsel (H-3).
2. Incorporate counsel redlines; finalize templates.
3. Document subprocessor BAA negotiation plan (H-7).
4. Mark stack counterparty-ready; file sign-off.
5. Audit module → PASS; commit.

**Maps to:** **LOCK-42.6.4** (migrated from LOCK-42.5.6 legal-reviewed portion); **EXIT-54.4**; **GL-4**.

---

### 42.6G NPRM Counsel Posture Review

Counsel review of NPRM gap register posture (Q4) — not a final-rule build.

**Namespace:** `docs/trust/engagements/hipaa-counsel/nprm/`

**External party:** **HIPAA counsel** (Q4)

**Outputs:**

- Q4 NPRM compliance posture reviewed and documented
- Counsel validation of 42.5W register (primary-source verified at 42.5 LOCK)
- Contingency trigger procedure counsel-aware

**Guardrails:**

- 42.5W register populated at 42.5 LOCK; counsel validates posture only here
- Open gaps OK; unassigned gaps NOT OK (EXIT-54.5 draft satisfied in 42.5)

**Build steps:**

1. Submit 42.5W NPRM gap register to HIPAA counsel.
2. Conduct Q4 posture review session.
3. File counsel posture memo.
4. Update register owners/triggers if counsel directs.
5. Audit module → PASS; commit.

**Maps to:** **LOCK-42.6.5** (migrated from LOCK-42.5.7 counsel portion); EXIT-54.5 validation.

---

### 42.6H Pen-Test Engagement & Execution

Qualified third-party penetration test per D8 program documented in 42.5S.

**Namespace:** `docs/trust/engagements/pentest/`

**External party:** **Qualified pen-test firm** (H-4)

**Outputs:**

- Pen-test scope and methodology agreed (H-4)
- Annual pen test **executed**
- Findings report on file; remediation tracked per D8

**Guardrails:**

- 42.5S D8 program documented at 42.5 LOCK
- Scope/methodology NOT decided in-house (H-4)

**Build steps:**

1. Engage qualified pentest firm.
2. Define scope and methodology with firm (H-4).
3. Execute test; receive report.
4. File report; track remediation per D8 SLAs.
5. Audit module → PASS; commit.

**Maps to:** D8 evidence; **LOCK-42.6.6**; SOC 2 Security TSC evidence.

---

### 42.6I Professional Engagements Coordination

Coordination shell tracking all external engagements — not substitutable for the engagements themselves.

**Namespace:** `docs/trust/engagements/`

**External party:** **All** (CPA, HIPAA counsel, pentest firm)

**Outputs:**

- Engagement tracker (CPA, counsel, pentest) with status and dates
- Professional Hand-Off List completion matrix
- Q6 path execution status (LOCK-42.5.2)

**Guardrails:**

- Tracker may be opened at 42.5 LOCK with placeholder rows
- AI verification does not check off professional items

**Build steps:**

1. Create engagement tracker template at 42.5 LOCK (optional early start).
2. Wire rows to 42.6A/E/F/G/H modules as they complete.
3. Track report issuance toward EXIT-54.1/54.2.
4. Audit module → PASS; commit.

**Maps to:** Professional Hand-Off List; coordination only.

---

### 42.6J Trust Page Publish

Public trust page and questionnaire library — **publish** only when reports support claims.

**Namespace:** `docs/trust/` (publish surface)

**External party:** **Founder** (publish decision) + **issued reports** (CPA)

**Outputs:**

- Trust page **published** with true claims only
- Report issuance dates and observation windows filled from 42.6C
- SIG/CAIQ library from 42.5X made available
- **GL-5** satisfied
- **EXIT-54.6** satisfied (public)

**Guardrails:**

- **HARD RULE:** no SOC/HIPAA badge until report ISSUED
- 42.5X draft + founder review (LOCK-42.5.9) complete at 42.5 LOCK
- Benchmark-not-target discipline (LOCK-42.5.9)

**Build steps:**

1. Confirm EXIT-54.1/54.2 reports issued (or Path B posture documented).
2. Fill 42.5X placeholders with true dates/windows.
3. Founder + counsel final review of public wording.
4. Publish trust page.
5. Audit module → PASS; commit.

**Maps to:** **GL-5**; **EXIT-54.6** (public); LOCK-42.5.9 publish half.

---

### 42.6K Phase 42.6 Final Audit and Lock

Read-only comprehensive audit against Phase 42.6 exit criteria and LOCK-42.6.1–6.

**Namespace:** `PHASE_42_6_LOCK.md` (created at lock time only)

**Outputs:**

- Comprehensive audit report: PASS / PARTIAL / FAIL per area
- Phase 54 EXIT-54.1–54.7 clearance assessment (54.0/54.8 closed at 42.5 LOCK)
- Lock attestation document (if all PASS)

**Guardrails:**

- Lock only when every LOCK-42.6.* PASS
- Spine change after lock → re-run 42.5O per LOCK-42.6.1 reliance rules

**Build steps:**

1. Audit each LOCK-42.6.1–6 condition.
2. Audit EXIT-54.1, 54.2, 54.3, 54.4, 54.6, 54.7.
3. Verify Professional Hand-Off List complete.
4. If all PASS: create `PHASE_42_6_LOCK.md` and founder attestation.
5. If any FAIL: report gaps; do not lock.

**Maps to:** Phase 42.6 lock; Phase 54 full hard-blocker clearance.

---

## EXIT-54 Carry-Forward Matrix (from Phase 42.5)

| EXIT | Description | Satisfied at **42.5 LOCK** | Satisfied at **42.6 LOCK** |
|------|-------------|---------------------------|---------------------------|
| **EXIT-54.0** | D0 control-spine verification COMPLETE | **Yes** (LOCK-42.5.3) | — (re-run only on spine change) |
| **EXIT-54.1** | SOC 1 ISSUED | Draft readiness only (42.5Q) | **Yes** (42.6C) |
| **EXIT-54.2** | SOC 2 ISSUED | Draft readiness only (42.5R) | **Yes** (42.6C) |
| **EXIT-54.3** | HIPAA pack complete | **Draft** (42.5V) | **Yes** (42.6E counsel sign-off) |
| **EXIT-54.4** | BAA legal-reviewed + execution-ready | **Draft** inventory/templates (42.5U) | **Yes** (42.6F) |
| **EXIT-54.5** | NPRM register populated + owned | **Yes** (42.5W draft + primary-source) | Counsel validation (42.6G) |
| **EXIT-54.6** | Trust page + questionnaires | **Draft** (42.5X) | **Publish** (42.6J) |
| **EXIT-54.7** | SOC 2 observation window STARTED | Evidence machinery live (42.5D/T) | **Formal start** (42.6B) |
| **EXIT-54.8** | PHI-contamination gate (GL-3) | **Yes** (42.5M) | — |

**NOTE:** Non-healthcare verticals may go live at **GL-3** at **42.5 LOCK** (EXIT-54.0 + EXIT-54.8) without waiting for 42.6. Healthcare (**GL-4**) requires 42.6E/F.

---

## Go-Live Gates Owned by Phase 42.6

| Gate | When | Phase 42.6 module |
|------|------|-------------------|
| **GL-2** | SOC observation window started | **42.6B** |
| **GL-4** | BAA signed + HIPAA pack complete | **42.6E** + **42.6F** (overlay code ready at 42.5 LOCK) |
| **GL-5** | Reports issued + trust page live | **42.6C** + **42.6J** |

**GL-1** and **GL-3** are achievable at **42.5 LOCK** — see [`PHASE_42_5_PLANNING_DOCUMENT.md`](PHASE_42_5_PLANNING_DOCUMENT.md).

---

## Lock Conditions for Phase 42.6

| Lock | Description | Migrated from |
|------|-------------|---------------|
| **LOCK-42.6.1** | One CPA firm engaged; signed SOC 1 + SOC 2 engagement letter. Prerequisite: Phase 42.5 LOCK + LOCK-42.5.3. Spine/overlay change after engagement → re-run 42.5O + PC-01..20 before continued audit reliance. | LOCK-42.5.4 |
| **LOCK-42.6.2** | SOC system-description boundary **reviewed** vs finalized 42/42M/42I namespace (CPA/professional review of 42.5Q draft). | LOCK-42.5.8 (review half) |
| **LOCK-42.6.3** | HIPAA counsel/qualified consultant engaged; D3/D4 sign-off on finalized pack (42.5V draft → complete). | LOCK-42.5.5 |
| **LOCK-42.6.4** | BAA template + subprocessor BAA/DPA stack **legal-reviewed**, counterparty-ready (42.5U drafts). | LOCK-42.5.6 (legal-reviewed half) |
| **LOCK-42.6.5** | NPRM counsel Q4 posture review complete; 42.5W register counsel-validated. | LOCK-42.5.7 (counsel half) |
| **LOCK-42.6.6** | Qualified pen-test firm engaged; scope agreed (H-4); annual test **executed**. | H-4 / 42.5S D8 |

---

## Q6 Path A/B — Observation + Issuance Timeline

**Decision owner:** Founder at **LOCK-42.5.2** (Phase 42.5). **Execution owner:** Phase 42.6.

| Path | Observation (42.6B) | Issuance (42.6C) | Launch implication |
|------|---------------------|------------------|-------------------|
| **Path A — Straight to Type II** | Full window before issuance; formal start at LOCK-42.6.1 | Wait for issued Type II | Strongest report; ~9–18 mo end-to-end depending on window length |
| **Path B — Type I first, Type II in-flight** | Window starts at 42.6B; EXIT-54.7 explicit | Type I may issue earlier; Type II during Phase 54 | Faster to market; two audit rounds |

**SOC Type II observation-window reality (first-time report):**

- **3-month window:** AICPA-permitted; enterprise buyers skeptical; ~6–9 mo end-to-end.
- **6-month window:** Realistic minimum / buyer norm; ~9–12 mo from cold start.
- **12-month window:** Gold standard; ~12–18 mo.
- **Renewal:** 12 months rolling after first report.

**Evidence-from-day-one posture (v1.8):** 42.5D audit logging and 42.5T retention run from launch so evidence accrues; **formal window start** records at **42.6B** when CPA engages (**LOCK-42.6.1**).

---

## Professional Hand-Off List

The plan can be written in-house; **execution** requires engaged professionals. NOT decidable by founder + AI verification:

| Item | External party | Phase 42.6 module |
|------|----------------|-------------------|
| SOC 2 category selection beyond Security/Availability/Confidentiality (Q2) | CPA auditor | 42.6C / 42.6D |
| SOC 1 + SOC 2 attestation | Licensed CPA firm | 42.6A, 42.6C |
| NPRM compliance posture (Q4) | HIPAA counsel | 42.6G |
| BAA template terms + subprocessor negotiation (H-3, H-7) | HIPAA counsel | 42.6F |
| Penetration-test scope and methodology (H-4) | Qualified pentest firm | 42.6H |
| FIPS-validated encryption module selection (H-5) | Security architect / CPA IT | Optional carry-forward; may attach to 42.6D |
| Log-retention vs jurisdiction (H-6) | HIPAA counsel + CPA | Optional; may attach to 42.6E |

No AI verification pass substitutes for these.

---

## Migration Note (from pre-v1.9 Phase 42.5 planning)

Former Phase 42.5 modules **42.5Z** (SOC Observation Window Start) and **42.5AA** (Professional Engagements Coordination) are **superseded** by Phase 42.6 modules **42.6B** and **42.6I** respectively. Committed code modules **42.5A** and **42.5B** are unchanged.

LOCK-42.5.4 through LOCK-42.5.8 external halves → LOCK-42.6.1 through LOCK-42.6.5 (+ LOCK-42.6.6 for pentest).

---

## References

See [`PHASE_42_5_PLANNING_DOCUMENT.md`](PHASE_42_5_PLANNING_DOCUMENT.md) References section for primary-source links (AICPA SOC 2, HHS HIPAA, NPRM).
