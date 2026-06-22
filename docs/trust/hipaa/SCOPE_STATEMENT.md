> **DRAFT — FOUNDER-AUTHORED. NOT COUNSEL-REVIEWED. NOT A CERTIFICATION.**
> **HIPAA counsel review required before any external use, BAA execution, or PHI flow.**
> **Counsel sign-off deferred to Phase 42.6 (42.6E / LOCK-42.6.3).**
> **This document does not constitute legal advice and may not be relied upon by any party as such.**

# HIPAA Security Rule — Scope Statement

## Regulatory scope (current rule only)

This HIPAA Compliance Pack addresses the **current** HIPAA Security Rule as in force: **45 CFR Part 164 Subparts A and C** (full). Subpart D breach-notification obligations are addressed **only** as an operational incident-response program layered on the **42.5S** SOC 2 CC7.3/CC7.4 baseline — not as a standalone notification program.

## Subparts explicitly out of scope

- **Subpart B** — Transactions and Code Sets: **OUT OF SCOPE**
- **Subpart E** — Privacy Rule: **OUT OF SCOPE** (this pack is Security Rule only)
- **Subpart D (full breach-notification program)** — **OUT OF SCOPE** except incident-response layering described above

## Proposed-rule / gap-register boundary

Anticipated 2025 proposed-rule compliance claims are **OUT OF SCOPE** for this pack. The gap register for proposed-rule items is owned by **42.5W** (next Wave 5 module). This pack documents the **current** Security Rule only.

## SOC 1 boundary alignment

HIPAA Pack scope is bounded by the **42.5Q** SOC 1 declared boundary:

- Spine: `ops/control-spine/`
- Overlay: `ops/compliance/overlays/hipaa/` (including `pack/`)
- Out of scope: `lib/intelligence/synthetic/industry/` (knowledge stack)

Any expansion of HIPAA Pack namespaces beyond the SOC 1 boundary requires updating **42.5Q** first, then re-running `hipaaPackScopeBoundary.assertPackScopeAligned()` (CHK-39).

## Safeguard categories in scope

All five current-rule safeguard categories per 164.308–164.316:

1. Administrative (164.308)
2. Physical (164.310)
3. Technical (164.312)
4. Organizational (164.314)
5. Documentation (164.316)

## Counsel sign-off

HIPAA counsel review and legal sign-off are **pending Phase 42.6E / LOCK-42.6.3**. `counselReviewStatus` on the declared pack scope is frozen at `pending-42.6E`.

## Machine-readable counterpart

`hipaaPackScopeBoundary.getDeclaredPackScope()` in `ops/compliance/overlays/hipaa/pack/` mirrors this statement.

---
> **END DRAFT.** Counsel review and HIPAA legal sign-off required before this document may be presented to a regulator, an auditor, a customer, a Business Associate, or any external party.
> **Phase 42.5V (Wave 5 opener).** Founder: Matthew Wiseman, Wiseman Financial Technologies LLC.
