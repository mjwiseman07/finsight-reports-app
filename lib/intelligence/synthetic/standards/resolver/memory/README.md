# Resolver Memo Cache (Phase 42.7E)

Memoization layer for the TreatmentResolver outer wrapper. Cache key includes framework and attested-election fingerprint so cached answers are reproducible to a specific authorized policy version. SOC 1 / SOC 2 Type 2 / HIPAA controls baked in.

## Doctrine
- **Defense in depth:** LRU + TTL + active invalidation + fingerprint key. No single mechanism is the only line of defense.
- **Pure inner core untouched.** Cache lives in the outer wrapper only.
- **Fail-closed on audit failure.** If the audit log cannot persist, the resolver call fails — no silent success.
- **PHI segregation.** Healthcare-vertical and explicitly-flagged tenants use a separate map with shorter TTL.
- **Authorization at the surface.** Direct cache get/set requires the resolver-internal symbol.

## Entry points
- `new DefaultResolverMemoCache({ config, clock, auditLog, tenantClassifier })`
- `cache.invalidateOrg(orgId, reason, actor)` — call after attested-election change
- `cache.purgePHIForTenant(tenantId, reason, actor)` — HIPAA purge
- `cache.getCacheMetrics()` — operator surface
