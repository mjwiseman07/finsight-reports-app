/**
 * Activation Connect button authority — who may invoke accounting connect.
 *
 * Auth users: dashboard access granted by Bearer check-trial (reason !== lead_free_review).
 * Lead users: server-validated lead_free_review session.
 * Auth always wins over a stale local lead hint when both appear present.
 *
 * Do not key off access.user_id — /api/check-trial does not return that field.
 */

export type ActivationAccessLike = {
  allowed?: boolean | null;
  reason?: string | null;
} | null;

export type ActivationConnectAuthority = {
  isAuthenticated: boolean;
  isLeadSession: boolean;
  canConnect: boolean;
};

export function resolveActivationConnectAuthority(args: {
  access: ActivationAccessLike;
  /** Bearer / session token present in the dashboard client. */
  hasAuthToken: boolean;
  /** Server-validated lead (reason lead_free_review or rememberValidatedLeadSession). */
  hasValidatedLeadSession: boolean;
}): ActivationConnectAuthority {
  const reason = String(args.access?.reason || "");
  const allowed = args.access?.allowed === true;

  // Auth takes precedence over a stale local lead hint once a real token is present
  // and check-trial granted non-lead access.
  const isAuthenticated =
    args.hasAuthToken && allowed && reason !== "lead_free_review";

  const isLeadSession =
    !isAuthenticated &&
    (reason === "lead_free_review" || args.hasValidatedLeadSession);

  return {
    isAuthenticated,
    isLeadSession,
    canConnect: isAuthenticated || isLeadSession,
  };
}
