"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClientBriefingsChrome, EmptyBriefingState, RiskBadge, StatusBadge } from "../../../components/ClientBriefingsChrome";

type ClientContent = {
  executiveSummary?: string;
  revenue?: string;
  cash?: string;
  profitability?: string;
  receivables?: string;
  payables?: string;
  payroll?: string;
  inventory?: string;
  risks?: string;
  recommendedActions?: string[];
  missingDataNotice?: string[];
};

type AdvisorContent = {
  revenueVariance?: string;
  grossMarginVariance?: string;
  ebitdaVariance?: string;
  cashMovementByDriver?: string;
  arAgingChanges?: string;
  apAgingChanges?: string;
  payrollFteTrends?: string;
  inventoryMovement?: string;
  budgetVsActual?: string;
  kpiExceptions?: string[];
  riskFlags?: string[];
  suggestedTalkingPoints?: string[];
};

type Briefing = {
  id: string;
  clientId: string;
  clientName?: string;
  firmName?: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  riskLevel: string;
  generatedAt: string;
  clientBriefingContent: ClientContent;
  advisorBriefingContent: AdvisorContent;
  missingReports: string[];
};

function getAuthToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("supabase_access_token") || "";
}

function ClientBriefingPreviewContent() {
  const searchParams = useSearchParams();
  const briefingId = searchParams?.get("briefing_id") || "";
  const clientId = searchParams?.get("client_id") || "";
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPreview = async () => {
      const token = getAuthToken();
      if (!token) {
        setError("Sign in as a firm admin or advisor to preview Client Briefings.");
        setIsLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (clientId) params.set("client_id", clientId);
      if (briefingId) params.set("briefing_id", briefingId);

      try {
        const response = await fetch(`/api/client-briefings/history?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (!response.ok) {
          setError(result.error || "Unable to load briefing preview.");
          return;
        }
        setBriefings(result.briefings || []);
      } catch {
        setError("Unable to load briefing preview.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadPreview();
  }, [briefingId, clientId]);

  const briefing = useMemo(
    () => briefings.find((item) => item.id === briefingId) || briefings[0] || null,
    [briefingId, briefings],
  );

  return (
    <ClientBriefingsChrome active="Client Preview">
      <section className="py-10">
        {isLoading && <EmptyBriefingState message="Loading client briefing preview..." />}
        {error && <div className="rounded-3xl border border-[#B85C5C]/40 bg-[#B85C5C]/10 p-5 text-sm font-bold text-[#F0BFBF]">{error}</div>}
        {!isLoading && !error && !briefing && <EmptyBriefingState message="No briefing is available yet. Generate a briefing from the dashboard first." />}

        {briefing && (
          <div className="grid gap-6 xl:grid-cols-[1fr_0.42fr]">
            <article className="rounded-[2rem] border border-[#C9A961]/25 bg-[#F9FAFB] p-8 text-[#111827] shadow-2xl shadow-black/40">
              <header className="border-b border-slate-200 pb-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5B4A1F]">Client Briefing</p>
                <h1 className="mt-3 text-4xl font-black tracking-[-0.04em]">{briefing.clientName || "Client"}</h1>
                <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                  <p><strong>Briefing period:</strong> {briefing.periodStart} to {briefing.periodEnd}</p>
                  <p><strong>Prepared by:</strong> {briefing.firmName || "Advisacor Demo Advisory"}</p>
                  <p><strong>Date generated:</strong> {formatDate(briefing.generatedAt)}</p>
                  <p><strong>Risk level:</strong> {briefing.riskLevel}</p>
                </div>
              </header>

              <div className="mt-8 grid gap-6">
                <BriefingSection title="Executive Summary" body={briefing.clientBriefingContent.executiveSummary} />
                <div className="grid gap-5 md:grid-cols-2">
                  <BriefingSection title="Revenue" body={briefing.clientBriefingContent.revenue} />
                  <BriefingSection title="Cash" body={briefing.clientBriefingContent.cash} />
                  <BriefingSection title="Profitability" body={briefing.clientBriefingContent.profitability} />
                  <BriefingSection title="Receivables" body={briefing.clientBriefingContent.receivables} />
                  <BriefingSection title="Payables" body={briefing.clientBriefingContent.payables} />
                  <BriefingSection title="Payroll / FTE" body={briefing.clientBriefingContent.payroll} />
                  <BriefingSection title="Inventory" body={briefing.clientBriefingContent.inventory} />
                  <BriefingSection title="Risks" body={briefing.clientBriefingContent.risks} />
                </div>

                <section className="rounded-3xl border border-slate-200 bg-white p-5">
                  <h2 className="text-lg font-black">Recommended Actions</h2>
                  <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
                    {(briefing.clientBriefingContent.recommendedActions || []).map((action) => (
                      <li key={action}>- {action}</li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                  <h2 className="text-lg font-black">Missing Data Notice</h2>
                  <ul className="mt-3 grid gap-2 text-sm leading-6 text-amber-900">
                    {(briefing.clientBriefingContent.missingDataNotice || []).map((notice) => (
                      <li key={notice}>- {notice}</li>
                    ))}
                  </ul>
                </section>
              </div>
            </article>

            <aside className="grid gap-6">
              <section className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-6">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Workflow</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge status={briefing.status} />
                  <RiskBadge risk={briefing.riskLevel} />
                </div>
                <p className="mt-4 text-sm leading-6 text-[#A29E93]">
                  Client-facing language stays simple and confident. Advisor notes preserve variance, KPI exceptions, risk flags, and talking points.
                </p>
              </section>

              <section className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-6">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Advisor Briefing</p>
                <div className="mt-4 grid gap-3 text-sm leading-6 text-[#ECEBE7]">
                  <p><strong>Revenue variance:</strong> {briefing.advisorBriefingContent.revenueVariance}</p>
                  <p><strong>Gross margin:</strong> {briefing.advisorBriefingContent.grossMarginVariance}</p>
                  <p><strong>EBITDA/profit:</strong> {briefing.advisorBriefingContent.ebitdaVariance}</p>
                  <p><strong>Cash drivers:</strong> {briefing.advisorBriefingContent.cashMovementByDriver}</p>
                  <p><strong>AR aging:</strong> {briefing.advisorBriefingContent.arAgingChanges}</p>
                  <p><strong>AP aging:</strong> {briefing.advisorBriefingContent.apAgingChanges}</p>
                  <p><strong>Payroll/FTE:</strong> {briefing.advisorBriefingContent.payrollFteTrends}</p>
                  <p><strong>Budget vs actual:</strong> {briefing.advisorBriefingContent.budgetVsActual}</p>
                </div>
              </section>

              <section className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-6">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#6DAA45]">Suggested Talking Points</p>
                <ul className="mt-4 grid gap-2 text-sm leading-6 text-[#ECEBE7]">
                  {(briefing.advisorBriefingContent.suggestedTalkingPoints || []).map((point) => (
                    <li key={point}>- {point}</li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
        )}
      </section>
    </ClientBriefingsChrome>
  );
}

export default function ClientBriefingPreviewPage() {
  return (
    <Suspense fallback={<ClientBriefingsChrome active="Client Preview"><EmptyBriefingState message="Loading client briefing preview..." /></ClientBriefingsChrome>}>
      <ClientBriefingPreviewContent />
    </Suspense>
  );
}

function BriefingSection({ title, body }: { title: string; body?: string }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-black">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-700">{body || "No briefing text available for this section."}</p>
    </section>
  );
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
