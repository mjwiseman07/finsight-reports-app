import { NextResponse } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security.js";
import { qboJournalEntryPoster } from "@/lib/erp/quickbooks/journal-entry-poster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { firm_client_id, idempotency_key, source_type, source_id, payload } = body ?? {};

  if (!firm_client_id || !idempotency_key || !source_type || !payload) {
    return NextResponse.json(
      {
        error: "missing_required_fields",
        required: ["firm_client_id", "idempotency_key", "source_type", "payload"],
      },
      { status: 400 },
    );
  }

  const access = (await resolveFirmAccess(req, { clientId: firm_client_id })) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;

  const result = await qboJournalEntryPoster.post({
    firm_client_id,
    idempotency_key,
    source_type,
    source_id,
    posted_by: "human",
    posted_by_user_id: access.userId,
    payload,
  });

  const statusCode = result.status === "posted" ? 200 : result.status === "rejected" ? 422 : 502;
  return NextResponse.json(result, { status: statusCode });
}
