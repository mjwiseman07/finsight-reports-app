/**
 * MAJOR #2.3 Block B.2 — feature flag for Platform Integrity surface.
 *
 * Read on client and server. Defaults to false in all environments until
 * B.5 smoke passes.
 */
export function isPlatformIntegrityEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_PLATFORM_INTEGRITY === "true";
}
