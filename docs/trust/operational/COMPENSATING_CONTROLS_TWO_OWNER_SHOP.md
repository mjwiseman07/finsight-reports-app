DRAFT — Founder-authored. NOT CPA-reviewed. NOT pen-tested. External
review and pen-test execution deferred to Phase 42.6 (LOCK-42.6.6 / H-4).
This draft is internal preparation material only. It is NOT a SOC 2
Type II evidence artifact, NOT an attestation, and MUST NOT be published
or claimed as evidence of operating effectiveness. Cadence and SLAs
are STARTING TARGETS; auditor confirms at engagement.

# Compensating Controls — Two-Owner Shop

## Purpose

Standard SOC 2 / HIPAA control frameworks assume organizations of sufficient size to staff distinct roles (system administrator vs developer vs reviewer vs incident responder). Wiseman Financial Technologies, LLC operates as a two-owner partnership at Phase 42.5 readiness time. This document explains the compensating controls applied to each control area where two-person staffing creates a structural limitation, with the explicit understanding that an auditor or HIPAA counsel will pressure-test these compensating controls at Phase 42.6 engagement time. This pressure-testing is expected and welcomed.

## 1. Segregation of duties (SOX-style)

- **Gap:** A founder may develop a feature, deploy it, and review the audit log of its operation.
- **Compensating:** Every spine/overlay commit requires peer-founder review per **D10**; audit logs are tamper-evident (**42.5D**) and cross-tenant signed; CPA at Phase 42.6 reviews sampled commits independently.

## 2. On-call / 24-7 incident response

- **Gap:** No third-shift coverage; both founders sleep.
- **Compensating:** Monitoring alerts page both founders simultaneously; RTO target accounts for human-response latency; customer SLA does not promise 24-7 hot response (best-effort within RTO ≤ 72h).

## 3. Independent security review

- **Gap:** No in-house security team independent of development.
- **Compensating:** Annual third-party pen test (**D8** + Phase 42.6H); engaged HIPAA counsel review at Phase 42.6 / LOCK-42.6.7; CPA engagement at Phase 42.6A reviews SOC controls.

## 4. Vendor management staffing

- **Gap:** No dedicated vendor risk manager.
- **Compensating:** Subprocessor inventory + BAA management per **42.5U**; founder-level review of every new subprocessor before contracting; spine-level enforcement of non-PHI flows to subprocessors (not policy-only).

## 5. Privacy officer role (HIPAA 45 CFR 164.530(a))

- **Gap:** No dedicated privacy officer; founder serves dual role.
- **Compensating:** Privacy officer designation documented in **42.5V** HIPAA Compliance Pack; HIPAA counsel at Phase 42.6 / LOCK-42.6.7 reviews privacy officer scope and recommends remediation if role-conflict cannot be sustained.

## 6. Annual policy review

- **Gap:** No compliance team to drive annual policy review cycle.
- **Compensating:** Calendar-driven annual review of every operational program doc (D8/D9/D10); review evidence retained per **42.5T**.

## 7. Auditor / counsel review expectation

This document will be pressure-tested at Phase 42.6 engagement. Any compensating control deemed insufficient will be remediated per auditor recommendation **before** Phase 42.6 LOCK.

---

DRAFT — Founder-authored. NOT CPA-reviewed. NOT pen-tested. External
review and pen-test execution deferred to Phase 42.6 (LOCK-42.6.6 / H-4).
This draft is internal preparation material only. It is NOT a SOC 2
Type II evidence artifact, NOT an attestation, and MUST NOT be published
or claimed as evidence of operating effectiveness. Cadence and SLAs
are STARTING TARGETS; auditor confirms at engagement.
