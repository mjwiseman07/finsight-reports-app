/**
 * Route guards for sandbox JE proposal/approval APIs.
 */

import { NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security";
import { rateLimit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase";
import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "@/lib/reviewer/constants";
import {
  isAllowedSuperAdminEmail,
  SUPER_ADMIN_ROLE,
} from "@/lib/super-admin";
import { isSandboxJeCockpitRuntimeEnabled } from "./sandbox-je-cockpit-api";
import { assertSandboxJeMutationOrigin } from "./sandbox-je-mutation-origin";
import {
  SANDBOX_JE_DESIGNATED_APPROVER_USER_ID,
  SANDBOX_JE_PROPOSAL_MUTATE_RATE_LIMIT_KEY,
  SANDBOX_JE_PROPOSAL_READ_RATE_LIMIT_KEY,
} from "./sandbox-je-proposal-shared";
import {
  assertSandboxJeProposalRuntimeEnabled,
  mapSandboxJeProposalError,
  SandboxJeProposalApiError,
} from "./sandbox-je-proposal-api";

export type SandboxJeAuthedUser = {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  isDesignatedApprover: boolean;
};

export function sandboxJeEmpty404(): NextResponse {
  return new NextResponse(null, {
    status: 404,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function parseAccessToken(request: Request): string {
  const authorization = request.headers.get("authorization") || "";
  let token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!token) {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(
      new RegExp(`(?:^|;\\s*)${ADVISACOR_ACCESS_TOKEN_COOKIE}=([^;]+)`),
    );
    if (match?.[1]) {
      try {
        token = decodeURIComponent(match[1]);
      } catch {
        token = match[1];
      }
    }
  }
  return token;
}

export async function resolveSandboxJeSessionUser(
  request: Request,
): Promise<SandboxJeAuthedUser | { response: NextResponse }> {
  if (!supabaseAdmin) {
    return {
      response: NextResponse.json(
        { error: "Supabase is not configured." },
        { status: 503 },
      ),
    };
  }
  const token = parseAccessToken(request);
  if (!token) {
    return {
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
    };
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  const user = data?.user;
  if (error || !user?.id || !user.email) {
    return {
      response: NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 },
      ),
    };
  }

  const appRole = (user.app_metadata as Record<string, unknown> | null)?.[
    "role"
  ];
  const userRole = (user.user_metadata as Record<string, unknown> | null)?.[
    "role"
  ];
  const isSuperAdmin =
    isAllowedSuperAdminEmail(user.email) &&
    (appRole === SUPER_ADMIN_ROLE || userRole === SUPER_ADMIN_ROLE);
  const isDesignatedApprover =
    user.id === SANDBOX_JE_DESIGNATED_APPROVER_USER_ID;

  if (!isSuperAdmin && !isDesignatedApprover) {
    return {
      response: NextResponse.json(
        { error: "Sandbox JE access is restricted." },
        { status: 403 },
      ),
    };
  }

  return {
    userId: user.id,
    email: user.email,
    isSuperAdmin,
    isDesignatedApprover,
  };
}

export async function guardSandboxJeProposalRuntime(
  request: Request,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!isSandboxJeCockpitRuntimeEnabled()) {
    return { ok: false, response: sandboxJeEmpty404() };
  }
  try {
    assertSandboxJeProposalRuntimeEnabled();
  } catch (err) {
    if (
      err instanceof SandboxJeProposalApiError &&
      err.code === "sandbox_je_not_found"
    ) {
      return { ok: false, response: sandboxJeEmpty404() };
    }
    const mapped = mapSandboxJeProposalError(err);
    return {
      ok: false,
      response: NextResponse.json(mapped.body, { status: mapped.status }),
    };
  }
  return { ok: true };
}

export async function guardSandboxJeProposalMutate(args: {
  request: Request;
  requireSuperAdmin?: boolean;
  requireDesignatedApprover?: boolean;
}): Promise<
  | { ok: true; user: SandboxJeAuthedUser }
  | { ok: false; response: NextResponse }
> {
  const runtime = await guardSandboxJeProposalRuntime(args.request);
  if (!runtime.ok) return runtime;

  const originDenied = assertSandboxJeMutationOrigin(args.request);
  if (originDenied) return { ok: false, response: originDenied };

  const rateLimited = rateLimit(args.request, {
    key: SANDBOX_JE_PROPOSAL_MUTATE_RATE_LIMIT_KEY,
    limit: 20,
    windowMs: 60_000,
  });
  if (rateLimited) return { ok: false, response: rateLimited };

  if (args.requireSuperAdmin) {
    const access = await resolveSuperAdminAccess(args.request);
    if (access.response) return { ok: false, response: access.response };
    return {
      ok: true,
      user: {
        userId: String(access.userId),
        email: String(access.email),
        isSuperAdmin: true,
        isDesignatedApprover:
          String(access.userId) === SANDBOX_JE_DESIGNATED_APPROVER_USER_ID,
      },
    };
  }

  const session = await resolveSandboxJeSessionUser(args.request);
  if ("response" in session) return { ok: false, response: session.response };

  if (args.requireDesignatedApprover && !session.isDesignatedApprover) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Only the designated Demo A approver may decide this proposal.",
          code: "sandbox_je_approver_denied",
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user: session };
}

export async function guardSandboxJeProposalRead(
  request: Request,
): Promise<
  | { ok: true; user: SandboxJeAuthedUser }
  | { ok: false; response: NextResponse }
> {
  const runtime = await guardSandboxJeProposalRuntime(request);
  if (!runtime.ok) return runtime;

  const rateLimited = rateLimit(request, {
    key: SANDBOX_JE_PROPOSAL_READ_RATE_LIMIT_KEY,
    limit: 60,
    windowMs: 60_000,
  });
  if (rateLimited) return { ok: false, response: rateLimited };

  const session = await resolveSandboxJeSessionUser(request);
  if ("response" in session) return { ok: false, response: session.response };
  return { ok: true, user: session };
}

export function toSandboxJeProposalHttpError(err: unknown): NextResponse {
  const mapped = mapSandboxJeProposalError(err);
  if (mapped.status === 404 && mapped.body.error === "Not found") {
    return sandboxJeEmpty404();
  }
  return NextResponse.json(mapped.body, { status: mapped.status });
}
