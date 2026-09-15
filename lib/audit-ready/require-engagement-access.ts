import { NextResponse } from "next/server";
import {
  requireAuditReadyUser,
  resolveEngagementActorForVerifiedUser,
  type EngagementActor,
} from "@/lib/audit-ready/server-auth";

/** Generic denial — same shape for missing engagement and unauthorized caller. */
export function engagementAccessDenied(): NextResponse {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

export function engagementNotWritable(): NextResponse {
  return NextResponse.json({ error: "engagement_not_writable" }, { status: 409 });
}

/**
 * Cookie-authenticated engagement actor with required capability.
 * Unauthenticated → 401. Missing/unauthorized engagement → generic 404.
 */
export async function requireEngagementAccess(args: {
  engagementId: string;
  capability: "read" | "write";
}): Promise<EngagementActor | NextResponse> {
  const auth = await requireAuditReadyUser();
  if ("error" in auth) return auth.error as NextResponse;

  const actor = await resolveEngagementActorForVerifiedUser({
    engagementId: args.engagementId,
    userId: auth.user.id,
    userEmail: auth.user.email ?? null,
  });
  if (!actor) return engagementAccessDenied();
  if (args.capability === "write" && !actor.canWrite) {
    return engagementAccessDenied();
  }
  if (args.capability === "read" && !actor.canRead) {
    return engagementAccessDenied();
  }
  return actor;
}

/**
 * Re-resolve membership for an already-authenticated user id (TOCTOU).
 * Use immediately before service-role storage/DB privileged work.
 */
export async function recheckEngagementAccess(args: {
  engagementId: string;
  userId: string;
  userEmail?: string | null;
  capability: "read" | "write";
}): Promise<EngagementActor | NextResponse> {
  const actor = await resolveEngagementActorForVerifiedUser({
    engagementId: args.engagementId,
    userId: args.userId,
    userEmail: args.userEmail,
  });
  if (!actor) return engagementAccessDenied();
  if (args.capability === "write" && !actor.canWrite) {
    return engagementAccessDenied();
  }
  if (args.capability === "read" && !actor.canRead) {
    return engagementAccessDenied();
  }
  return actor;
}

export function isEngagementAccessDenial(
  value: EngagementActor | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse || (typeof Response !== "undefined" && value instanceof Response);
}
