/**
 * Trusted execution principal for the authoritative observation runner.
 *
 * A raw user id in observation input is not authentication. The calling
 * boundary must already have verified the actor (cookie session, etc.).
 * v1 executes verified user principals only.
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
): EngagementActor {
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
  const actor = executionContext.principal.actor;
  const userId = String(actor?.userId || "").trim();
  if (!userId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.AUTHENTICATED_ACTOR_REQUIRED,
      "Verified actor.userId is required.",
      "context",
    );
  }
  if (!actor.canWrite) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.WRITE_FORBIDDEN,
      "Verified actor cannot write to this engagement.",
      "context",
    );
  }
  return { ...actor, userId };
}

/**
 * If a leftover triggeredByUserId is present on untyped/legacy input, it must
 * equal the verified actor. Prefer omitting the field entirely.
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
