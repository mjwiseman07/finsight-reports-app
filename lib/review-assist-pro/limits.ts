/**
 * Review Assist Pro — canonical product limits (decisions 1A + 2A + 3A).
 *
 * Keep these distinct:
 * - INCLUDED_CLIENT_COMPANIES: client entities under the linked firm
 * - FIRM_SEATS: authorized firm users (memberships)
 * - PILOT_COHORT_CAP: global paid pilot subscriptions (slots 1..N)
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
