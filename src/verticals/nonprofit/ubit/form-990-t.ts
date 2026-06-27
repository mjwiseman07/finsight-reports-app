import type { ActivityInput, UbitFiling, UbitSilo } from "../types";

export function siloActivity(
  activityDescriptor: ActivityInput,
  entityOverrides?: Map<string, string>,
): string {
  if (entityOverrides?.has(activityDescriptor.activityId)) {
    return entityOverrides.get(activityDescriptor.activityId)!;
  }
  return activityDescriptor.naics2Digit;
}

export function applyNols(silo: UbitSilo): number {
  let net = silo.netForSilo;
  if (silo.postTcjaNol) {
    net = Math.max(0, net - silo.postTcjaNol);
  }
  return net;
}

export function applyPreTcjaNol(filing: UbitFiling, totalPreTcjaNol: number): UbitFiling {
  const aggregate = filing.silos.reduce((sum, s) => sum + applyNols(s), 0);
  const afterPreTcja = Math.max(0, aggregate - totalPreTcjaNol);
  const status = computeFilingStatus(afterPreTcja);
  return {
    ...filing,
    grossUbtiAcrossAllSilos: afterPreTcja,
    filingTriggered: status.filingTriggered,
    warnZone: status.warnZone,
  };
}

export function computeFilingStatus(grossUbi: number): {
  filingTriggered: boolean;
  warnZone: boolean;
} {
  return {
    filingTriggered: grossUbi >= 1000,
    warnZone: grossUbi >= 500 && grossUbi < 1000,
  };
}

export function buildUbitFiling(silos: UbitSilo[]): UbitFiling {
  const gross = silos.reduce((sum, s) => sum + applyNols(s), 0);
  const status = computeFilingStatus(gross);
  return {
    silos,
    grossUbtiAcrossAllSilos: gross,
    filingTriggered: status.filingTriggered,
    warnZone: status.warnZone,
  };
}
