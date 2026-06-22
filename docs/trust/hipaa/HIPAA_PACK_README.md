> **DRAFT — FOUNDER-AUTHORED. NOT COUNSEL-REVIEWED. NOT A CERTIFICATION.**
> **HIPAA counsel review required before any external use, BAA execution, or PHI flow.**
> **Counsel sign-off deferred to Phase 42.6 (42.6E / LOCK-42.6.3).**
> **This document does not constitute legal advice and may not be relied upon by any party as such.**

# HIPAA Compliance Pack — Reader's Guide

## What this pack is

Founder-authored **drafts** of current-rule HIPAA Security Rule (45 CFR Part 164 Subparts A and C) compliance documents for Wiseman Financial Technologies, LLC (Advisacor). The pack documents policies, risk analysis structure, incident-response layering, BAA references, and training attestation scaffolding sized for a two-owner shop.

Code surface: `ops/compliance/overlays/hipaa/pack/hipaaPackScopeBoundary.ts` — a scope-alignment guard only; safeguard implementation lives in **42.5J/K**.

## What this pack is not

- Not counsel-reviewed, not certified, not BAA-executed
- Not breach-notification readiness attestation
- Not external assurance of any kind
- Not Subpart B (transactions/code sets) or Subpart E (Privacy Rule) coverage
- Not a standalone full Subpart D breach-notification program (incident-response layering on **42.5S** only)
- Not a final-rule or proposed-rule (2025) compliance build — proposed-rule gap register is **42.5W**

## Scope

| Subpart | Status |
|---|---|
| A (General Provisions) | In scope (full) |
| C (Security Standards) | In scope (full) |
| D (Breach Notification) | Incident-response program layering on **42.5S** only |
| B (Transactions/Code Sets) | Explicitly out of scope |
| E (Privacy Rule) | Explicitly out of scope |

Human-readable scope: [`SCOPE_STATEMENT.md`](SCOPE_STATEMENT.md). Machine-readable guard: `hipaaPackScopeBoundary.getDeclaredPackScope()`.

## Counsel review status

**Pending Phase 42.6E / LOCK-42.6.3.** AI verification is not substitutable for HIPAA counsel review.

## Document index

| Document | Purpose |
|---|---|
| [`SCOPE_STATEMENT.md`](SCOPE_STATEMENT.md) | Prose scope declaration |
| [`RISK_ANALYSIS.md`](RISK_ANALYSIS.md) | PHI-path risk analysis (42.5K-pending field classification) |
| [`RISK_MANAGEMENT_PLAN.md`](RISK_MANAGEMENT_PLAN.md) | 164.308(a)(1)(ii)(B) risk management process |
| [`POLICY_SET.md`](POLICY_SET.md) | Policy documentation across five safeguard categories |
| [`BAA_TEMPLATE_REFERENCE.md`](BAA_TEMPLATE_REFERENCE.md) | Linkage to **42.5U** BAA template and execution register |
| [`SUBCONTRACTOR_BAA_DRAFT.md`](SUBCONTRACTOR_BAA_DRAFT.md) | Downstream subcontractor BAA flow-down draft |
| [`TRAINING_ATTESTATION_LOG.md`](TRAINING_ATTESTATION_LOG.md) | Training attestation log structure |
| [`INCIDENT_RESPONSE_RUNBOOK.md`](INCIDENT_RESPONSE_RUNBOOK.md) | HIPAA overlay on **42.5S** CC7.3/CC7.4 baseline |

## Cross-references

| Module | Use in this pack |
|---|---|
| **42.5Q** SOC 1 system description | Boundary alignment (`socScopeBoundary.getDeclaredBoundary()`) |
| **42.5R** SOC 2 readiness | Engagement cross-reference |
| **42.5S** operational programs | Incident response baseline (CC7.3/CC7.4) |
| **42.5T** retention baseline | HIPAA 6-year documentation floor (2191 days) |
| **42.5U** subprocessor BAA inventory | BAA template and execution register |
| **42.5J** HIPAA overlay contracts | `HipaaOverlayScopeContract` (Subparts A/C) |
| **42.5K** safeguards path | Q7a field classification — **PLACEHOLDER until closed** |
| **42.5L** Phase 42 integration | `minimumCellSize` canonical (Safe Harbor default 11) |
| **42.5N** PHI-derived-learning bright line | Referenced in technical safeguards |

---
> **END DRAFT.** Counsel review and HIPAA legal sign-off required before this document may be presented to a regulator, an auditor, a customer, a Business Associate, or any external party.
> **Phase 42.5V (Wave 5 opener).** Founder: Matthew Wiseman, Wiseman Financial Technologies LLC.
