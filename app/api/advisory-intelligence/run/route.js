import { NextResponse } from "next/server";
import { rateLimit } from "../../../../lib/rate-limit";
import { supabaseAdmin } from "../../../../lib/supabase";
import { detectAdvisorySignals } from "../../../../lib/advisory-intelligence/signal-detector";
import { generateRecommendationsForSignals } from "../../../../lib/advisory-intelligence/recommendation-engine";
import { summarizeAdvisorySignals } from "../../../../lib/advisory-intelligence/pulse-summary";
import { advisorySchemaError, auditAdvisoryAction, requireAdvisoryCompanyAccess } from "../../../../lib/advisory-intelligence/api-security";

async function loadCompany(companyId) {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id, industry")
    .eq("id", companyId)
    .maybeSingle();
  if (error && advisorySchemaError(error)) return null;
  if (error) throw error;
  return data;
}

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "advisory-intelligence-run", limit: 20, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
    const body = await request.json().catch(() => ({}));
    const companyId = String(body.companyId || body.company_id || "").trim();
    const access = await requireAdvisoryCompanyAccess(request, { companyId });
    if (access.response) return access.response;

    const company = await loadCompany(companyId);
    const industry = String(body.industry || company?.industry || "general");
    const detection = await detectAdvisorySignals({
      companyId,
      industry,
      currentMetrics: body.currentMetrics || body.current_metrics || {},
      priorMetrics: body.priorMetrics || body.prior_metrics || {},
      period: String(body.period || body.recommended_period || "current"),
      sourceModule: String(body.sourceModule || body.source_module || "advisory_intelligence"),
      thresholdOverrides: body.thresholdOverrides || body.threshold_overrides || {},
    });
    const recommendationResult = await generateRecommendationsForSignals({
      signals: detection.signals,
      enqueuePackages: true,
    });
    const pulseSummary = summarizeAdvisorySignals({
      signals: detection.signals,
      recommendations: recommendationResult.recommendations,
    });

    await auditAdvisoryAction({
      eventType: "advisory_intelligence_run",
      user: access.user,
      companyId,
      metadata: {
        signals_created: detection.createdSignals.length,
        signals_existing: detection.existingSignals.length,
        recommendations: recommendationResult.recommendations.length,
        package_queue: recommendationResult.packageQueue.length,
      },
    });

    return NextResponse.json({
      ok: true,
      detection,
      recommendations: recommendationResult.recommendations,
      packageQueue: recommendationResult.packageQueue,
      pulseSummary,
    });
  } catch (error) {
    if (advisorySchemaError(error)) return NextResponse.json({ error: "Run the advisory intelligence migration first." }, { status: 501 });
    console.error("[advisory-intelligence/run] failed", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Unable to run advisory intelligence" }, { status: 500 });
  }
}
