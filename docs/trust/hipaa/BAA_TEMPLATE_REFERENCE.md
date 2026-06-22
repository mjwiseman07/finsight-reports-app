> **DRAFT — FOUNDER-AUTHORED. NOT COUNSEL-REVIEWED. NOT A CERTIFICATION.**
> **HIPAA counsel review required before any external use, BAA execution, or PHI flow.**
> **Counsel sign-off deferred to Phase 42.6 (42.6E / LOCK-42.6.3).**
> **This document does not constitute legal advice and may not be relied upon by any party as such.**

# BAA Template Reference

**NOT FOR EXECUTION.** This document references the **42.5U** BAA template — it does not introduce a new template.

## Primary template

| Artifact | Location |
|---|---|
| BAA draft template | [`docs/trust/vendors/BAA_TEMPLATE.md`](../vendors/BAA_TEMPLATE.md) |
| BAA execution register | [`docs/trust/vendors/BAA_EXECUTION_REGISTER.md`](../vendors/BAA_EXECUTION_REGISTER.md) |
| Subprocessor inventory | `ops/compliance/vendors/SUBPROCESSOR_INVENTORY.json` |

The **42.5U** template carries its own NOT FOR EXECUTION banner. That banner is **reinforced here**: no BAA should be signed without HIPAA counsel review at Phase 42.6F / LOCK-42.6.4.

## Subprocessors requiring BAA (PHI-authorized path)

Subprocessors with `phiAuthorized: true` in the inventory require an executed BAA before spine allows PHI traffic (`subprocessorRegistry.assertBaaOnFile()`). Refer to **42.5U** inventory and [`SUBPROCESSOR_INVENTORY_DOC.md`](../vendors/SUBPROCESSOR_INVENTORY_DOC.md) for the current list.

At 42.5U commit time, LLM/AI endpoints (e.g., `openai-api`) show `baa-pending` — PHI traffic DENIED until counsel-reviewed BAA execution updates the registry.

## Linkage to HIPAA pack

| HIPAA pack document | 42.5U linkage |
|---|---|
| POLICY_SET.md §164.314 | BAA template + execution register |
| SUBCONTRACTOR_BAA_DRAFT.md | Flow-down language for downstream subcontractors |
| INCIDENT_RESPONSE_RUNBOOK.md | Vendor notification obligations in BAAs |

---
> **END DRAFT.** Counsel review and HIPAA legal sign-off required before this document may be presented to a regulator, an auditor, a customer, a Business Associate, or any external party.
> **Phase 42.5V (Wave 5 opener).** Founder: Matthew Wiseman, Wiseman Financial Technologies LLC.
