import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { upsertGlBudget } from "@/lib/ap-intake/budget/budget-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) {
      return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    for (const f of [
      "firm_client_id",
      "company_id",
      "gl_account_code",
      "period_year",
      "period_month",
      "budget_amount_cents",
    ]) {
      if (body?.[f] === undefined) {
        return NextResponse.json(
          { error: "validation", field: f, message: `${f} required` },
          { status: 422 },
        );
      }
    }
    const id = await upsertGlBudget({
      firmId,
      firmClientId: String(body.firm_client_id),
      companyId: String(body.company_id),
      glAccountCode: String(body.gl_account_code),
      glAccountName: body.gl_account_name,
      periodYear: Number(body.period_year),
      periodMonth: Number(body.period_month),
      budgetAmountCents: Number(body.budget_amount_cents),
      currency: body.currency,
      tolerancePct: body.tolerance_pct !== undefined ? Number(body.tolerance_pct) : undefined,
      createdByUserId: auth.userId,
      engagementId: body?.engagement_id ?? null,
    });
    return NextResponse.json({ ok: true, budget_id: id });
  } catch (err) {
    return authErrorResponse(err);
  }
}
