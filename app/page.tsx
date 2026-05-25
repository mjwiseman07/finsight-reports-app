"use client";

import { useEffect, useState } from "react";

const workflowSteps = [
  {
    step: "01",
    title: "Import the reporting packet",
    body: "Bring in P&L, balance sheet, aging, payroll, budget, debt, and GL files from the client close process.",
  },
  {
    step: "02",
    title: "Review financial intelligence",
    body: "FinSight organizes KPIs, ratios, variance drivers, aging risk, payroll movement, and watch items for advisor review.",
  },
  {
    step: "03",
    title: "Generate client-ready outputs",
    body: "Produce a polished PDF package and board-style PowerPoint deck with consistent branding and advisory commentary.",
  },
];

const packageTiers = [
  {
    name: "Essential",
    price: "$99/mo",
    description: "For streamlined monthly close packages and core KPI reporting.",
    features: [
      "Executive summary",
      "6 key financial ratios with specific advice",
      "Month-over-month flux analysis",
      "PDF package export",
    ],
  },
  {
    name: "Professional",
    price: "$199/mo",
    description: "For advisory teams adding deeper client analysis and better review workflows.",
    features: [
      "Everything in Essential",
      "15+ financial ratios",
      "Payroll and FTE analysis by department",
      "Month, quarter, and year-over-year flux",
      "PDF and PowerPoint export",
    ],
    featured: true,
  },
  {
    name: "Virtual CFO",
    price: "$499/mo",
    description: "For premium client packages, variance analysis, and CFO-level board reporting.",
    features: [
      "Everything in Professional",
      "Budget vs. actual analysis",
      "Debt schedule and fixed asset analysis",
      "Board snapshot and executive summary",
      "White-label branding",
      "Bulk multi-client import",
    ],
  },
];

const insightCards = [
  "Revenue, margin, and EBITDA trend explanation",
  "AR/AP aging risk and working capital commentary",
  "Payroll cost, FTE movement, and department drivers",
  "Flux variance narratives tied to GL activity",
];

const dashboardMetrics = [
  { label: "Revenue", value: "$842K", trend: "+12.4%" },
  { label: "Gross Margin", value: "43.8%", trend: "+3.1 pts" },
  { label: "Cash", value: "$216K", trend: "stable" },
  { label: "AR 90+", value: "$18K", trend: "watch" },
];

const featureCards = [
  {
    title: "3-Period Flux Analysis",
    description:
      "Analyze month-over-month, quarter-over-quarter, and year-over-year movement in one workflow. AI helps name the likely drivers behind changes so advisors can move from variance detection to client-ready explanation.",
    color: "bg-blue-500",
    className: "md:col-span-2 bg-gradient-to-br from-blue-500/20 to-sky-400/5",
  },
  {
    title: "Payroll & FTE Analysis",
    description:
      "Compare payroll cost, FTE movement, and department-level staffing trends. Quickly explain what changed and where labor costs need attention.",
    color: "bg-emerald-500",
  },
  {
    title: "15+ Financial Ratios",
    description:
      "Calculate liquidity, profitability, leverage, payroll, and working capital ratios automatically. Give every client a sharper financial scorecard.",
    color: "bg-purple-500",
  },
  {
    title: "Board Presentation",
    description:
      "Turn approved reporting sections into a branded board-style PowerPoint. Keep the story consistent from the PDF package to the client meeting.",
    color: "bg-orange-500",
  },
  {
    title: "AR & AP Aging",
    description:
      "Highlight receivable risk, payable timing, and working capital pressure. Surface collection and vendor follow-up items before they become surprises.",
    color: "bg-blue-500",
  },
  {
    title: "Bulk Client Import",
    description:
      "Move faster at month-end by importing the full reporting packet together. Reduce manual file handling and standardize package setup.",
    color: "bg-emerald-500",
  },
];

const problemItems = [
  "Hours copying data between spreadsheets and reports",
  "Generic reports that do not explain what changed",
  "Clients see you as a bookkeeper instead of an advisor",
  "Month-end work does not scale across the client base",
];

const solutionItems = [
  "Upload and generate the client package in minutes",
  "AI explains every important variance and watch item",
  "Board-ready PDFs and presentations with firm branding",
  "Handle 50 clients at month-end with a repeatable workflow",
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className={`min-h-screen overflow-hidden ${darkMode ? "bg-[#07111f] text-white" : "bg-slate-50 text-slate-950"}`}>
      <header
        className={`sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/75 px-6 py-4 backdrop-blur-xl transition ${
          scrolled ? "shadow-xl shadow-black/20" : ""
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a6cf6]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 16L10 11L13 14L19 7" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 7H19V10" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-xl font-black">FinSight</span>
          </a>

          <div className="hidden items-center gap-8 text-sm font-bold text-slate-300 md:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#how-it-works" className="transition hover:text-white">How It Works</a>
            <a href="#pricing" className="transition hover:text-white">Pricing</a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={() => setDarkMode((value) => !value)}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10"
            >
              {darkMode ? "Light" : "Dark"}
            </button>
            <a href="/signup" className="rounded-full bg-[#1a6cf6] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500">
              Start Free Trial
            </a>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="rounded-xl border border-white/15 bg-white/5 p-2 md:hidden"
            aria-label="Open navigation menu"
          >
            <span className="block h-0.5 w-5 bg-white" />
            <span className="mt-1.5 block h-0.5 w-5 bg-white" />
            <span className="mt-1.5 block h-0.5 w-5 bg-white" />
          </button>
        </nav>

        {mobileOpen && (
          <div className="mx-auto mt-4 grid max-w-7xl gap-2 rounded-2xl border border-white/10 bg-[#0b1220] p-4 md:hidden">
            <a href="#features" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/5">Features</a>
            <a href="#how-it-works" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/5">How It Works</a>
            <a href="#pricing" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/5">Pricing</a>
            <a href="/signup" className="mt-2 rounded-xl bg-[#1a6cf6] px-3 py-3 text-center text-sm font-black text-white">Start Free Trial</a>
          </div>
        )}
      </header>

      <section className="relative px-6 pb-24 pt-20 md:pb-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(91,140,255,0.28),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(79,174,138,0.18),transparent_28%)]" />
        <div className="mx-auto max-w-7xl text-center">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-100">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              AI-Powered Financial Intelligence
            </p>
            <h1 className="mx-auto max-w-5xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
              CFO-Level Reports. <span className="text-[#1a6cf6]">Generated in Minutes.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              FinSight turns monthly accounting exports into premium client packages,
              CFO-level insights, and presentation-ready deliverables for advisory teams.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <a href="/signup" className="rounded-2xl bg-[#5B8CFF] px-6 py-4 text-center text-sm font-black text-white shadow-2xl shadow-blue-500/25 transition hover:bg-blue-400">
                Start Free Trial
              </a>
              <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-4 text-center text-sm font-black text-slate-100 transition hover:border-white/30 hover:bg-white/[0.08]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/40 text-[10px]">▶</span>
                See How It Works
              </a>
            </div>
            <p className="mx-auto mt-4 max-w-xl text-center text-xs leading-5 text-slate-400">
              No credit card required — includes 1 free report. A subscription is required to continue after your free report.
            </p>

            <div className="mx-auto mt-10 grid max-w-4xl gap-4 text-left md:grid-cols-3 md:divide-x md:divide-white/15">
              {[
                ["10x", "Faster than manual reporting"],
                ["15+", "Financial ratios calculated"],
                ["PDF + PPT", "Board-ready output formats"],
              ].map(([value, label]) => (
                <div key={value} className="px-5 text-center">
                  <p className="text-3xl font-black text-white">{value}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto mt-14 max-w-6xl">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-blue-500/10 blur-3xl" />
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d1728]/95 shadow-2xl shadow-black/40">
              <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-5 py-4">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-300" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-4 rounded-full bg-slate-950/70 px-4 py-1 text-xs font-semibold text-slate-400">
                  finsight.app/client-dashboard
                </span>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-4">
                {[
                  ["Revenue", "$824,000", "+12.4%"],
                  ["Net Income", "$269,900", "+18.1%"],
                  ["Net Margin", "32.8%", "+4.7 pts"],
                  ["Current Ratio", "4.15", "+0.8"],
                ].map(([label, value, change]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/55 p-5 text-left">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
                    <p className="mt-4 text-3xl font-black text-white">{value}</p>
                    <span className="mt-4 inline-flex rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-200">
                      {change}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 px-5 pb-5 lg:grid-cols-[1.25fr_0.75fr]">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-sm font-black text-slate-200">Financial intelligence summary</p>
                  <div className="mt-5 space-y-3">
                    <div className="h-3 w-11/12 rounded-full bg-blue-400/70" />
                    <div className="h-3 w-9/12 rounded-full bg-emerald-300/70" />
                    <div className="h-3 w-10/12 rounded-full bg-purple-300/70" />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-sm font-black text-slate-200">Output status</p>
                  <p className="mt-5 text-3xl font-black text-blue-200">Ready</p>
                  <p className="mt-2 text-sm text-slate-400">PDF package and PowerPoint deck generated.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-300">Workflow</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              From close files to advisory deliverables in one guided flow.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {workflowSteps.map((item) => (
              <div key={item.step} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/10">
                <p className="text-sm font-black text-blue-300">{item.step}</p>
                <h3 className="mt-5 text-2xl font-black">{item.title}</h3>
                <p className="mt-4 leading-7 text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex rounded-full border border-blue-300/20 bg-blue-400/10 px-4 py-2 text-sm font-black text-blue-200">
              The Problem
            </span>
            <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
              Your clients deserve CFO-level insights. You shouldn&apos;t have to spend hours building them.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
              <h3 className="text-2xl font-black">Without FinSight</h3>
              <ul className="mt-6 space-y-4">
                {problemItems.map((item) => (
                  <li key={item} className="flex gap-3 text-slate-300">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-sm font-black text-red-300">X</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[2rem] border border-blue-400/50 bg-blue-500/10 p-8 shadow-2xl shadow-blue-500/20">
              <h3 className="text-2xl font-black">With FinSight</h3>
              <ul className="mt-6 space-y-4">
                {solutionItems.map((item) => (
                  <li key={item} className="flex gap-3 text-slate-100">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-sm font-black text-emerald-200">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-300">Features</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Built for premium advisory deliverables.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {featureCards.map((feature) => (
              <div key={feature.title} className={`rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 ${feature.className || ""}`}>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feature.color}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 16L10 11L13 14L19 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="mt-6 text-2xl font-black">{feature.title}</h3>
                <p className="mt-4 leading-7 text-slate-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-300">Pricing</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Reporting levels for every advisory relationship.
            </h2>
          </div>
          <div className="mt-12 grid items-center gap-6 lg:grid-cols-3">
            {packageTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-[2rem] border p-8 ${
                  tier.featured
                    ? "scale-[1.03] border-blue-300/40 bg-[#1a6cf6] text-white shadow-2xl shadow-blue-500/25"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                {tier.featured && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-black text-[#1a6cf6]">
                    Most Popular
                  </span>
                )}
                <p className={`text-sm font-black uppercase tracking-[0.18em] ${tier.featured ? "text-white" : "text-blue-200"}`}>{tier.name}</p>
                <h3 className="mt-4 text-5xl font-black">{tier.price}</h3>
                <p className={`mt-4 min-h-16 leading-7 ${tier.featured ? "text-blue-50" : "text-slate-300"}`}>{tier.description}</p>
                <div className={`mt-7 h-px ${tier.featured ? "bg-white/25" : "bg-white/10"}`} />
                <ul className="mt-7 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className={`flex gap-3 text-sm font-semibold ${tier.featured ? "text-white" : "text-slate-200"}`}>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-black ${tier.featured ? "bg-white/20 text-white" : "bg-emerald-400/15 text-emerald-200"}`}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm font-semibold text-slate-400">
            All plans include 1 free report to get started. No credit card required.
          </p>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-300">AI Insights</p>
            <h2 className="mt-3 text-4xl font-black">Narratives your clients can act on.</h2>
            <p className="mt-5 leading-8 text-slate-300">
              Turn raw accounting reports into concise commentary that explains what changed,
              why it matters, and where management should focus next.
            </p>
            <div className="mt-8 grid gap-3">
              {insightCards.map((card) => (
                <div key={card} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm font-bold text-slate-200">
                  {card}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#172033] to-[#0b1220] p-8">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-300">Automation</p>
            <h2 className="mt-3 text-4xl font-black">Client-ready PDF and PowerPoint outputs.</h2>
            <p className="mt-5 leading-8 text-slate-300">
              Generate polished PDF packages and board-style presentation decks from the same
              approved selections, keeping every deliverable consistent and on brand.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-950/60 p-5">
                <p className="text-3xl font-black">PDF</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Executive reports, dashboards, ratios, variance analysis, and follow-ups.</p>
              </div>
              <div className="rounded-2xl bg-slate-950/60 p-5">
                <p className="text-3xl font-black">PPT</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Board-ready slides with advisory summaries and branded cover pages.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-8 rounded-[2rem] bg-gradient-to-r from-[#1a6cf6] to-[#4f46e5] p-8 shadow-2xl shadow-blue-500/20 md:grid-cols-[1fr_auto] md:p-12">
          <div>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              Ready to stop building reports manually?
            </h2>
            <p className="mt-5 max-w-2xl leading-8 text-blue-50">
              Give your firm a premium reporting workflow for monthly close, advisory reviews,
              and Virtual CFO deliverables.
            </p>
          </div>
          <div className="text-left md:text-center">
            <a href="/signup" className="inline-flex rounded-2xl bg-white px-7 py-4 text-sm font-black text-[#1a6cf6] transition hover:bg-blue-50">
              Start Free Trial
            </a>
            <p className="mt-3 text-sm font-semibold text-blue-100">
              No credit card required · 14-day free trial
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}