"use client";

import { useEffect, useState } from "react";

type AvailabilityRow = {
  provider: string;
  companyId?: string | null;
  selectedPeriod?: { startDate?: string; endDate?: string } | null;
  reportName: string;
  attemptedEndpoint: string;
  status: "available" | "unavailable" | "failed" | "not_available";
  rowCount: number;
  totalAmount?: number;
  errorMessage?: string | null;
  required?: boolean;
};

export default function ReportAvailabilityPage() {
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [message, setMessage] = useState("Loading report availability...");

  useEffect(() => {
    const load = async () => {
      try {
        const token = window.localStorage.getItem("supabase_access_token") || "";
        const payload = JSON.parse(window.localStorage.getItem("advisacor_active_report_payload") || "{}");
        const params = new URLSearchParams();
        if (payload.companyId) params.set("companyId", payload.companyId);
        if (payload.connectionId) params.set("connectionId", payload.connectionId);
        if (payload.sourceSystem) params.set("sourceSystem", payload.sourceSystem);
        if (payload.leadId) params.set("leadId", payload.leadId);
        const response = await fetch(`/api/accounting/report-availability?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load report availability.");
        setRows(result.reports || []);
        setMessage(`${result.provider || "Accounting"} report availability for ${result.selectedPeriod?.startDate || "selected period"} to ${result.selectedPeriod?.endDate || "selected period"}`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load report availability.");
      }
    };
    void load();
  }, []);

  return (
    <main className="min-h-screen bg-[#07111F] px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-200">Developer</p>
        <h1 className="mt-3 text-3xl font-black">Report Availability</h1>
        <p className="mt-2 text-sm font-semibold text-slate-300">{message}</p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.2em] text-slate-300">
              <tr>
                <th className="px-4 py-3">Report</th>
                <th className="px-4 py-3">Endpoint</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Rows</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Error / Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.reportName}-${row.attemptedEndpoint}`} className="border-t border-white/10">
                  <td className="px-4 py-3 font-bold">{row.reportName}{row.required ? " *" : ""}</td>
                  <td className="px-4 py-3 text-slate-300">{row.attemptedEndpoint}</td>
                  <td className="px-4 py-3 font-black">{row.status}</td>
                  <td className="px-4 py-3">{row.rowCount}</td>
                  <td className="px-4 py-3">{row.totalAmount === undefined ? "-" : row.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-300">{row.errorMessage || "-"}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-300">No report availability data found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
