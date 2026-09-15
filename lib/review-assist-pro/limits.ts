/**
 * Review Assist Pro — canonical product limits (decisions 1A + 2A + 3A).
 *
 * Keep these distinct:
 * - INCLUDED_CLIENT_COMPANIES: client entities under the linked firm
 * - FIRM_SEATS: authorized firm users (memberships)
 * - PILOT_COHORT_CAP: global paid pilot subscriptions (slots 1..N)
 *
 * Pilot cohort occupancy (checkout + activation must agree):
 * - A row occupies capacity iff pilot_slot_number is an integer in 1..CAP.
 * - pilot_status is ignored (cancelled / complimentary / etc. still occupy).
 * - NULL, 0, negative, and out-of-range numbers do not occupy.
 * - Numbered slots are not recycled until a separately reviewed reclamation policy.
 */
export const RA_PRO_TIER_KEY = "review_assist_pro" as const;

/** Included client-company entities on one RA Pro subscription. */
export const RA_PRO_INCLUDED_CLIENT_COMPANIES = 2 as const;

/** Authorized firm-user seats on the linked firm workspace. */
export const RA_PRO_FIRM_SEATS = 5 as const;

/** Global paid pilot cohort size (pilot_slot_number 1..N). Slot N+1 fails closed. */
export const RA_PRO_PILOT_COHORT_CAP = 10 as const;

/** Pilot statuses that authorize /reviewer for a company-owned RA Pro slot. */
export const RA_PRO_AUTHORIZING_PILOT_STATUSES = Object.freeze([
  "active",
  "complimentary",
] as const);

export type RaProAuthorizingPilotStatus =
  (typeof RA_PRO_AUTHORIZING_PILOT_STATUSES)[number];

export function isRaProAuthorizingPilotStatus(
  status: string | null | undefined,
): status is RaProAuthorizingPilotStatus {
  return (
    !!status &&
    (RA_PRO_AUTHORIZING_PILOT_STATUSES as readonly string[]).includes(status)
  );
}

/**
 * True when `n` is a valid occupying pilot cohort number (1..CAP inclusive).
 * Status is not considered here — callers pass numbers only.
 */
export function isRaProPilotCohortOccupyingNumber(
  n: unknown,
): n is number {
  return (
    typeof n === "number" &&
    Number.isInteger(n) &&
    n >= 1 &&
    n <= RA_PRO_PILOT_COHORT_CAP
  );
}

/** Distinct occupying numbers from pilot_slots-shaped rows (status ignored). */
export function collectRaProPilotCohortOccupiedNumbers(
  rows: ReadonlyArray<{ pilot_slot_number?: number | null } | null | undefined>,
): Set<number> {
  const occupied = new Set<number>();
  for (const row of rows) {
    const n = row?.pilot_slot_number;
    if (isRaProPilotCohortOccupyingNumber(n)) occupied.add(n);
  }
  return occupied;
}

/** Next free number in 1..CAP, or null when the cohort is full. */
export function allocateNextRaProPilotSlotNumber(
  occupied: Iterable<number>,
): number | null {
  const taken = new Set<number>();
  for (const n of occupied) {
    if (isRaProPilotCohortOccupyingNumber(n)) taken.add(n);
  }
  for (let n = 1; n <= RA_PRO_PILOT_COHORT_CAP; n++) {
    if (!taken.has(n)) return n;
  }
  return null;
}

/** True when at least one number in 1..CAP is free. */
export function raProPilotCohortHasCapacity(
  occupied: Iterable<number>,
): boolean {
  return allocateNextRaProPilotSlotNumber(occupied) !== null;
}
