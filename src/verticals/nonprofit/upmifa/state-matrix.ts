import type { UpmifaJurisdiction } from "../types";

const STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
  "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
  "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

function defaultStateRow(code: string): UpmifaJurisdiction {
  return {
    code,
    framework: "UPMIFA",
    sevenPercentSolution: code !== "PA",
  };
}

export const UPMIFA_STATE_MATRIX: UpmifaJurisdiction[] = [
  ...STATE_CODES.map((code) => defaultStateRow(code)),
  { code: "PR", framework: "NO_UPMIFA", sevenPercentSolution: false },
  { code: "USVI", framework: "UPMIFA", sevenPercentSolution: true },
];

export function lookupUpmifaJurisdiction(
  code: string,
  entitySevenPercentOverride?: boolean,
): UpmifaJurisdiction & { effectiveSevenPercent: boolean } {
  const row = UPMIFA_STATE_MATRIX.find((j) => j.code === code);
  if (!row) {
    throw new Error(`Unknown UPMIFA jurisdiction code: ${code}`);
  }
  if (row.framework === "NO_UPMIFA") {
    throw new Error(`UPMIFA not applicable in ${code} — fail-closed (Q-E2=C).`);
  }
  return {
    ...row,
    effectiveSevenPercent: entitySevenPercentOverride ?? row.sevenPercentSolution,
  };
}

export function resolvePennsylvaniaOverride(
  code: string,
  override?: "PA",
): string {
  return override === "PA" ? "PA" : code;
}
