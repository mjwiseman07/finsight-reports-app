import { NextResponse } from "next/server";
import {
  createSandboxJeProposal,
} from "@/lib/journal-entry-governance/sandbox-je-proposal-api";
import {
  guardSandboxJeProposalMutate,
  toSandboxJeProposalHttpError,
} from "@/lib/journal-entry-governance/sandbox-je-proposal-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await guardSandboxJeProposalMutate({
    request,
    requireSuperAdmin: true,
  });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json().catch(() => null);
    const payload = await createSandboxJeProposal({
      request,
      proposerUserId: guard.user.userId,
      proposerEmail: guard.user.email,
      body,
    });
    return NextResponse.json(payload, { status: 201 });
  } catch (err) {
    return toSandboxJeProposalHttpError(err);
  }
}
