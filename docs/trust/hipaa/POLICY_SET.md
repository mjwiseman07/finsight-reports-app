> **DRAFT — FOUNDER-AUTHORED. NOT COUNSEL-REVIEWED. NOT A CERTIFICATION.**
> **HIPAA counsel review required before any external use, BAA execution, or PHI flow.**
> **Counsel sign-off deferred to Phase 42.6 (42.6E / LOCK-42.6.3).**
> **This document does not constitute legal advice and may not be relied upon by any party as such.**

# HIPAA Security Rule — Policy Set

Documentation of policies across all five safeguard categories per 45 CFR 164.308–164.316. **Policies documented here — implementation in spine (42.5A–P) and overlay (42.5J/K/L).**

## Administrative Safeguards (164.308)

### Security management process (164.308(a)(1))

- Conduct accurate and thorough risk analysis ([`RISK_ANALYSIS.md`](RISK_ANALYSIS.md))
- Implement security measures per [`RISK_MANAGEMENT_PLAN.md`](RISK_MANAGEMENT_PLAN.md)
- Sanction policy for workforce members who violate policies (documented; enforcement via founder review)

### Assigned security responsibility (164.308(a)(2))

- Security responsibility assigned to founder; privacy/security officer dual role documented in compensating controls

### Workforce security (164.308(a)(3))

- Authorization and supervision procedures for workforce access to ePHI systems
- Termination procedures: revoke access within 24 hours of separation (STARTING TARGET)

### Information access management (164.308(a)(4))

- Access based on spine RBAC personas and tenant isolation (**42.5B**)
- Minimum necessary enforced via overlay contracts (**42.5J**)

### Security awareness and training (164.308(a)(5))

- Annual security awareness training (structure: [`TRAINING_ATTESTATION_LOG.md`](TRAINING_ATTESTATION_LOG.md))

### Security incident procedures (164.308(a)(6))

- Cross-reference [`INCIDENT_RESPONSE_RUNBOOK.md`](INCIDENT_RESPONSE_RUNBOOK.md) layered on **42.5S**

### Contingency plan (164.308(a)(7))

- Cross-reference **42.5S** BCP/DR (`docs/trust/operational/BCP_DR_PLAN.md`)

### Evaluation (164.308(a)(8))

- Annual evaluation of security policies; trigger re-analysis per RISK_ANALYSIS re-analysis triggers

**Compensating control note (two-owner shop):** No dedicated security committee. Founder + alternate quarterly review substitutes for committee cadence (STARTING TARGET).

---

## Physical Safeguards (164.310)

### Facility access controls (164.310(a))

- Cloud-hosted infrastructure; physical facility access delegated to subprocessor per **42.5U** BAA requirements

### Workstation use (164.310(b))

- Workstations used for ePHI access must use full-disk encryption and screen lock

### Workstation security (164.310(c))

- Restrict physical access to workstations processing ePHI

### Device and media controls (164.310(d))

- Disposal and re-use procedures for media containing ePHI (secure wipe / destruction)

**Compensating control note (two-owner shop):** Remote-first; no company-owned data center. Physical controls rely on subprocessor attestations + endpoint policies on founder devices.

---

## Technical Safeguards (164.312)

### Access control (164.312(a))

- Unique user identification, emergency access procedure, automatic logoff, encryption/decryption via spine auth + encryption modules

### Audit controls (164.312(b))

- Spine audit logging (**42.5D**); PHI-derived-learning bright line per **42.5N** referenced in audit routing

### Integrity (164.312(c))

- Mechanisms to authenticate ePHI not improperly altered or destroyed

### Person or entity authentication (164.312(d))

- Spine authentication module; MFA for production access (STARTING TARGET)

### Transmission security (164.312(e))

- TLS for data in transit; encryption at rest per **42.5E**

**Compensating control note (two-owner shop):** No 24/7 SOC monitoring staff. Monitoring alerts page both founders; compensating control documented in **42.5S** `COMPENSATING_CONTROLS_TWO_OWNER_SHOP.md`.

---

## Organizational Requirements (164.314)

### Business associate contracts (164.314(a))

- BAA requirements for subprocessors: [`BAA_TEMPLATE_REFERENCE.md`](BAA_TEMPLATE_REFERENCE.md) → **42.5U**
- Downstream subcontractor flow-down: [`SUBCONTRACTOR_BAA_DRAFT.md`](SUBCONTRACTOR_BAA_DRAFT.md) (NOT FOR EXECUTION)

### Other arrangements (164.314(b))

- Documented only if applicable; none asserted at draft time

**Compensating control note (two-owner shop):** No vendor risk team. Founder-level review of every new subprocessor before contracting; spine enforces PHI boundary per **42.5U**.

---

## Documentation Requirements (164.316)

### Policies and procedures (164.316(a))

- Written policies in this pack; maintained and updated on change

### Retention (164.316(b))

- Documentation retained per **42.5T** baseline — HIPAA floor **2191 days** (6 years)
- Cross-reference: [`docs/trust/retention/LOG_RETENTION_BASELINE.md`](../retention/LOG_RETENTION_BASELINE.md)

**Compensating control note (two-owner shop):** Calendar-driven annual policy review by founder + alternate; evidence retained per 42.5T.

---
> **END DRAFT.** Counsel review and HIPAA legal sign-off required before this document may be presented to a regulator, an auditor, a customer, a Business Associate, or any external party.
> **Phase 42.5V (Wave 5 opener).** Founder: Matthew Wiseman, Wiseman Financial Technologies LLC.
