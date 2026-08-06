import { NextResponse } from "next/server";
import { getAuthenticatedCompanyUser } from "@/lib/company-security";
import { getActiveCompanyForUser } from "@/lib/companies/active-company";
import { getArAgingForCompany } from "@/lib/reports/ar-aging";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdvisoryCompanyAccess } from "@/lib/advisory-intelligence/api-security";

export async function GET(req: Request) {
  const rateLimitResponse = rateLimit(req, { key: "dashboard-ar-aging", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const auth = await getAuthenticatedCompanyUser(req);
  if (auth.response) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const preferredCompanyId = String(searchParams.get("companyId") || searchParams.get("company_id") || "").trim();
  const sourceSystem = String(searchParams.get("sourceSystem") || searchParams.get("source_system") || "").trim();
  const connectionId = String(searchParams.get("connectionId") || searchParams.get("connection_id") || "").trim() || null;

  const company = await getActiveCompanyForUser(auth.user.id, preferredCompanyId || null);
  if (!company) return NextResponse.json({ pending: true }, { status: 200 });

  const access = await requireAdvisoryCompanyAccess(req, { companyId: company.id });
  if ("response" in access && access.response) return access.response;

  if (!sourceSystem) return NextResponse.json({ pending: true }, { status: 200 });

  try {
    const aging = await getArAgingForCompany(company.id, { sourceSystem, connectionId });
    if (!aging) return NextResponse.json({ pending: true }, { status: 200 });

    return NextResponse.json({
      current: aging.current,
      days_1_30: aging.days_1_30,
      days_31_60: aging.days_31_60,
      days_61_90: aging.days_61_90,
      days_over_90: aging.days_over_90,
      lastRefreshedAt: aging.lastRefreshedAt,
    });
  } catch (error) {
    console.error("[dashboard/ar-aging] failed", { message: (error as Error)?.message });
    return NextResponse.json({ pending: true }, { status: 200 });
  }
}
