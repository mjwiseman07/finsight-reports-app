import { NextResponse } from "next/server";
import { listAccountingProviders } from "../../../../lib/integrations/accounting";
import { rateLimit } from "../../../../lib/rate-limit";

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "accounting-providers", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  return NextResponse.json({ providers: listAccountingProviders() });
}
