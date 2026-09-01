/**
 * Server-side execution custody read model for sandbox JE proposal UI.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

export type SandboxJeProposalExecutionCustody = {
  has_execution: boolean;
  execution_id: string | null;
  execution_status: string | null;
};

export class SandboxJeExecutionCustodyError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SandboxJeExecutionCustodyError";
    this.code = code;
  }
}

export async function resolveSandboxJeExecutionCustodyForApproval(args: {
  approvalId: string;
  proposalId: string;
}): Promise<SandboxJeProposalExecutionCustody> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("journal_entry_executions")
    .select("id, status, proposal_id, approval_id")
    .eq("approval_id", args.approvalId)
    .maybeSingle();
  if (error) {
    throw new SandboxJeExecutionCustodyError(
      "sandbox_je_execution_custody_read_failed",
      error.message,
    );
  }
  if (!data?.id) {
    return {
      has_execution: false,
      execution_id: null,
      execution_status: null,
    };
  }
  if (String(data.proposal_id) !== args.proposalId) {
    throw new SandboxJeExecutionCustodyError(
      "sandbox_je_execution_proposal_binding_mismatch",
      "Execution custody proposal binding mismatch.",
    );
  }
  return {
    has_execution: true,
    execution_id: String(data.id),
    execution_status: String(data.status),
  };
}
