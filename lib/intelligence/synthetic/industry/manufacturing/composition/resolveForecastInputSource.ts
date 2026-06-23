import type { ManufacturingForecastInputSource } from "../../../../../dashboard/panels/manufacturing-variance/contract";
import type { ManufacturingSpineSession } from "./types";

/**
 * Forecast feed selection is tenant-config driven — not hard-coded preference order.
 * Returns null when tenant has no configured forecast source (forecast section omitted, not error).
 */
export function resolveForecastInputSource(
  session: ManufacturingSpineSession,
  tenantForecastConfig?: ManufacturingForecastInputSource | null,
): ManufacturingForecastInputSource | null {
  if (tenantForecastConfig) {
    return tenantForecastConfig;
  }
  if (session.forecastInputSource) {
    return session.forecastInputSource;
  }
  return null;
}
