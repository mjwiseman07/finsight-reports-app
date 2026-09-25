import { NextResponse } from "next/server";
import { isJe4ApiTriggerEnabled } from "@/lib/journal-entry-governance/post-write-verification-feature-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function disabledResponse() {
  return NextResponse.json(
    {
      error: "je4_api_trigger_disabled",
      message:
        "JE-4 HTTP trigger is disabled. This route does not create or verify journal entries.",
    },
    { status: 403 },
  );
}

/**
 * Read-only inspection route. Stays disabled with the JE-4 gate.
 * Execution routes do not export POST; orchestration is
 * runPostWriteVerification with injected dependencies.
 * runProductionPostWriteVerification remains the gated programmatic entry.
 */
export async function GET() {
  if (isJe4ApiTriggerEnabled()) {
    return NextResponse.json(
      {
        error: "je4_api_trigger_disabled",
        message:
          "JE-4 HTTP inspection is not wired. Enablement does not authorize journal-entry create or verify.",
      },
      { status: 403 },
    );
  }
  return disabledResponse();
}
