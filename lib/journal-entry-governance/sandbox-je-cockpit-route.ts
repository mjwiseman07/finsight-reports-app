/**
 * Shared super-admin + rate-limit guards for read-only sandbox JE cockpit routes.
 */

import { NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security";
import { rateLimit } from "@/lib/rate-limit";
import {
  Je3dActivationError,
  mapJe3dActivationErrorToHttpStatus,
  rejectSandboxCockpitRequestOverrides,
  SANDBOX_JE_COCKPIT_RATE_LIMIT_KEY,
  assertSandboxCockpitQbEnvironment,
  isSandboxJeCockpitRuntimeEnabled,
} from "./sandbox-je-cockpit-api";

export type SandboxCockpitRouteGuardResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

export function sandboxJeCockpitNotFoundResponse(): NextResponse {
  return new NextResponse(null, {
    status: 404,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

export async function guardSandboxJeCockpitRoute(
  request: Request,
): Promise<SandboxCockpitRouteGuardResult> {
  if (!isSandboxJeCockpitRuntimeEnabled()) {
    return { ok: false, response: sandboxJeCockpitNotFoundResponse() };
  }

  const rateLimitResponse = rateLimit(request, {
    key: SANDBOX_JE_COCKPIT_RATE_LIMIT_KEY,
    limit: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) {
    return { ok: false, response: rateLimitResponse };
  }

  const access = await resolveSuperAdminAccess(request);
  if (access.response) {
    return { ok: false, response: access.response };
  }

  try {
    rejectSandboxCockpitRequestOverrides(request);
    assertSandboxCockpitQbEnvironment();
  } catch (err) {
    return { ok: false, response: toSandboxCockpitErrorResponse(err) };
  }

  return { ok: true };
}

export function toSandboxCockpitErrorResponse(err: unknown): NextResponse {
  if (err instanceof Je3dActivationError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: mapJe3dActivationErrorToHttpStatus(err.code) },
    );
  }
  if (err instanceof Error) {
    if (err.message.includes("not found")) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  return NextResponse.json({ error: "Unexpected cockpit error." }, { status: 500 });
}
