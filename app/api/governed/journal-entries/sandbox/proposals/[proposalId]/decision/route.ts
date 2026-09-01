import { NextResponse } from "next/server";
import { decideSandboxJeProposal } from "@/lib/journal-entry-governance/sandbox-je-proposal-api";
import {
  guardSandboxJeProposalMutate,
  toSandboxJeProposalHttpError,
} from "@/lib/journal-entry-governance/sandbox-je-proposal-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ proposalId: string }> },
) {
  const guard = await guardSandboxJeProposalMutate({
    request,
    requireDesignatedApprover: true,
  });
  if (!guard.ok) return guard.response;

  try {
    const { proposalId } = await context.params;
    const body = await request.json().catch(() => null);
    const payload = await decideSandboxJeProposal({
      request,
      proposalId,
      reviewerUserId: guard.user.userId,
      reviewerEmail: guard.user.email,
      body,
    });
    return NextResponse.json(payload);
  } catch (err) {
    return toSandboxJeProposalHttpError(err);
  }
}
