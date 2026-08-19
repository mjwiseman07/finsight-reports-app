/**
 * Trusted execution identity vs engagement authorization.
 *
 * requireVerifiedUserPrincipal establishes WHO the caller is.
 * requireEngagementWriteActor establishes that this verified user may WRITE
 * the requested engagement. A cached EngagementActor.canWrite is not enough.
 *
 * A raw user id in observation input is not authentication. v1 executes
 * verified user principals only.
 */

import type { EngagementActor } from "@/lib/audit-ready/server-auth";
import {
  AUTHORITATIVE_OBSERVATION_ERROR,
  AuthoritativeObservationError,
  type AuthoritativeObservationExecutionContext,
  type AuthoritativeObservationInput,
} from "./types";

export function requireVerifiedUserPrincipal(
  executionContext: AuthoritativeObservationExecutionContext | null | undefined,
): { userId: string } {
  if (!executionContext?.principal) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.AUTHENTICATED_ACTOR_REQUIRED,
      "A verified execution principal is required. Observation input cannot choose the authorized user.",
      "context",
    );
  }
  if (executionContext.principal.type !== "user") {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.UNSUPPORTED_PRINCIPAL,
      "v1 supports verified user principals only. Machine/system principals are not executable.",
      "context",
    );
  }
  const principal = executionContext.principal as {
    userId?: unknown;
    actor?: { userId?: unknown };
  };
  const userId = String(principal.userId || principal.actor?.userId || "").trim();
  if (!userId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.AUTHENTICATED_ACTOR_REQUIRED,
      "Verified principal.userId is required.",
      "context",
    );
  }
  return { userId };
}

export function requireEngagementWriteActor(args: {
  verifiedUserId: string;
  actor: EngagementActor | null | undefined;
}): EngagementActor {
  const actor = args.actor;
  const actorUserId = String(actor?.userId || "").trim();
  if (!actor || !actorUserId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.WRITE_FORBIDDEN,
      "Verified user is not authorized for this engagement.",
      "context",
    );
  }
  if (actorUserId !== args.verifiedUserId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.WRITE_FORBIDDEN,
      "Engagement actor does not match the verified principal.",
      "context",
    );
  }
  if (!actor.canWrite) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.WRITE_FORBIDDEN,
      "Verified user cannot write this engagement.",
      "context",
    );
  }
  return { ...actor, userId: args.verifiedUserId };
}

/**
 * If a leftover triggeredByUserId is present on untyped/legacy input, it must
 * equal the verified principal. Prefer omitting the field entirely.
 */
export function assertNoTriggeredByImpersonation(
  input: AuthoritativeObservationInput,
  actorUserId: string,
): void {
  const claimed = String(
    (input as { triggeredByUserId?: unknown }).triggeredByUserId || "",
  ).trim();
  if (claimed && claimed !== actorUserId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.TRIGGERED_BY_IMPERSONATION,
      "triggeredByUserId cannot select a different user than the verified actor.",
      "context",
    );
  }
}
