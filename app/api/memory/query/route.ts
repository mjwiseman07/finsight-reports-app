import { NextResponse } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security";
import { queryMemory, type QueryMemoryInput } from "@/lib/memory/client-memory-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const firmClientId = searchParams.get("firm_client_id") ?? undefined;
  if (!firmClientId) {
    return NextResponse.json({ error: "firm_client_id is required" }, { status: 400 });
  }

  const access = (await resolveFirmAccess(request, { clientId: firmClientId })) as {
    response?: NextResponse;
  };
  if (access.response) return access.response;

  const minConfidenceRaw = searchParams.get("min_confidence");
  const input: QueryMemoryInput = {
    firmClientId,
    memoryType: searchParams.get("memory_type") ?? undefined,
    entityType: searchParams.get("entity_type") ?? undefined,
    entityId: searchParams.get("entity_id") ?? undefined,
    industry: searchParams.get("industry") ?? undefined,
    minConfidence: minConfidenceRaw != null ? Number(minConfidenceRaw) : undefined,
  };

  try {
    const records = await queryMemory(input);
    return NextResponse.json({ records }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
