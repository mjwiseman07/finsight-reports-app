/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 *
 * Citation handle registry — URL handles only; no FAR rule text (anti-pattern guarded).
 */

import type { GovConCitationHandle, GovConCitationLibrary } from "./__init__/types";
import {
  GOVCON_CITATION_HANDLE_COUNT,
  GOVCON_CITATION_HANDLE_REGISTRY,
  GOVCON_CITATION_LIBRARIES,
} from "./handles-registry.generated";
import { GovConHandleNotResolvable, GovConIfrsHandleRejected } from "./errors";

export { GOVCON_CITATION_HANDLE_COUNT, GOVCON_CITATION_HANDLE_REGISTRY, GOVCON_CITATION_LIBRARIES };

const IFRS_HANDLE_PREFIX = /^IFRS_/;

export function createGovConCitationHandle(
  handleId: string,
  library: GovConCitationLibrary,
  url: string,
): GovConCitationHandle {
  if (IFRS_HANDLE_PREFIX.test(handleId)) {
    throw GovConIfrsHandleRejected(handleId);
  }
  if (!url.startsWith("https://")) {
    throw Object.assign(new Error(`GovCon handle ${handleId} must resolve to https URL only`), {
      name: "GovConHandleUrlViolation",
      code: "GOVCON_HANDLE_URL_INVALID",
      escalationAudits: [
        {
          channel: "escalation-audit" as const,
          code: "GOVCON_HANDLE_URL_INVALID",
          message: `Handle ${handleId} rejected — non-https URL`,
        },
      ],
    });
  }
  return { handleId, library, url };
}

export function resolveGovConCitationHandle(handleId: string): GovConCitationHandle {
  if (IFRS_HANDLE_PREFIX.test(handleId)) {
    throw GovConIfrsHandleRejected(handleId);
  }
  const entry = GOVCON_CITATION_HANDLE_REGISTRY[handleId];
  if (!entry) {
    throw GovConHandleNotResolvable(handleId);
  }
  return entry;
}

export function listGovConCitationHandlesByLibrary(
  library: GovConCitationLibrary,
): GovConCitationHandle[] {
  return Object.values(GOVCON_CITATION_HANDLE_REGISTRY).filter((h) => h.library === library);
}

export function assertGovConHandleCountFloor(floor: number): boolean {
  if (GOVCON_CITATION_HANDLE_COUNT < floor) {
    throw Object.assign(
      new Error(`GovCon handle count ${GOVCON_CITATION_HANDLE_COUNT} below floor ${floor}`),
      {
        name: "GovConHandleCountViolation",
        code: "GOVCON_HANDLE_COUNT_FLOOR",
        escalationAudits: [
          {
            channel: "escalation-audit" as const,
            code: "GOVCON_HANDLE_COUNT_FLOOR",
            message: `Registered handle count ${GOVCON_CITATION_HANDLE_COUNT} < floor ${floor}`,
          },
        ],
      },
    );
  }
  return true;
}
