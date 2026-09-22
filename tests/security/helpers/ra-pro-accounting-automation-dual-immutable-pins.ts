/**
 * Immutable pins for the dual-migration (weekly completeness + month-end package)
 * apply authorization.
 *
 * The dual authorization delta is history, not HEAD. HEAD carries the later
 * corrective tree (service_role least-privilege migration, corrective applicator,
 * corrective gates), so HEAD is never a valid dual publication commit: the
 * allowlist in scripts/security/ra-pro-accounting-automation-apply-authorization.js
 * requires the executable -> publication diff to be exactly TOOLING_AUTHORIZATION.json.
 * Tests must therefore pin these SHAs instead of resolving HEAD.
 */

/** Reviewed executable tip. Its authorization record is UNPUBLISHED. */
export const DUAL_EXECUTABLE = "b9926961e32c1e55ba90016545f753b58ad6892a";

/**
 * The one AUTHORIZED publication commit for DUAL_EXECUTABLE. Its only delta
 * against DUAL_EXECUTABLE is TOOLING_AUTHORIZATION.json.
 */
export const DUAL_PUBLICATION = "31e06a59242e077f95ff512ed9c04e9ac57407b3";

/**
 * Attempt id sealed into DUAL_PUBLICATION. It was consumed, so it must stay
 * unusable for new disposable publications.
 */
export const CONSUMED_DUAL_ATTEMPT_ID = "apply-b9926961e32c-8aecb1bd2f5f17dec0483dd550bb395f";

/**
 * Instant after the pre-apply live evidence sealed at DUAL_PUBLICATION stops
 * being fresh (valid_until_utc 2026-09-22T04:55:07Z). Apply must fail closed on
 * freshness rather than on wall-clock drift.
 */
export const AFTER_DUAL_PRE_APPLY_WINDOW = "2026-09-23T00:00:00Z";
