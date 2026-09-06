# Option D assertion / procedural-dependency remediation (review-only)

**Evidence HEAD (preserved):** `38c32006aa2636b300fef15da804868f2de389c2`  
**Tested runtime FAIL commit:** `3e3a7bea30257315eaec80730f19679b7ea9a2f9`  
**PR #312 pin (unchanged):** `f65730b3d38e9cb3b192e54f62c798c74a07a1c2`  
**Mode:** Static remediation only — no Docker / no replay

## Proven dependency (runtime P0001)

Part 3 DO block:

```sql
IF NOT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema='public' AND table_name='close_assertion_coverage'
) THEN
  RAISE EXCEPTION '… Part 3 requires Part 2 applied first';
END IF;
```

| Object | Creator migration |
|--------|-------------------|
| `close_assertion_coverage` | `20260707130000_d_assertions_part_2_coverage_projection.sql` |
| `assertion_gap_root_causes` | same Part 2 |
| `assertions_catalog` | `20260707120000_d_assertions_part_1_schema_and_backfill.sql` |

## Order change

| File | Old order (FAIL run) | New order |
|------|---------------------:|----------:|
| Part 1 | 37 | **36** |
| Part 2 | **38** | **37** |
| Part 3 | **13** | **38** |
| Part 4 | 49 | **47** |
| Part 5 | 39 | **48** |
| Part 6 | 40 | **49** |

## Analyzer

`option-d-procedural-prerequisites.js` classifies apply-time checks:

| Class | Count (full set) | Graph effect |
|-------|-----------------:|--------------|
| required_prerequisite | 5 | `procedural_requires_table/constraint` edges; unresolved if missing |
| safe_conditional | 12 | no required edge |
| intentionally_verifies_absence | 0 | no create-before edge |
| postcondition_assertion | 67 | RAISE in CREATE FUNCTION/TRIGGER — not apply-order |

Comments/filenames are never used as proof.

## Explicit + semantic assertion chain

Part 1 → 2 → 3 → 4 → 5 → 6 via `explicitDependsOn` and `semanticConstraints` in `option-d-dependency-overrides.json`, plus inferred procedural edges (e.g. Part 3 → Part 2 for `close_assertion_coverage`).

No Part 3 assertion removed or weakened. No Docker replay in this step.
