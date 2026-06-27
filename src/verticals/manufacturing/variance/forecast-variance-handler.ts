export interface ForecastVariance {
  metricId: string;
  forecast: number;
  actual: number;
  variance: number;
  variancePct: number;
}

export function computeForecastVariance(
  metricId: string,
  forecast: number,
  actual: number,
): ForecastVariance {
  const variance = actual - forecast;
  const variancePct = forecast === 0 ? 0 : (variance / forecast) * 100;
  return { metricId, forecast, actual, variance, variancePct };
}

export function computeForecastBatch(
  rows: Array<{ metricId: string; forecast: number; actual: number }>,
): ForecastVariance[] {
  return rows.map((r) => computeForecastVariance(r.metricId, r.forecast, r.actual));
}
