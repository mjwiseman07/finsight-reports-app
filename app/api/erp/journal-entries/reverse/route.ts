import { NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security.js";
import { legacyJournalEntryPostingService } from "@/lib/erp/quickbooks/legacy-je-posting-service";
import {
  ProductionJeWorkflowError,
  assertProductionWorkflowGovernedWhenApplicable,
} from "@/lib/journal-entry-governance/production-workflow-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const access = (await resolveSuperAdminAccess(req)) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;

  const body = await req.json().catch(() => ({}));
  const { attempt_id, reason } = body ?? {};
  if (!attempt_id || !reason) {
    return NextResponse.json({ error: "missing_attempt_id_or_reason" }, { status: 400 });
  }

  try {
    assertProductionWorkflowGovernedWhenApplicable({
      workflow: "ERP_API",
      executionId: body?.governed_execution_id ?? null,
    });
  } catch (err) {
    if (err instanceof ProductionJeWorkflowError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: 403 },
      );
    }
    throw err;
  }

  const result = await legacyJournalEntryPostingService.reverse(
    attempt_id,
    reason,
    access.userId as string,
  );

  const statusCode = result.status === "posted" ? 200 : result.status === "rejected" ? 422 : 502;
  return NextResponse.json(result, { status: statusCode });
}
