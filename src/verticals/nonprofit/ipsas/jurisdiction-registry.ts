import type { IpsasJurisdictionEntry } from "../types";

export const IPSAS_JURISDICTION_REGISTRY: IpsasJurisdictionEntry[] = [
  {
    jurisdictionCode: "NZ",
    adoptionMode: "FULL",
    ipsas47AdoptionDate: "2029-01-01",
    earlyAdoptionPermitted: false,
  },
  {
    jurisdictionCode: "DE",
    adoptionMode: "PARTIAL",
    earlyAdoptionPermitted: false,
  },
  {
    jurisdictionCode: "FR",
    adoptionMode: "PENDING",
    earlyAdoptionPermitted: false,
  },
];

export function lookupIpsasJurisdiction(
  jurisdictionCode: string,
  entityEarlyAdoption?: boolean,
): IpsasJurisdictionEntry {
  const entry = IPSAS_JURISDICTION_REGISTRY.find((j) => j.jurisdictionCode === jurisdictionCode);
  if (!entry) {
    throw new Error(`IPSAS jurisdiction not registered: ${jurisdictionCode}`);
  }
  return {
    ...entry,
    earlyAdoptionPermitted: entityEarlyAdoption ?? entry.earlyAdoptionPermitted,
  };
}

export function routeEuMemberState(entry: IpsasJurisdictionEntry): IpsasJurisdictionEntry {
  return entry;
}
