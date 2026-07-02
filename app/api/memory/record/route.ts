import { NextResponse } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security";
import { recordMemory, type RecordMemoryInput } from "@/lib/memory/client-memory-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const firmClientId = (body.firm_client_id ?? body.firmClientId) as string | undefined;
  if (!firmClientId) {
    return NextResponse.json({ error: "firm_client_id is required" }, { status: 400 });
  }

  const access = (await resolveFirmAccess(request, { clientId: firmClientId })) as {
    response?: NextResponse;
  };
  if (access.response) return access.response;

  const memoryType = (body.memory_type ?? body.memoryType) as RecordMemoryInput["memoryType"];
  const memoryKey = (body.memory_key ?? body.memoryKey) as string | undefined;
  if (!memoryType) return NextResponse.json({ error: "memory_type is required" }, { status: 400 });
  if (!memoryKey) return NextResponse.json({ error: "memory_key is required" }, { status: 400 });

  const input: RecordMemoryInput = {
    firmClientId,
    memoryType,
    memoryKey,
    payload: (body.payload ?? {}) as Record<string, unknown>,
    domain: (body.domain as string) ?? undefined,
    subdomain: (body.subdomain as string) ?? undefined,
    topic: (body.topic as string) ?? undefined,
    entityType: (body.entity_type ?? body.entityType) as string | undefined,
    entityId: (body.entity_id ?? body.entityId) as string | undefined,
    confidenceScore: (body.confidence_score ?? body.confidenceScore) as number | undefined,
    evidenceStrength: (body.evidence_strength ?? body.evidenceStrength) as
      | RecordMemoryInput["evidenceStrength"]
      | undefined,
    sourceSystem: (body.source_system ?? body.sourceSystem) as string | undefined,
  };

  try {
    const result = await recordMemory(input);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
