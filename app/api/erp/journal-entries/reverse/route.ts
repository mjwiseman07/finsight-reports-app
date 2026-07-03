import { NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security.js";
import { qboJournalEntryPoster } from "@/lib/erp/quickbooks/journal-entry-poster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const access = (await resolveSuperAdminAccess(req)) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;

  const { attempt_id, reason } = await req.json().catch(() => ({}));
  if (!attempt_id || !reason) {
    return NextResponse.json({ error: "missing_attempt_id_or_reason" }, { status: 400 });
  }

  const result = await qboJournalEntryPoster.reverse(attempt_id, reason, access.userId as string);

  const statusCode = result.status === "posted" ? 200 : result.status === "rejected" ? 422 : 502;
  return NextResponse.json(result, { status: statusCode });
}
