/**
 * Route guards for sandbox JE execution-prepare API.
 */

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { assertSandboxJeMutationOrigin } from "./sandbox-je-mutation-origin";
import {
  resolveSandboxJeSessionUser,
  sandboxJeEmpty404,
  toSandboxJeProposalHttpError,
  type SandboxJeAuthedUser,
} from "./sandbox-je-proposal-route";
import {
  assertAcceptedDemoAProposalId,
  assertPrepareCapabilityBeforeWrites,
  assertProposerForbiddenForPrepare,
  assertSandboxJePrepareRuntimeEnabled,
  assertStrictEmptyPrepareBody,
  mapSandboxJePrepareError,
  SandboxJePrepareApiError,
} from "./sandbox-je-execution-prepare-api";
import { SANDBOX_JE_PREPARE_MUTATE_RATE_LIMIT_KEY } from "./sandbox-je-execution-prepare-shared";
import {
  assertDesignatedSandboxApprover,
  mapSandboxJeProposalError,
  SandboxJeProposalApiError,
} from "./sandbox-je-proposal-api";
import { isSandboxJeCockpitRuntimeEnabled } from "./sandbox-je-cockpit-api";

export async function guardSandboxJePrepareMutate(args: {
  request: Request;
  proposalId: string;
  body: unknown;
}): Promise<
  | { ok: true; user: SandboxJeAuthedUser }
  | { ok: false; response: NextResponse }
> {
  if (!isSandboxJeCockpitRuntimeEnabled()) {
    return { ok: false, response: sandboxJeEmpty404() };
  }

  try {
    assertSandboxJePrepareRuntimeEnabled();
  } catch (err) {
    if (
      err instanceof SandboxJePrepareApiError &&
      err.code === "sandbox_je_not_found"
    ) {
      return { ok: false, response: sandboxJeEmpty404() };
    }
    return { ok: false, response: toSandboxJePrepareHttpError(err) };
  }

  const originDenied = assertSandboxJeMutationOrigin(args.request);
  if (originDenied) return { ok: false, response: originDenied };

  const rateLimited = rateLimit(args.request, {
    key: SANDBOX_JE_PREPARE_MUTATE_RATE_LIMIT_KEY,
    limit: 10,
    windowMs: 60_000,
  });
  if (rateLimited) return { ok: false, response: rateLimited };

  try {
    assertStrictEmptyPrepareBody(args.body);
    assertAcceptedDemoAProposalId(args.proposalId);
    assertPrepareCapabilityBeforeWrites();
  } catch (err) {
    return { ok: false, response: toSandboxJePrepareHttpError(err) };
  }

  const session = await resolveSandboxJeSessionUser(args.request);
  if ("response" in session) return { ok: false, response: session.response };

  if (!session.isDesignatedApprover) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Only the designated Demo A approver may prepare execution.",
          code: "sandbox_je_approver_denied",
        },
        { status: 403 },
      ),
    };
  }

  try {
    assertDesignatedSandboxApprover({
      userId: session.userId,
      email: session.email,
    });
    assertProposerForbiddenForPrepare(session.userId);
  } catch (err) {
    if (err instanceof SandboxJeProposalApiError) {
      const mapped = mapSandboxJeProposalError(err);
      return {
        ok: false,
        response: NextResponse.json(mapped.body, { status: mapped.status }),
      };
    }
    return { ok: false, response: toSandboxJePrepareHttpError(err) };
  }

  return { ok: true, user: session };
}

export function toSandboxJePrepareHttpError(err: unknown): NextResponse {
  const mapped = mapSandboxJePrepareError(err);
  if (mapped.status === 404 && mapped.body.error === "Not found") {
    return sandboxJeEmpty404();
  }
  return NextResponse.json(mapped.body, { status: mapped.status });
}

export function toSandboxJePrepareOrProposalHttpError(err: unknown): NextResponse {
  if (err instanceof SandboxJePrepareApiError) {
    return toSandboxJePrepareHttpError(err);
  }
  return toSandboxJeProposalHttpError(err);
}
