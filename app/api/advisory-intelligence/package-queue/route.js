import { NextResponse } from "next/server";
import { rateLimit } from "../../../../lib/rate-limit";
import { supabaseAdmin } from "../../../../lib/supabase";
import { advisoryPackageStatuses } from "../../../../lib/advisory-intelligence/thresholds";
import { advisorySchemaError, auditAdvisoryAction, requireAdvisoryCompanyAccess } from "../../../../lib/advisory-intelligence/api-security";

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "advisory-intelligence-package-queue-read", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
    const { searchParams } = new URL(request.url);
    const companyId = String(searchParams.get("companyId") || searchParams.get("company_id") || "").trim();
    const status = String(searchParams.get("status") || "").trim();
    const access = await requireAdvisoryCompanyAccess(request, { companyId });
    if (access.response) return access.response;

    let query = supabaseAdmin
      .from("advisory_package_queue")
      .select("*, advisory_signals(*)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;

    await auditAdvisoryAction({
      eventType: "advisory_package_queue_viewed",
      user: access.user,
      companyId,
      metadata: { status: status || "all", count: data?.length || 0 },
    });

    return NextResponse.json({ ok: true, packageQueue: data || [] });
  } catch (error) {
    if (advisorySchemaError(error)) return NextResponse.json({ error: "Run the advisory intelligence migration first." }, { status: 501 });
    console.error("[advisory-intelligence/package-queue] failed", { message: error?.message });
    return NextResponse.json({ error: "Unable to load advisory package queue" }, { status: 500 });
  }
}

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "advisory-intelligence-package-queue-write", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
    const body = await request.json().catch(() => ({}));
    const companyId = String(body.companyId || body.company_id || "").trim();
    const queueId = String(body.queueId || body.queue_id || body.id || "").trim();
    const action = String(body.action || "").trim();
    const nextStatus = action === "approve" ? "approved" : action === "dismiss" ? "dismissed" : action === "generated" ? "generated" : "";
    if (!queueId) return NextResponse.json({ error: "queueId is required." }, { status: 400 });
    if (!advisoryPackageStatuses.includes(nextStatus)) return NextResponse.json({ error: "action must be approve, dismiss, or generated." }, { status: 400 });

    const access = await requireAdvisoryCompanyAccess(request, { companyId });
    if (access.response) return access.response;

    const updates = {
      status: nextStatus,
      ...(nextStatus === "generated" ? { generated_at: new Date().toISOString() } : {}),
    };
    const { data, error } = await supabaseAdmin
      .from("advisory_package_queue")
      .update(updates)
      .eq("id", queueId)
      .eq("company_id", companyId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Package queue item not found." }, { status: 404 });

    if (data.trigger_signal_id && nextStatus === "dismissed") {
      await supabaseAdmin
        .from("advisory_signals")
        .update({ status: "dismissed", reviewed_at: new Date().toISOString() })
        .eq("id", data.trigger_signal_id)
        .eq("company_id", companyId);
    }
    if (data.trigger_signal_id && nextStatus === "generated") {
      await supabaseAdmin
        .from("advisory_signals")
        .update({ status: "converted_to_package", reviewed_at: new Date().toISOString() })
        .eq("id", data.trigger_signal_id)
        .eq("company_id", companyId);
    }

    await auditAdvisoryAction({
      eventType: "advisory_package_queue_updated",
      user: access.user,
      companyId,
      resourceId: queueId,
      metadata: {
        action,
        status: nextStatus,
        package_type: data.package_type,
        trigger_signal_id: data.trigger_signal_id,
      },
    });

    return NextResponse.json({ ok: true, packageQueueItem: data });
  } catch (error) {
    if (advisorySchemaError(error)) return NextResponse.json({ error: "Run the advisory intelligence migration first." }, { status: 501 });
    console.error("[advisory-intelligence/package-queue] update failed", { message: error?.message });
    return NextResponse.json({ error: "Unable to update advisory package queue" }, { status: 500 });
  }
}
