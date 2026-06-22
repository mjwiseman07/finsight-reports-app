> **DRAFT — NOT PUBLISHED. PUBLISH PROHIBITED UNTIL PHASE 42.6J (GL-5).**
> **No SOC / HIPAA / certification claim is current. Reports not yet issued.**
> **This document lives at docs/trust/public-drafts/ intentionally — public/ is reserved for post-issuance publishing.**
> **Benchmark-not-target framing per LOCK-42.5.9 binds every comparative statement here.**
> **This document does not constitute legal advice or a representation of compliance status.**

# Trust Page — Draft

## About the program

Wiseman Financial Technologies, LLC operates Advisacor with a universal control spine (`ops/control-spine/`) and a healthcare HIPAA overlay (`ops/compliance/overlays/hipaa/`) for regulated tenants. This page describes **posture and discipline** documented in internal drafts — not an attestation of certification status.

## Reports and attestations

| Report | Status (draft placeholder) |
|---|---|
| SOC 1 Type II report | `[REPORT_ISSUANCE_DATE — FILL AT 42.6J]` — observation window: `[OBSERVATION_WINDOW_START_DATE — FILL AT 42.6J]` to `[OBSERVATION_WINDOW_END_DATE — FILL AT 42.6J]` |
| SOC 2 Type II report (Security, Availability, Confidentiality TSC per 42.5R) | `[REPORT_ISSUANCE_DATE — FILL AT 42.6J]` — observation window: `[OBSERVATION_WINDOW_START_DATE — FILL AT 42.6J]` to `[OBSERVATION_WINDOW_END_DATE — FILL AT 42.6J]` |

**HIPAA (healthcare overlay):** Our healthcare overlay (45 CFR Part 164 Subparts A/C scope per 42.5V `SCOPE_STATEMENT.md`) is implemented with BAAs available for healthcare customers. Counsel-reviewed attestation: `[ATTESTATION_LETTER_DATE — FILL AT 42.6E]`.

D0 evidence: SOC 1 `ops/compliance/soc/soc1/D0_EVIDENCE.json`; SOC 2 TSC `ops/compliance/soc/soc2/D0_EVIDENCE.json`; HIPAA pack `ops/compliance/overlays/hipaa/pack/D0_HIPAA_PACK_EVIDENCE.json`.

## Subprocessor list

Subprocessors are documented internally per **42.5U** (`docs/trust/vendors/SUBPROCESSOR_INVENTORY_DOC.md`). Public list categories (cloud hosting, database, authentication, email, monitoring, backup, LLM endpoints) will be published at **42.6J** — not individual vendor names in this draft.

D0 evidence: `ops/compliance/vendors/D0_EVIDENCE.json`.

## Data residency

See [`DATA_RESIDENCY_STATEMENT_DRAFT.md`](DATA_RESIDENCY_STATEMENT_DRAFT.md). Launch posture: US-only residency for PHI and non-PHI customer data.

## Reach the security team

`[SECURITY_CONTACT — FILL AT 42.6J]`

---
> **END DRAFT.** Trust package publication occurs ONLY at Phase 42.6J after (a) SOC reports issued at 42.6C, (b) HIPAA counsel sign-off at 42.6E, and (c) GL-5 full-launch gate satisfied. Until then, no public-facing surface may claim attestation, certification, "audit underway," "SOC in progress," "HIPAA ready," or equivalent.
> **Phase 42.5X (Wave 5 module 3 of 4).** Founder: Matthew Wiseman, Wiseman Financial Technologies LLC.
