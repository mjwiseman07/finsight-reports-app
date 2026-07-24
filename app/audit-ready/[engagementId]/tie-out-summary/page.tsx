import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { getEngagementActor } from "@/lib/audit-ready/server-auth";
import { TieOutSummaryClient } from "@/components/audit-ready/TieOutSummaryClient";
import { headingFont } from "@/components/site-ui";
import {
  getBsSummaryArtifactByPeriodEnd,
  parseStrictAsOfDate,
  type BsReconSummaryArtifact,
} from "@/lib/audit-ready/tie-out/bs-recon-artifacts";
import { getBsSummaryLines } from "@/lib/audit-ready/tie-out/bs-recon-lines";
import { BsSummaryLinesTable } from "@/components/audit-ready/BsSummaryLinesTable";

export const dynamic = "force-dynamic";

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function BsAsOfBanner(props: {
  asOfRaw: string | undefined;
  asOfParsed: string | null;
  artifact: BsReconSummaryArtifact | null;
}) {
  const { asOfRaw, asOfParsed, artifact } = props;
  if (!asOfRaw) return null;

  if (!asOfParsed) {
    return (
      <div
        className="rounded-lg border border-[#C9A961]/30 bg-[#1A1A1C]/50 p-4"
        role="status"
      >
        <p className="text-sm font-medium text-[#ECEBE7]">
          Invalid as-of date
        </p>
        <p className="mt-1 text-sm text-[#A29E93]">
          Expected <code className="text-[#ECEBE7]">YYYY-MM-DD</code>. Got{" "}
          <code className="text-[#ECEBE7]">{asOfRaw}</code>. Showing the full
          tie-out summary below.
        </p>
      </div>
    );
  }

  if (!artifact) {
    return (
      <div
        className="rounded-lg border border-[#C9A961]/30 bg-[#1A1A1C]/50 p-4"
        role="status"
      >
        <p className="text-sm font-medium text-[#ECEBE7]">
          No BS reconciliation for {asOfParsed}
        </p>
        <p className="mt-1 text-sm text-[#A29E93]">
          No summary artifact found for this as-of date. Tie-out lines below
          are unchanged.
        </p>
      </div>
    );
  }

  const statusLabel =
    artifact.bs_equation_status === "tie" ? "Tied" : "Needs review";
  return (
    <div
      className="rounded-lg border border-[#C9A961]/30 bg-[#1A1A1C]/50 p-4"
      role="status"
    >
      <p className={`${headingFont} text-sm font-semibold text-[#ECEBE7]`}>
        BS reconciliation — as of {artifact.period_end}
      </p>
      <p className="mt-1 text-sm text-[#A29E93]">
        Status:{" "}
        <span className="text-[#ECEBE7]">{statusLabel}</span>
        {" · "}
        Variance:{" "}
        <span className="text-[#ECEBE7] tabular-nums">
          {formatCents(artifact.bs_equation_variance_cents)}
        </span>
        {" · "}
        Accounts:{" "}
        <span className="text-[#ECEBE7] tabular-nums">
          {artifact.account_count_total}
        </span>
        {artifact.account_count_kickout > 0 ? (
          <>
            {" "}
            (
            <span className="text-[#ECEBE7] tabular-nums">
              {artifact.account_count_kickout}
            </span>{" "}
            kickout)
          </>
        ) : null}
        {artifact.accounting_method ? (
          <>
            {" · "}
            Basis:{" "}
            <span className="text-[#ECEBE7]">{artifact.accounting_method}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}

export default async function TieOutSummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ engagementId: string }>;
  searchParams: Promise<{
    as_of?: string;
    open_line?: string;
    highlight_run?: string;
  }>;
}) {
  const { engagementId } = await params;
  const sp = await searchParams;
  const actor = await getEngagementActor(engagementId);
  if (!actor) redirect("/dashboard?error=forbidden");

  const asOfRaw = typeof sp.as_of === "string" ? sp.as_of : undefined;
  const asOfParsed = parseStrictAsOfDate(asOfRaw ?? null);
  const openLineId =
    typeof sp.open_line === "string" ? sp.open_line : null;
  const highlightRunId =
    typeof sp.highlight_run === "string" ? sp.highlight_run : null;

  const supabase = getSupabaseAdmin();
  const [summary, policy, bsArtifact] = await Promise.all([
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
    asOfParsed
      ? getBsSummaryArtifactByPeriodEnd({
          engagementId,
          periodEnd: asOfParsed,
        })
      : Promise.resolve(null),
  ]);

  // Second wave: load summary lines only if we resolved an artifact
  const bsLines = bsArtifact ? await getBsSummaryLines(bsArtifact.id) : [];

  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <header>
          <h1 className={`${headingFont} text-2xl font-semibold text-[#ECEBE7]`}>
            Tie-Out Summary
          </h1>
          <p className="mt-1 text-sm text-[#A29E93]">
            Tie-out state per PBC line. Run AR aging resolvers when a line is
            ready.
          </p>
        </header>
        <BsAsOfBanner
          asOfRaw={asOfRaw}
          asOfParsed={asOfParsed}
          artifact={bsArtifact}
        />
        {bsArtifact && bsLines.length > 0 && (
          <section>
            <h2
              className={`${headingFont} mb-3 text-lg font-semibold text-[#ECEBE7]`}
            >
              Balance Sheet Reconciliation
            </h2>
            <BsSummaryLinesTable
              engagementId={engagementId}
              artifactId={bsArtifact.id}
              periodEnd={bsArtifact.period_end}
              lines={bsLines}
              initialOpenLineId={openLineId}
            />
          </section>
        )}
        <TieOutSummaryClient
          engagementId={engagementId}
          rows={summary.data || []}
          policy={policy.data || null}
          canWrite={actor.canWrite}
          highlightRunId={highlightRunId}
        />
      </div>
    </main>
  );
}
