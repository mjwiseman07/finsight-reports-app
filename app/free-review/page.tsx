"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdvisacorLogo } from "../../components/AdvisacorLogo";

const requiredReports = ["Balance Sheet", "Income Statement"];
const optionalReports = ["AR Aging", "AP Aging", "Payroll", "Inventory"];

const unlockedPackages = [
  {
    name: "Essential",
    body: "Unlock recurring monthly packages, AP/AR review, payroll/FTE intelligence, reserve exposure, and month-over-month operational commentary.",
  },
  {
    name: "Professional",
    body: "Add controller-grade inventory, fixed asset, debt, liquidity, working capital, close review, and quarter-over-quarter operational intelligence.",
  },
  {
    name: "Virtual CFO",
    body: "Unlock forecasting, budgeting, treasury, oversight review, manufacturing intelligence, executive recommendations, board commentary, and automated delivery.",
  },
];

export default function FreeReviewPage() {
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [generated, setGenerated] = useState(false);

  const requiredComplete = requiredReports.every((report) => files[report]);
  const uploadedOptionalCount = optionalReports.filter((report) => files[report]).length;

  const reportReadiness = useMemo(() => {
    if (!requiredComplete) return "Upload the Balance Sheet and Income Statement to generate your free review.";
    if (uploadedOptionalCount === 0) return "Core review ready. Optional reports will make the sample more specific.";
    return `Core review ready with ${uploadedOptionalCount} optional report${uploadedOptionalCount === 1 ? "" : "s"} included.`;
  }, [requiredComplete, uploadedOptionalCount]);

  const handleFileChange = (report: string, fileList: FileList | null) => {
    setFiles((current) => ({ ...current, [report]: fileList?.[0] || null }));
    setGenerated(false);
  };

  const generateReview = () => {
    if (!email || !requiredComplete) return;
    setGenerated(true);
  };

  return (
    <main className="min-h-screen bg-[#F5F7FA] text-[#111827]">
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="block w-[min(620px,58vw)]">
            <AdvisacorLogo priority className="w-full" />
          </Link>
          <Link href="/signin" className="rounded-full px-4 py-2 text-sm font-bold text-[#111827] hover:bg-slate-100">
            Sign In
          </Link>
        </nav>
      </header>

      <section className="bg-[#0A1020] px-6 py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Free Product-Led Review</p>
            <h1 className="mt-4 text-5xl font-black leading-[1.02] tracking-[-0.05em] md:text-7xl">
              Generate My Free Financial Review
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Upload your Balance Sheet and Income Statement to see how Advisacor turns accounting reports into executive summaries, KPIs, dashboard insights, and sample AI commentary.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "One company",
                "One reporting period",
                "One package generation",
                "Watermarked limited output",
                "Limited pages",
                "Limited AI interaction",
              ].map((limit) => (
                <p key={limit} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-slate-200">
                  {limit}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white p-6 text-[#111827] shadow-2xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#1E6BFF]">Step 1</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] text-[#0A1020]">Upload reports and capture delivery email</h2>
            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-black text-[#0A1020]">Email required before generation</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#FF7A1A]"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-black text-[#0A1020]">Company name</span>
                <input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Company name"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#FF7A1A]"
                />
              </label>
            </div>

            <div className="mt-6 grid gap-4">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Required Reports</p>
              {requiredReports.map((report) => (
                <ReportUploadRow key={report} report={report} required file={files[report]} onChange={handleFileChange} />
              ))}
              <p className="pt-3 text-sm font-black uppercase tracking-[0.16em] text-slate-500">Optional Reports</p>
              {optionalReports.map((report) => (
                <ReportUploadRow key={report} report={report} file={files[report]} onChange={handleFileChange} />
              ))}
            </div>

            <p className="mt-5 rounded-2xl bg-[#F5F7FA] px-4 py-3 text-sm font-bold text-[#6B7280]">{reportReadiness}</p>
            <button
              type="button"
              onClick={generateReview}
              disabled={!email || !requiredComplete}
              className="premium-button mt-5 w-full rounded-2xl px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Generate My Free Financial Review
            </button>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="enterprise-card rounded-[2rem] p-7">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FF7A1A]">Free Sample Output</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-[#0A1020]">
                What your free review includes
              </h2>
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                {[
                  "Sample Executive Summary",
                  "Sample KPI Review",
                  "Sample Financial Dashboard",
                  "Limited PDF Package",
                  "Limited PowerPoint Preview",
                  "AI Commentary Sample",
                ].map((item) => (
                  <div key={item} className="rounded-3xl border border-slate-200 bg-white p-5">
                    <p className="text-sm font-black text-[#0A1020]">{item}</p>
                    <p className="mt-2 text-sm leading-6 text-[#6B7280]">Watermarked preview designed to demonstrate quality without replacing the paid product.</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] bg-[#0A1020] p-7 text-white shadow-2xl">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Preview Status</p>
              {!generated ? (
                <>
                  <h2 className="mt-3 text-3xl font-black">Your sample review will appear here.</h2>
                  <p className="mt-4 leading-7 text-slate-300">
                    After generation, Advisacor will show a limited executive summary, KPI dashboard preview, and upgrade path.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mt-3 text-3xl font-black">{companyName || "Your Company"} Free Executive Review</h2>
                  <div className="mt-6 grid gap-4">
                    <PreviewCard title="Sample Executive Summary" body="Revenue, profit, cash, and working capital trends are converted into an owner-ready narrative with review-oriented language." />
                    <PreviewCard title="Sample KPI Dashboard" body="Preview cards show revenue trend, cash position, AR collections, payroll trend, top risk, and top opportunity." />
                    <PreviewCard title="AI Commentary Sample" body="Advisacor explains what changed and what to review next, while advanced forecasting, budgeting, oversight, and automation remain paid features." />
                  </div>
                </>
              )}
            </div>
          </div>

          {generated && (
            <div className="mt-10 rounded-[2rem] border border-[#FF7A1A]/30 bg-[#FF7A1A]/10 p-7">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FF7A1A]">Upgrade To Continue</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-[#0A1020]">
                Your free review is complete. Unlock recurring intelligence.
              </h2>
              <p className="mt-4 max-w-4xl leading-7 text-[#6B7280]">
                Additional reports, recurring packages, automated delivery, full PDF generation, PowerPoint generation, AI assistant access, forecasting, budgeting, and oversight review require a paid subscription.
              </p>
              <div className="mt-7 grid gap-5 lg:grid-cols-3">
                {unlockedPackages.map((tier) => (
                  <div key={tier.name} className="rounded-3xl border border-slate-200 bg-white p-6">
                    <h3 className="text-2xl font-black text-[#0A1020]">{tier.name}</h3>
                    <p className="mt-3 min-h-28 leading-7 text-[#6B7280]">{tier.body}</p>
                    <Link href="/signup" className="premium-button mt-5 inline-flex rounded-2xl px-5 py-3 text-sm font-black text-white">
                      Choose {tier.name}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ReportUploadRow({
  report,
  required = false,
  file,
  onChange,
}: {
  report: string;
  required?: boolean;
  file?: File | null;
  onChange: (report: string, files: FileList | null) => void;
}) {
  return (
    <label className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-[#F5F7FA] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-black text-[#0A1020]">{report}</p>
        <p className="mt-1 text-xs font-bold text-[#6B7280]">{required ? "Required for free review" : "Optional, improves the sample"}</p>
      </div>
      <div className="flex items-center gap-3">
        {file && <span className="max-w-40 truncate text-xs font-bold text-[#3BB273]">{file.name}</span>}
        <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#0A1020] ring-1 ring-slate-200">Upload</span>
      </div>
      <input type="file" accept=".csv,.xlsx,.xls,.pdf" className="sr-only" onChange={(event) => onChange(report, event.target.files)} />
    </label>
  );
}

function PreviewCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-5">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}
