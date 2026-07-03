import { NextResponse } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security.js";
import { listFiresForReview } from "@/lib/recurring/review-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const firmClientId = url.searchParams.get("firm_client_id");
  if (!firmClientId) {
    return NextResponse.json({ error: "missing_firm_client_id" }, { status: 400 });
  }

  const access = (await resolveFirmAccess(req, { clientId: firmClientId })) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;

  try {
    const result = await listFiresForReview(firmClientId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
