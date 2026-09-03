# Option D dependency-order remediation (review)

**PR #313** — review-only; no DB replay re-run in this step.  
**Evidence HEAD (runtime failure):** `8ad27be6`  
**This remediation builds on evidence commit** `de12ef6a` (and subsequent ordering commits).

## Failure reproduced

Filename/lexicographic order placed:

1. `20260703_1200_d6_0_vertical_rule_foundation.sql` (ALTER / FK on `recurring_fires`)
2. …later…
3. `20260714_00_d5_recurring_templates.sql` (CREATE `recurring_fires`)

Runtime at order **10** failed: `relation "recurring_fires" does not exist`.  
Security / PR #312 RPC scopes remained **BLOCKED** (untested), not failed.

## Mechanism change

Replaced post-phase1 **filename-only `.sort()`** with an explicit deterministic dependency graph:

| Artifact | Role |
|----------|------|
| `docs/migration-remediation/option-d-dependency-overrides.json` | Reviewed explicit edges + platform optionals |
| `docs/migration-remediation/option-d-dependency-manifest.json` | Full candidate `sources[].dependsOn`, `dependencyOrder`, unresolved flags |
| `docs/migration-remediation/option-d-ordering-changelog.json` | Lex → dependency moves |
| `scripts/migration-remediation/option-d-dependency-order.js` | Infer CREATE→ALTER / consume→CREATE; stable lex tie-break; cycle/omit/dup checks |

**Fixed prefix (unchanged):** foundations baseline + phase1 recovered files.  
**Post-prefix additions:** recovered required originals (`20260704024059` rename, `20260804213003` / `20260804234230` CREATEs) plus local `supabase/migrations/` files.  
**Reordered:** post-prefix candidate set, then concatenated after the prefix.

### Ordering rules (not blind table-existence reshuffles)

1. ALTER depends on CREATE of the same table when the creator is in the candidate set.
2. Consumers (FK / policy / trigger / index / insert references) depend on CREATE — **not** on every later ALTER.
3. Explicit `explicitDependsOn` / `semanticConstraints` for reviewed edges.
4. Among unconstrained files: **stable lexicographic** Kahn tie-break.
5. Unresolved consumed tables with no CREATE/RENAME in-set (and not platform/prefix-provided) are **flagged and classified**, not silently dropped. `required_missing_create` fails the candidate gate; `safe_conditional` / prefix remain listed as justified exclusions. See `option-d-unresolved-classification.md`.

Also fixed `splitStatements` dollar-quote closing so `DO $$ … $$` no longer swallows trailing `CREATE TABLE` (required to see `recurring_fires` creation).

## recurring_fires edge

- Inferred: `alter_requires_create:recurring_fires` + `consume_table:recurring_fires`
- Explicit override retained for review clarity in `option-d-dependency-overrides.json`

## Unchanged

- `supabase/migrations/` (active) contents
- Production history
- PR #312
- No paid resources / merge / deploy / capability changes
- Guards not weakened

## Next (not done here)

Fresh local Option D runtime replay against the corrected order — only after this manifest is reviewed.
