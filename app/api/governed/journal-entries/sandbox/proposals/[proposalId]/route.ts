import { NextResponse } from "next/server";
import { getSandboxJeProposal } from "@/lib/journal-entry-governance/sandbox-je-proposal-api";
import {
  guardSandboxJeProposalRead,
  toSandboxJeProposalHttpError,
} from "@/lib/journal-entry-governance/sandbox-je-proposal-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ proposalId: string }> },
) {
  const guard = await guardSandboxJeProposalRead(request);
  if (!guard.ok) return guard.response;

  try {
    const { proposalId } = await context.params;
    const payload = await getSandboxJeProposal({ request, proposalId });
    return NextResponse.json(payload);
  } catch (err) {
    return toSandboxJeProposalHttpError(err);
  }
}
