import { NextResponse } from "next/server";
import { getSandboxJeProposal } from "@/lib/journal-entry-governance/sandbox-je-proposal-api";
import {
  guardSandboxJeProposalRead,
  toSandboxJeProposalHttpError,
} from "@/lib/journal-entry-governance/sandbox-je-proposal-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read-only Patent #6 + proposal custody (same payload family as GET proposal). */
export async function GET(
  request: Request,
  context: { params: Promise<{ proposalId: string }> },
) {
  const guard = await guardSandboxJeProposalRead(request);
  if (!guard.ok) return guard.response;

  try {
    const { proposalId } = await context.params;
    const payload = await getSandboxJeProposal({ request, proposalId });
    return NextResponse.json({
      proposal_id: payload.proposal_id,
      proposal_hash: payload.proposal_hash,
      status: payload.status,
      source_continuous_close_run_id: payload.source_continuous_close_run_id,
      source_accounting_sync_id: payload.source_accounting_sync_id,
      source_recon_run_ids: payload.source_recon_run_ids,
      period_end: payload.period_end,
      patent6_chain_receipt: payload.patent6_chain_receipt,
      approvals: payload.approvals,
      capabilities: payload.capabilities,
      memory_is_display_context_only: true,
    });
  } catch (err) {
    return toSandboxJeProposalHttpError(err);
  }
}
