DRAFT — Founder-authored. NOT counsel-reviewed. NOT CPA-reviewed. BAA
templates and vendor-specific BAA execution deferred to Phase 42.6 (LOCK-42.6.4
counsel-reviewed BAA stack / LOCK-42.6.7 HIPAA counsel). Many entries below
will show baa-pending status; the registry DENIES PHI traffic for those
vendors until counsel-reviewed update flips status. This document is internal
preparation material only.

# Subprocessor / Vendor + BAA Stack (42.5U)

Phase 42.5U commits the subprocessor registry, BAA template scaffolding, and execution tracking infrastructure. **CLOSES PC-12.**

## Code

- `ops/compliance/vendors/subprocessorRegistry.ts` — `subprocessorRegistry`
- `ops/compliance/vendors/SUBPROCESSOR_INVENTORY.json` — inventory artifact

## Documentation

- `docs/trust/vendors/SUBPROCESSOR_INVENTORY_DOC.md`
- `docs/trust/vendors/BAA_TEMPLATE.md` (FOUNDER-DRAFTED, NOT counsel-reviewed)
- `docs/trust/vendors/BAA_EXECUTION_REGISTER.md`
- `docs/trust/vendors/LLM_ENDPOINT_BAA_RULE.md`

## Discipline

- LLM RULE: BAA required by default; spine-enforced non-PHI path is the only exception
- Counsel reviews all BAAs at Phase 42.6F / LOCK-42.6.4
- Registry DENIES PHI to baa-pending / baa-required-no-baa / expired BAA / unknown vendors

42.5U CLOSES PC-12. After 42.5U commits:

- Probe normal mode: 20 PASS + 0 SKIP
- Probe lock-mode: violations=0
- Verifier: 33 → 36 (CHK-34/35/36)
- `D0_SUBPROCESSOR_EVIDENCE:0`

---

DRAFT — Founder-authored. NOT counsel-reviewed. NOT CPA-reviewed. BAA
templates and vendor-specific BAA execution deferred to Phase 42.6 (LOCK-42.6.4
counsel-reviewed BAA stack / LOCK-42.6.7 HIPAA counsel). Many entries below
will show baa-pending status; the registry DENIES PHI traffic for those
vendors until counsel-reviewed update flips status. This document is internal
preparation material only.
