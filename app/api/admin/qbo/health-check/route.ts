import { NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security";
import { checkQBOHealth } from "@/lib/erp/quickbooks/health-checker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = (await resolveSuperAdminAccess(request)) as { response?: NextResponse };
  if (access.response) return access.response;

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

  try {
    const result = await checkQBOHealth(firmClientId);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
