DRAFT — Founder-authored. NOT CPA-reviewed. NOT counsel-reviewed.
External review deferred to Phase 42.6 (LOCK-42.6.7 HIPAA counsel /
LOCK-42.6.1 CPA engagement). This draft is internal preparation material
only. Baseline durations are STARTING FLOORS; counsel and auditor may
RAISE these values at engagement. The HIPAA 6-year floor at 45 CFR
164.316(b)(2)(i) is a HARD FLOOR — never reduced.

# Log-Retention Configuration Baseline (42.5T)

Phase 42.5T commits the baseline retention duration values consumed by the FM-1 resolver (implemented in 42.5D + 42.5H).

## Files

- `ops/compliance/retention/retentionBaseline.ts` — typed frozen configuration
- `docs/trust/retention/LOG_RETENTION_BASELINE.md` — compliance documentation
- `docs/trust/retention/COUNSEL_RAISE_REGISTER.md` — Phase 42.6 raise tracking
- `docs/trust/retention/H6_JURISDICTION_DEFERRAL.md` — deferral record

## Values

| Category | Days | Floor? |
|---|---|---|
| HIPAA documentation | 2191 (6y) | YES — HARD |
| SOC 2 evidence logs | 730 (24m) | No |
| Security incident logs | 2191 (6y) | YES |
| Application/system logs | 395 (13m) | No |

## Discipline

- HIPAA 6-year floor (45 CFR 164.316(b)(2)(i)) NEVER reduced
- Counsel + auditor may RAISE; never lowers
- Per-tenant config can raise; cannot lower below floor
- FM-1 resolver (42.5D + 42.5H) consumes these values; not reimplemented here

42.5T does NOT close any poison case. Verifier extends 30 → 33 with CHK-31/32/33. Probe state UNCHANGED (still 19 PASS + 1 SKIP for PC-12).

---

DRAFT — Founder-authored. NOT CPA-reviewed. NOT counsel-reviewed.
External review deferred to Phase 42.6 (LOCK-42.6.7 HIPAA counsel /
LOCK-42.6.1 CPA engagement). This draft is internal preparation material
only. Baseline durations are STARTING FLOORS; counsel and auditor may
RAISE these values at engagement. The HIPAA 6-year floor at 45 CFR
164.316(b)(2)(i) is a HARD FLOOR — never reduced.
