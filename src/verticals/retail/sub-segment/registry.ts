import type { RetailSubSegment, SubSegmentDeclaration } from "../types";
import { RETAIL_DEFAULTS } from "../types";

export function createSubSegmentDeclaration(
  primary: RetailSubSegment,
  secondary?: RetailSubSegment,
): SubSegmentDeclaration {
  return {
    primary,
    secondary,
    lockedAtFirstClose: RETAIL_DEFAULTS.subSegmentLockAtFirstClose,
  };
}

export function isKpiApplicableToSubSegment(
  kpiAppliesTo: ReadonlyArray<RetailSubSegment>,
  declaration: SubSegmentDeclaration,
): boolean {
  if (kpiAppliesTo.includes(declaration.primary)) {
    return true;
  }
  if (declaration.secondary && kpiAppliesTo.includes(declaration.secondary)) {
    return true;
  }
  return false;
}

export class SubSegmentLockViolationError extends Error {
  constructor(entityId: string) {
    super(
      `Sub-segment locked at first close for entity ${entityId}; migration event required to change.`,
    );
    this.name = "SubSegmentLockViolationError";
  }
}

export function assertSubSegmentNotLocked(
  declaration: SubSegmentDeclaration,
  entityId: string,
  closed: boolean,
): void {
  if (declaration.lockedAtFirstClose && closed) {
    throw new SubSegmentLockViolationError(entityId);
  }
}
