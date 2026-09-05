import { NextResponse } from "next/server";
import { prepareAcceptedDemoATwoPersonExecution } from "@/lib/journal-entry-governance/sandbox-je-execution-prepare-api";
import {
  guardSandboxJePrepareMutate,
  toSandboxJePrepareOrProposalHttpError,
} from "@/lib/journal-entry-governance/sandbox-je-execution-prepare-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ proposalId: string }> },
) {
  const { proposalId } = await context.params;
  const body = await request.json().catch(() => null);

  const guard = await guardSandboxJePrepareMutate({
    request,
    proposalId,
    body,
  });
  if (!guard.ok) return guard.response;

  try {
    const payload = await prepareAcceptedDemoATwoPersonExecution({
      proposalId,
      approverUserId: guard.user.userId,
      approverEmail: guard.user.email,
      body,
    });
    return NextResponse.json(payload);
  } catch (err) {
    return toSandboxJePrepareOrProposalHttpError(err);
  }
}
