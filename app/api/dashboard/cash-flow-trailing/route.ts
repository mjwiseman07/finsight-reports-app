import { NextResponse } from "next/server";
import { getAuthenticatedCompanyUser } from "@/lib/company-security";
import { getActiveCompanyForUser } from "@/lib/companies/active-company";
import { getTrailingCashFlowForCompany } from "@/lib/reports/cash-flow-trailing";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdvisoryCompanyAccess } from "@/lib/advisory-intelligence/api-security";

export async function GET(req: Request) {
  const rateLimitResponse = rateLimit(req, { key: "dashboard-cash-flow-trailing", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const auth = await getAuthenticatedCompanyUser(req);
  if (auth.response) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const preferredCompanyId = String(searchParams.get("companyId") || searchParams.get("company_id") || "").trim();

  const company = await getActiveCompanyForUser(auth.user.id, preferredCompanyId || null);
  if (!company) return NextResponse.json({ pending: true }, { status: 200 });

  const access = await requireAdvisoryCompanyAccess(req, { companyId: company.id });
  if ("response" in access && access.response) return access.response;

  try {
    const cashFlow = await getTrailingCashFlowForCompany(company.id);
    if (!cashFlow) return NextResponse.json({ pending: true }, { status: 200 });

    return NextResponse.json({
      netOperatingCashFlow: cashFlow.netOperatingCashFlow,
      monthlyAverageBurn: cashFlow.monthlyAverageBurn,
      lastRefreshedAt: cashFlow.lastRefreshedAt,
    });
  } catch (error) {
    console.error("[dashboard/cash-flow-trailing] failed", { message: (error as Error)?.message });
    return NextResponse.json({ pending: true }, { status: 200 });
  }
}
