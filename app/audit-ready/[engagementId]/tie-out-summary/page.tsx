import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { getEngagementActor } from "@/lib/audit-ready/server-auth";
import { TieOutSummaryClient } from "@/components/audit-ready/TieOutSummaryClient";
import { headingFont } from "@/components/site-ui";

export const dynamic = "force-dynamic";

export default async function TieOutSummaryPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  const actor = await getEngagementActor(engagementId);
  if (!actor) redirect("/dashboard?error=forbidden");
  const supabase = getSupabaseAdmin();
  const [summary, policy] = await Promise.all([
    supabase
      .from("audit_ready_tie_out_summary")
      .select("*")
      .eq("engagement_id", engagementId)
      .order("request_number", { ascending: true }),
    supabase
      .from("audit_ready_tie_out_policies")
      .select("*")
      .eq("engagement_id", engagementId)
      .maybeSingle(),
  ]);
  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <header>
          <h1 className={`${headingFont} text-2xl font-semibold text-[#ECEBE7]`}>
            Tie-Out Summary
          </h1>
          <p className="mt-1 text-sm text-[#A29E93]">
            Read-only view of tie-out state per PBC line. Resolvers arrive in the
            next phase.
          </p>
        </header>
        <TieOutSummaryClient
          engagementId={engagementId}
          rows={summary.data || []}
          policy={policy.data || null}
          canWrite={actor.canWrite}
        />
      </div>
    </main>
  );
}
