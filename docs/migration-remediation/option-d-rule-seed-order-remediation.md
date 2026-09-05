# Option D rule-seed ordering remediation (order-36)

**Tested failure HEAD:** `de535f63335e4e73066903bb5d77489c9f8aad99`  
**Evidence:** `option-d-runtime-evidence-2026-09-03f.md` (SQLSTATE 23503 at order 36)

## Authoritative provenance

| Field | Value |
|-------|--------|
| Missing key | `gen.accrual_reversal_check` |
| Authoritative creator | `20260703_1200_d6_0_vertical_rule_foundation.sql` (git) |
| Table + base seeds | `20260708_00_d0_identity_and_memory_activation.sql` (8 `gen.*` rows) |
| Consumer | `20260707120000_d_assertions_part_1_schema_and_backfill.sql` |
| Classification | **later_creator_currently_misordered** (immutable/reference seed required for clean replay) |
| Production recovery | **Not required** — original INSERT exists in git |

Option D exclusion of operational activations (`d6_2a`–`d6_2d`) did **not** remove this seed; the foundation migration was already in the candidate set but ordered **after** Part 1.

## Remediation

- Explicit `dependsOn` + semantic constraints: D0 → d6_0 → Part 1
- Inferred rule-seed FK edges for all Part 1–6 coverage `rule_id`s (32 required)
- Completeness gate in assemble + replay gate (no placeholder / FK disable / skip)
- Inventory: `option-d-rule-seed-dependency-inventory.json`

**Forbidden:** inventing placeholder rules, disabling FK, `session_replication_role`, admitting operational activations as reference seed.
