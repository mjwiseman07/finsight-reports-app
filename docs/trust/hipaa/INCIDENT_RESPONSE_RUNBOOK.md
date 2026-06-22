> **DRAFT — FOUNDER-AUTHORED. NOT COUNSEL-REVIEWED. NOT A CERTIFICATION.**
> **HIPAA counsel review required before any external use, BAA execution, or PHI flow.**
> **Counsel sign-off deferred to Phase 42.6 (42.6E / LOCK-42.6.3).**
> **This document does not constitute legal advice and may not be relied upon by any party as such.**

# HIPAA Incident Response Runbook

**Layers on top of 42.5S** — does NOT reimplement the SOC 2 operational incident program. This runbook adds HIPAA-specific breach-notification overlay only.

## Baseline (do not reimplement)

| 42.5S / SOC 2 baseline | Reference |
|---|---|
| CC7.3 — Evaluate security events | **42.5S** operational programs + **42.5L** breach-detection routing |
| CC7.4 — Respond to security incidents | `docs/trust/operational/CHANGE_MANAGEMENT.md` (hotfix path), `docs/trust/soc2/CONTROL_MATRIX.md` |
| Compensating controls (two-owner on-call) | `docs/trust/operational/COMPENSATING_CONTROLS_TWO_OWNER_SHOP.md` |
| Vulnerability management | `docs/trust/operational/VULNERABILITY_MANAGEMENT_PROGRAM.md` |

Follow **42.5S** for detection, escalation, containment, eradication, recovery, and lessons-learned. This document adds HIPAA breach-notification steps only.

## HIPAA overlay — breach notification timing

| Audience | Timing (current rule) | Notes |
|---|---|---|
| Affected individuals | Without unreasonable delay, max **60 days** from discovery | 45 CFR 164.404 |
| HHS Secretary | Per HHS guidance (≤60 days; annual log if <500 individuals) | 45 CFR 164.408 |
| Media | If ≥500 individuals in a state/jurisdiction | 45 CFR 164.406 |

Founder position (draft): internal escalation to both founders within **24 hours** of discovery; counsel engaged before external notification.

## Breach risk assessment (164.402)

Four-factor analysis before notification:

1. Nature and extent of PHI involved
2. Unauthorized person who used or received PHI
3. Whether PHI was actually acquired or viewed
4. Extent to which risk has been mitigated

Document analysis outcome; retain per **42.5T** (2191-day floor).

## Documentation retention

Incident logs, breach risk assessments, and notification records retained per [`docs/trust/retention/LOG_RETENTION_BASELINE.md`](../retention/LOG_RETENTION_BASELINE.md) — security incident logs category (2191 days).

## Notification template structure (counsel-review-pending)

1. **Header** — entity name, date, contact for questions
2. **Description** — what happened, types of PHI involved, steps individuals should take
3. **Mitigation** — what we are doing to investigate and prevent recurrence
4. **Contact** — toll-free number / email / web page for more information

**Templates are NOT finalized.** Counsel review at Phase 42.6E required before use.

## Two-owner on-call compensating control

**Gap:** No third-shift on-call rotation.

**Compensating control:** Monitoring alerts page **both** founders simultaneously. RTO accounts for human-response latency per **42.5S** BCP/DR (RTO ≤ 72h STARTING TARGET). Customer SLA does not promise 24/7 hot response.

---
> **END DRAFT.** Counsel review and HIPAA legal sign-off required before this document may be presented to a regulator, an auditor, a customer, a Business Associate, or any external party.
> **Phase 42.5V (Wave 5 opener).** Founder: Matthew Wiseman, Wiseman Financial Technologies LLC.
