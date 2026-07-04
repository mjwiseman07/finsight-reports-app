import { NextResponse, type NextRequest } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { listAssertions, listRelevanceMatrix } from "@/lib/assertions/registry";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireFirmAuth(req);
    const [assertions, relevance] = await Promise.all([
      listAssertions(),
      listRelevanceMatrix(),
    ]);
    return NextResponse.json({ assertions, relevance });
  } catch (e) {
    return authErrorResponse(e);
  }
}
