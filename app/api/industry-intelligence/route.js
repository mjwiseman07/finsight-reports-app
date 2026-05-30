import { NextResponse } from "next/server";
import { resolveIndustryIntelligenceForCompany, supportedIndustryTypes } from "../../../lib/industry-intelligence-framework";
import { rateLimit } from "../../../lib/rate-limit";

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "industry-intelligence-framework", limit: 120, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const industryType = String(searchParams.get("industryType") || "Professional Services").trim();

  if (!supportedIndustryTypes.includes(industryType)) {
    return NextResponse.json({ error: "Unsupported industry type." }, { status: 400 });
  }

  return NextResponse.json(resolveIndustryIntelligenceForCompany({ industry_type: industryType }));
}
