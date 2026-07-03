/**
 * D3 confidence + online-statistics helpers. Pure functions, no imports.
 */

export function wilsonScoreLower(matching: number, total: number, z = 1.96): number {
  if (total === 0) return 0;
  const p = matching / total;
  const denom = 1 + (z * z) / total;
  const center = p + (z * z) / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
  return Math.max(0, Math.min(1, (center - margin) / denom));
}

export type WelfordState = { n: number; mean: number; m2: number };

export function welfordInit(): WelfordState {
  return { n: 0, mean: 0, m2: 0 };
}

export function welfordUpdate(s: WelfordState, x: number): WelfordState {
  const n = s.n + 1;
  const delta = x - s.mean;
  const mean = s.mean + delta / n;
  const delta2 = x - mean;
  const m2 = s.m2 + delta * delta2;
  return { n, mean, m2 };
}

export function welfordStddev(s: WelfordState): number {
  return s.n < 2 ? 0 : Math.sqrt(s.m2 / (s.n - 1));
}
