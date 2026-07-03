import { NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { checkQBOHealth } from "@/lib/erp/quickbooks/health-checker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QBO_SCOPE = "com.intuit.quickbooks.accounting";

export async function POST(request: Request) {
  const access = (await resolveSuperAdminAccess(request)) as {
    response?: NextResponse;
    userId?: string;
  };
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
    // Precondition: a fresh health check must be healthy with the correct scope.
    const health = await checkQBOHealth(firmClientId);
    if (health.status !== "healthy") {
      return NextResponse.json(
        { error: "QBO connection is not healthy", health },
        { status: 409 },
      );
    }
    if (!health.grantedScopes?.includes(QBO_SCOPE)) {
      return NextResponse.json(
        { error: `Connection is missing required scope ${QBO_SCOPE}`, health },
        { status: 409 },
      );
    }

    const supabase = getSupabaseAdmin();
    const enabledAt = new Date().toISOString();
    const { error } = await supabase
      .from("firm_clients")
      .update({
        qbo_write_enabled: true,
        qbo_write_enabled_by_user_id: access.userId ?? null,
        qbo_write_enabled_at: enabledAt,
      })
      .eq("id", firmClientId);
    if (error) throw new Error(error.message);

    return NextResponse.json(
      { success: true, firm_client_id: firmClientId, enabled_at: enabledAt },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
