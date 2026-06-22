> **DRAFT — FOUNDER-AUTHORED. NOT COUNSEL-REVIEWED. NOT A CERTIFICATION.**
> **HIPAA counsel review required before any external use, BAA execution, or PHI flow.**
> **Counsel sign-off deferred to Phase 42.6 (42.6E / LOCK-42.6.3).**
> **This document does not constitute legal advice and may not be relied upon by any party as such.**

# HIPAA Security Rule — Risk Management Plan

Per 45 CFR 164.308(a)(1)(ii)(B). Documents how identified risks (from [`RISK_ANALYSIS.md`](RISK_ANALYSIS.md)) are tracked, mitigated, accepted, or transferred.

## 1. Risk register

| Risk ID | Source | Status | Owner | Next review |
|---|---|---|---|---|
| RA-PLACEHOLDER | RISK_ANALYSIS.md (42.5K-pending) | Open — classification deferred | Founder | Upon 42.5K closure |

Additional risks will be registered when 42.5K field classification closes and per-field likelihood/impact ratings are assigned.

## 2. Risk treatment workflow

1. **Identify** — risk analysis ([`RISK_ANALYSIS.md`](RISK_ANALYSIS.md)); re-analysis triggers documented there
2. **Assess** — likelihood × impact (deferred until 42.5K)
3. **Treat** — mitigate (spine/overlay), transfer (BAA), or accept (documented rationale)
4. **Monitor** — quarterly risk register review (see compensating control below)
5. **Retain evidence** — per **42.5T** retention baseline (HIPAA 6-year floor = 2191 days for documentation category)

## 3. Evidence retention

Risk-treatment evidence (risk assessments, acceptance memos, mitigation verification) retained per [`docs/trust/retention/LOG_RETENTION_BASELINE.md`](../retention/LOG_RETENTION_BASELINE.md) — HIPAA documentation floor **2191 days** (45 CFR 164.316(b)(2)(i)).

## 4. Compensating control (two-owner shop)

**Gap:** No dedicated compliance team or GRC platform staffing.

**Compensating control:** Founder (Matthew Wiseman) + designated alternate (Janice) review the risk register **quarterly**. Cadence is a **STARTING TARGET**; auditor or HIPAA counsel may adjust at Phase 42.6 engagement.

Review checklist:

- Any new risks since last review?
- Any 42.5U subprocessor registry changes affecting PHI path?
- Any 42.5Q boundary changes?
- Any open items blocking 42.5K closure?

## 5. Integration with other programs

| Program | Linkage |
|---|---|
| SOC 2 CC7 (incident) | **42.5S** operational programs |
| HIPAA incident overlay | [`INCIDENT_RESPONSE_RUNBOOK.md`](INCIDENT_RESPONSE_RUNBOOK.md) |
| BAA / vendor risk | **42.5U** subprocessor inventory |
| Policy updates | [`POLICY_SET.md`](POLICY_SET.md) annual review |

---
> **END DRAFT.** Counsel review and HIPAA legal sign-off required before this document may be presented to a regulator, an auditor, a customer, a Business Associate, or any external party.
> **Phase 42.5V (Wave 5 opener).** Founder: Matthew Wiseman, Wiseman Financial Technologies LLC.
