/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsPHI: true
 *
 * K-G sub-segment router — H/P/A/S/M/B/D applicability matrix.
 */

import type {
  HealthcareSubSegment,
  HealthcareCapabilityKey,
} from "../../contracts/healthcare/HCBasisContracts";
import {
  SubSegmentApplicabilityViolation,
  SubSegmentIsolationViolation,
} from "./errors";

const APPLICABILITY: Record<
  HealthcareCapabilityKey,
  Partial<Record<HealthcareSubSegment, boolean>>
> = {
  "net-revenue-recognition": { H: true, P: true, A: true, S: true, M: true, B: true, D: true },
  "contractual-allowances": { H: true, P: true, A: true, S: true, M: true, B: true, D: true },
  "charity-care": { H: true, P: false, A: false, S: false, M: false, B: false, D: false },
  "bad-debt": { H: true, P: true, A: true, S: true, M: true, B: true, D: true },
  ppd: { H: true, S: true, B: true },
  alos: { H: true, S: true },
  cmi: { H: true, S: true },
  occupancy: { H: true, S: true },
  rvus: { P: true, A: true },
  "visits-per-day": { P: true, M: true, B: true, D: true },
  "asc-bundled-rate": { A: true },
  "per-episode-payment": { M: true },
  dnfb: { H: true, P: true, A: true, S: true, M: true, B: true, D: true },
  "ar-days": { H: true, P: true, A: true, S: true, M: true, B: true, D: true },
  "denial-rate": { H: true, P: true, A: true, S: true, M: true, B: true, D: true },
  "clean-claim-rate": { H: true, P: true, A: true, S: true, M: true, B: true, D: true },
  "disclosures-npsr": { H: true, P: true, A: true, S: true, M: true, B: true, D: true },
  "340b-pricing": { H: true, P: true, B: true },
  "501r-charity-care": { H: true },
  "part-2-confidentiality": { H: true, P: true, B: true },
};

export function isCapabilityApplicable(
  subSegment: HealthcareSubSegment,
  capabilityKey: HealthcareCapabilityKey,
): boolean {
  return APPLICABILITY[capabilityKey][subSegment] === true;
}

export function assertCapabilityApplicable(
  subSegment: HealthcareSubSegment,
  capabilityKey: HealthcareCapabilityKey,
): void {
  if (!isCapabilityApplicable(subSegment, capabilityKey)) {
    throw SubSegmentApplicabilityViolation(
      `Capability "${capabilityKey}" not applicable to sub-segment "${subSegment}"`,
      subSegment,
      capabilityKey,
    );
  }
}

export function assertSubSegmentIsolation(
  entitySubSegment: HealthcareSubSegment,
  requestedSubSegment: HealthcareSubSegment,
  capabilityKey: HealthcareCapabilityKey,
): void {
  if (entitySubSegment !== requestedSubSegment) {
    throw SubSegmentIsolationViolation(
      `Sub-segment "${entitySubSegment}" cannot access "${requestedSubSegment}" capability "${capabilityKey}"`,
      entitySubSegment,
      capabilityKey,
    );
  }
}

export function buildSubSegmentCacheKey(
  tenantId: string,
  entityId: string,
  subSegment: HealthcareSubSegment,
  capabilityKey: HealthcareCapabilityKey,
): string {
  return `hc:${tenantId}:${subSegment}:${entityId}:${capabilityKey}`;
}

export function getApplicableCapabilities(subSegment: HealthcareSubSegment): HealthcareCapabilityKey[] {
  return (Object.keys(APPLICABILITY) as HealthcareCapabilityKey[]).filter((k) =>
    isCapabilityApplicable(subSegment, k),
  );
}
