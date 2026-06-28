# G7-C7a-1b — CON Over-Time + PWR Cluster (dispatch slot)

**Status:** Planned — batch-execute after C7a-8, **before C7a-9**  
**Predecessor:** C7a-8 (first slot in dispatch batch)  
**Successor:** C7a-2b (FA remainder)  
**Does not expand C7a-1** — CON remainder mopped in dedicated dispatch sub-commit

## Dispatch batch sequence (C7a-8 → C7a-9)

```
C7a-8 → C7a-1b (CON) → C7a-2b (FA) → C7a-9 → … → C7a-15
```

See `C7a-2b.md` for the `-b` remainder slot convention (document each `C7a-Nb` as primary sub-commits surface vertical remainders; batch all `-b` slots here).

## Scope

- `asc606-over-time` cluster (GAP-0011, GAP-0017, GAP-0023, GAP-0029, …)
- PWR / filing triples (GAP-0024, GAP-0025, GAP-0026, GAP-0029)
- MTZ contract-balances remainder (GAP-0020)
- Any other `con` + `triage=fix-now` still open after C7a-1

## Enumeration at execution

```bash
node scripts/gap-register-export.js --filter triage=fix-now --vertical con --output reports/c7a-1b-queue.json
```

## Rationale

C7a-1 closed 11 gaps (PoC + contract balances + cost-to-cost). CON remainder exceeds that cluster boundary; routing to C7a-1b keeps FA (C7a-2), SaaS, HC, etc. scopes clean.

## Current CON fix-now remainder (post C7a-1, as of `3e959d0`)

| Gap ID | Filing | Assertion |
| --- | --- | --- |
| GAP-0011 | FLR-10k | asc606-over-time |
| GAP-0017 | GVA-10k | asc606-over-time |
| GAP-0020 | MTZ-10k | contract-balances-rollforward |
| GAP-0023 | MTZ-10k | asc606-over-time |
| GAP-0024 | PWR-10k | poc-method-declared |
| GAP-0025 | PWR-10k | cost-to-cost-ratio |
| GAP-0026 | PWR-10k | contract-balances-rollforward |
| GAP-0029 | PWR-10k | asc606-over-time |
