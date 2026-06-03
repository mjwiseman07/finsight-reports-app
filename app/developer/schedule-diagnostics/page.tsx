"use client";

import { useEffect, useState } from "react";

type ScheduleDiagnostic = {
  name: string;
  sourceReportName: string;
  rowCount: number;
  totalAmount?: number;
  rawData?: unknown;
  normalizedData?: unknown;
  pdfPayload?: unknown;
};

type ScheduleDiagnosticsPayload = {
  provider?: string | null;
  selectedPeriod?: { startDate?: string; endDate?: string } | null;
  schedules?: ScheduleDiagnostic[];
  failures?: Array<{ schedule: string; message: string; balanceSheetAmount: number; scheduleAmount: number }>;
};

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-xl bg-slate-950/80 p-3 text-xs text-slate-200">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function ScheduleDiagnosticsPage() {
  const [payload, setPayload] = useState<ScheduleDiagnosticsPayload>({});
  const [message, setMessage] = useState("Loading schedule diagnostics...");

  useEffect(() => {
    const load = async () => {
      try {
        const token = window.localStorage.getItem("supabase_access_token") || "";
        const activePayload = JSON.parse(window.localStorage.getItem("advisacor_active_report_payload") || "{}");
        const params = new URLSearchParams();
        if (activePayload.companyId) params.set("companyId", activePayload.companyId);
        if (activePayload.connectionId) params.set("connectionId", activePayload.connectionId);
        if (activePayload.sourceSystem) params.set("sourceSystem", activePayload.sourceSystem);
        if (activePayload.leadId) params.set("leadId", activePayload.leadId);
        const response = await fetch(`/api/accounting/schedule-diagnostics?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load schedule diagnostics.");
        setPayload(result);
        setMessage(`${result.provider || "Accounting"} schedule diagnostics for ${result.selectedPeriod?.startDate || "selected period"} to ${result.selectedPeriod?.endDate || "selected period"}`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load schedule diagnostics.");
      }
    };
    void load();
  }, []);

  return (
    <main className="min-h-screen bg-[#07111F] px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-200">Developer</p>
        <h1 className="mt-3 text-3xl font-black">Schedule Diagnostics</h1>
        <p className="mt-2 text-sm font-semibold text-slate-300">{message}</p>

        {Boolean(payload.failures?.length) && (
          <div className="mt-6 rounded-2xl border border-red-300/30 bg-red-500/10 p-4">
            <h2 className="text-lg font-black">Schedule Population Failures</h2>
            {payload.failures?.map((failure) => (
              <p key={failure.schedule} className="mt-2 text-sm text-red-100">
                {failure.schedule}: {failure.message} Balance Sheet {failure.balanceSheetAmount.toLocaleString()} vs schedule {failure.scheduleAmount.toLocaleString()}.
              </p>
            ))}
          </div>
        )}

        <div className="mt-6 grid gap-6">
          {(payload.schedules || []).map((schedule) => (
            <article key={schedule.name} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">{schedule.name}</h2>
                  <p className="mt-1 text-sm text-slate-300">{schedule.sourceReportName}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-black">Rows: {schedule.rowCount}</p>
                  <p className="text-slate-300">Total: {schedule.totalAmount === undefined ? "-" : schedule.totalAmount.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Raw Data</p>
                  <JsonBlock value={schedule.rawData} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Normalized Data</p>
                  <JsonBlock value={schedule.normalizedData} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">PDF Payload</p>
                  <JsonBlock value={schedule.pdfPayload} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
