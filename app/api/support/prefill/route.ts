import { NextResponse } from "next/server";
import { getAuthenticatedCompanyUser } from "../../../../lib/company-security";
import { rateLimit } from "../../../../lib/rate-limit";
import { collectWorkflowSignals } from "../../../../lib/support/workflow-signals";
import { composePrefillDraft } from "../../../../lib/support/prefill-composer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimitResponse = rateLimit(request, { key: "support-prefill", limit: 20, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  // Use the same auth pattern as app/api/support/tickets/route.js
  // getAuthenticatedCompanyUser returns { response?, user? }
  const access = await (
    getAuthenticatedCompanyUser as (r: Request) => Promise<{
      response?: Response;
      user?: { id: string; email?: string };
    }>
  )(request);
  if (access.response) return access.response as unknown as NextResponse;
  if (!access.user?.id) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const contextParam = url.searchParams.get("context");

  const bundle = await collectWorkflowSignals({ userId: access.user.id, contextParam });
  const draft = await composePrefillDraft(bundle);

  return NextResponse.json({
    ok: true,
    hasDraft: !!draft,
    draft,
    signals: bundle.signals.map((s) => ({ kind: s.kind, severity: s.severity })),
    mostRecentAutoFiledTicket: bundle.mostRecentAutoFiledTicket,
  });
}
