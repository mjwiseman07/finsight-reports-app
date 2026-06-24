import type { RetailSpineSession } from "./types";

/**
 * Forecast feed selection is tenant-config driven.
 * Returns null when no configured forecast source exists.
 */
export function resolveForecastInputSource(
  session: RetailSpineSession,
  tenantForecastConfig?: string | null,
): string | null {
  if (tenantForecastConfig) return tenantForecastConfig;
  if (session.forecastInputSource) return session.forecastInputSource;
  return null;
}
