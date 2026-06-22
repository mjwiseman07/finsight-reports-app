DRAFT — Founder-authored. NOT CPA-reviewed. CPA engagement deferred to 
Phase 42.6 (LOCK-42.6.1 / LOCK-42.6.2). This draft is internal preparation 
material only. It is NOT a SOC 1 report, NOT an attestation, and MUST NOT 
be published, distributed externally, or claimed as evidence of SOC 1 readiness 
beyond founder-stage internal preparation. Issuance is gated by Phase 42.6 
CPA engagement, observation window, and AICPA SSAE 18 AT-C 320 attestation.

# SOC 1 System Description — Draft

## 1. Service organization overview

Wiseman Financial Technologies, LLC operates **Advisacor**, a multi-industry SaaS platform for accounting and financial automation. Customers include accounting/CPA firms, direct businesses, bookkeepers, and fractional CFO firms. At Phase 42.5 LOCK time, one regulated overlay class exists: **healthcare (HIPAA overlay tenants)**. Non-healthcare tenants operate on the universal control spine without an overlay attached.

## 2. Scope of services included

**In scope (control layer):**

- `ops/control-spine/` — universal spine: isolation, RBAC/personas, audit logging, encryption, authentication, industry-config tenant-attribute isolation, PHI ingestion gate, verification harnesses (including panel data paths and PHI boundary).
- `ops/compliance/overlays/hipaa/` — healthcare overlay: contracts, safeguards path, Phase 42 integration binding.

**Out of scope:**

- Phase 42 industry intelligence (`lib/intelligence/synthetic/industry/`) — knowledge stack content, not a financial-reporting control.
- Command Center **panel selection** logic — industry configuration; not spine-gated (panel **data** paths are in scope via 42.5P).

Boundary diagram input: `docs/trust/soc1/BOUNDARY_DIAGRAM_INPUT.json` (validated by `socScopeBoundary.assertPhiFlagged()`).

## 3. Infrastructure and software components

Placeholder pending **42.5U** subprocessor inventory: cloud hosting, database, email delivery, monitoring/error tracking, backup, LLM/AI endpoints. Full inventory at LOCK time per **42.5U**.

## 4. People

Two-owner shop (founder Matthew Wiseman + co-founder Janice). Segregation-of-duties compensating controls documented per **42.5S D10** (placeholder — cross-reference: compensating-control documentation at **42.5S**).

## 5. Procedures

Change management, incident response, and BCP/DR cross-reference **42.5S** (D8/D9/D10) and **42.5V** (HIPAA incident response runbook draft).

## 6. Data

- **Financial transaction data** — primary SOC 1 population (all tenants).
- **PHI** — healthcare overlay tenants only; enumerated per **42N1** field inventory (`Healthcare_KPIs_42N1_Sources.md`).
- **System metadata** — tenant configuration, audit events, isolation scope identifiers.

## 7. Boundaries and exclusions

The **control layer** (spine + HIPAA overlay) is in scope for ICFR-relevant processing integrity assertions tied to financial reporting. The **knowledge stack** (42N1/42O/42P healthcare intelligence) is out of scope as a control; **42O disclosure boundaries** (ASC 606 revenue recognition, charity care vs implicit price concession, etc.) are **inputs** to the control matrix (see `CONTROL_MATRIX.md` CO-07), not controls themselves.

## 8. Complementary user entity controls (CUECs)

Placeholder for engagement-time auditor input. Finalized at **42.6A** engagement.

## 9. Subservice organizations

Placeholder pending **42.5U**. Carve-out vs inclusive method TBD at CPA engagement.

## 10. Period of coverage

Placeholder pending **Q6** decision (3-month vs 6-month vs 12-month Type II observation window per Phase 42.5 planning doc).

---

DRAFT — Founder-authored. NOT CPA-reviewed. External review deferred to 
Phase 42.6 / LOCK-42.6.2. Boundary diagram input feeding socScopeBoundary 
helper lives at docs/trust/soc1/BOUNDARY_DIAGRAM_INPUT.json.
