import { requireFirmAuthServer } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import BudgetsManager from "@/components/budgets/BudgetsManager";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  let auth;
  try {
    auth = await requireFirmAuthServer();
  } catch {
    redirect("/login");
  }
  const firmId = auth.firmIds[0];
  if (!firmId) redirect("/onboarding");
  const supabase = createServiceClient();
  const { data: rows } = await supabase
    .from("gl_account_budgets")
    .select(
      "id, gl_account_code, gl_account_name, period_year, period_month, budget_amount_cents, currency, tolerance_pct",
    )
    .eq("firm_id", firmId)
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .order("gl_account_code", { ascending: true });
  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">GL Account Budgets</h1>
      <p className="text-sm text-neutral-600 mt-1">
        Monthly budget ceilings by GL account. Requisitions exceeding budget will block final approval.
      </p>
      <div className="mt-6">
        <BudgetsManager firmId={firmId} initialRows={rows ?? []} />
      </div>
    </main>
  );
}
