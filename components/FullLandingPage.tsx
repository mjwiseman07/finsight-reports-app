"use client";

import Link from "next/link";
import { useState } from "react";
import { AdvisacorLogo } from "../components/AdvisacorLogo";

const platformCards = [
  {
    title: "AP Intelligence",
    body: "Monitor vendor obligations, payment timing, accrual exposure, and cash flow pressure before liabilities disrupt working capital planning.",
  },
  {
    title: "AR Visibility",
    body: "Unify receivables aging, collection timing, reserve exposure, and customer concentration into a clear cash conversion view.",
  },
  {
    title: "Payroll & Workforce Analytics",
    body: "Connect payroll movement, FTE changes, productivity, revenue per FTE, and staffing scalability into one operational finance signal.",
  },
  {
    title: "AI Advisory Insights",
    body: "Turn close data into review-oriented commentary, management focus areas, and executive-ready recommendations scoped to each package.",
  },
  {
    title: "Forecasting & Predictive Analytics",
    body: "Support leadership with liquidity outlooks, revenue timing, workforce assumptions, and forecast updates built from operational drivers.",
  },
  {
    title: "Executive Dashboards",
    body: "Give owners, boards, and CFO teams a premium financial command center for KPIs, risks, forecasts, and operating performance.",
  },
];

const packages = [
  {
    name: "Essentials",
    summary: "Monthly financial intelligence for bookkeeping and operational review teams.",
    analytics: ["MoM operational review", "AP/AR visibility", "Payroll and FTE analytics", "Reserve exposure"],
    ai: ["Workflow assistance", "Bookkeeping operations commentary", "Variance explanations"],
    workflow: ["Guided import", "Validation center", "Executive package generation"],
    detail:
      "Essentials gives teams a clean monthly review workflow for core close packages, AP/AR visibility, payroll/FTE commentary, reserve exposure, and operational variance explanations. Integrations focus on QuickBooks exports, CSV, Excel, and ERP report uploads.",
  },
  {
    name: "Professional",
    summary: "Controller-grade operational analytics for growing advisory and finance teams.",
    analytics: ["Inventory intelligence", "Liquidity review", "Fixed asset review", "Working capital trends"],
    ai: ["Operational finance Q&A", "Reconciliation guidance", "QoQ commentary"],
    workflow: ["Advanced schedules", "PowerPoint generation", "Client-ready review workflow"],
    featured: true,
    detail:
      "Professional expands Advisacor into controller-level operational finance. Teams receive inventory, debt, liquidity, fixed asset, working capital, and quarter-over-quarter analytics with richer reporting workflows and board-ready presentation automation.",
  },
  {
    name: "Enterprise",
    summary: "Virtual CFO intelligence, forecasting, oversight review, and executive delivery automation.",
    analytics: ["Forecast intelligence", "Treasury review", "Close management", "Manufacturing and operations"],
    ai: ["Executive AI assistant", "Board preparation", "Strategic recommendations"],
    workflow: ["Executive Workspace", "Automated delivery", "Forecast and KPI refresh"],
    detail:
      "Enterprise is built for fractional CFO teams, boards, and finance leadership. It combines forecasting, treasury, budgeting, oversight review, close intelligence, manufacturing variance review, executive recommendations, and automated delivery of PDF, PowerPoint, KPI, and forecast updates.",
  },
];

const whyItems = [
  "Generate a board-ready financial package from accounting reports without scheduling a sales call.",
  "Experience executive summaries, KPI review, dashboard previews, and AI commentary before choosing a package.",
  "Scale advisory services with product-led workflows that turn uploads into polished executive outputs.",
  "Unlock deeper intelligence only when the business needs recurring reporting, forecasting, budgeting, and oversight.",
  "Keep preparer review internal while delivering owner-ready explanations and executive visibility.",
];

const educationVideos = [
  ["Executive Package Generation", "See how uploaded reports become a limited executive review in minutes."],
  ["Payroll & FTE Intelligence", "Watch payroll movement, staffing trends, and revenue per FTE become advisory commentary."],
  ["Financial Oversight Review", "Preview close-quality, stale balance, reserve, and accrual review workflows."],
  ["Forecasting & Budgeting", "See how Virtual CFO users extend actuals into forecasts, budgets, and liquidity planning."],
  ["Executive Workspace", "Preview owner-friendly dashboards, weekly snapshots, action items, and financial trends."],
  ["Fractional CFO Workflows", "See how advisory teams prepare board-ready recommendations and recurring delivery."],
];

function DashboardPreview() {
  const liquidityForecast = [
    { week: "W1", cash: 1.28, collections: 0.42, payments: 0.31 },
    { week: "W2", cash: 1.34, collections: 0.48, payments: 0.36 },
    { week: "W3", cash: 1.46, collections: 0.51, payments: 0.32 },
    { week: "W4", cash: 1.52, collections: 0.44, payments: 0.38 },
    { week: "W5", cash: 1.43, collections: 0.39, payments: 0.47 },
    { week: "W6", cash: 1.57, collections: 0.55, payments: 0.34 },
    { week: "W7", cash: 1.63, collections: 0.49, payments: 0.41 },
  ];
  const maxCash = Math.max(...liquidityForecast.map((point) => point.cash));
  const chartPoints = liquidityForecast
    .map((point, index) => {
      const x = 34 + index * 58;
      const y = 134 - (point.cash / maxCash) * 86;
      return `${x},${y}`;
    })
    .join(" ");
  const forecastAreaPath = `M ${chartPoints.replaceAll(" ", " L ")} L 382 142 L 34 142 Z`;

  return (
    <div className="dark-enterprise-card relative overflow-hidden rounded-[2rem] p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(30,107,255,0.22),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(255,122,26,0.16),transparent_28%)]" />
      <div className="relative">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFB36F]">Executive Workspace</p>
            <p className="mt-1 text-xl font-black text-white">Financial Intelligence Command Center</p>
          </div>
          <span className="rounded-full bg-[#3BB273]/15 px-3 py-1 text-xs font-black text-[#B9F4D2]">Live</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            ["Revenue", "$1.82M", "+12.4%"],
            ["Runway", "21 wks", "stable"],
            ["AR 90+", "$48K", "review"],
            ["Margin", "34.6%", "+2.1 pts"],
          ].map(([label, value, tag]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
              <p className="mt-3 text-2xl font-black text-white">{value}</p>
              <p className="mt-2 text-xs font-bold text-[#FFB36F]">{tag}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-2xl border border-white/10 bg-[#070B16]/80 p-5">
            <div className="flex items-center justify-between">
              <p className="font-black text-white">Liquidity Forecast</p>
              <p className="text-xs font-bold text-slate-500">13-week view</p>
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-[#050915] p-4 shadow-inner shadow-black/30">
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#060A12] p-4" aria-label="Sample liquidity forecast chart">
                <svg viewBox="0 0 420 178" className="h-56 w-full" preserveAspectRatio="none" role="img">
                  <rect x="267" y="18" width="116" height="124" fill="#D78342" opacity="0.07" />
                  <text x="326" y="28" textAnchor="middle" fill="#94A3B8" fontSize="8" fontWeight="700" letterSpacing="1.2">
                    FORECAST
                  </text>
                  {[36, 64, 92, 120, 148].map((y) => (
                    <line key={y} x1="34" x2="382" y1={y} y2={y} stroke="rgba(148,163,184,0.16)" strokeWidth="0.8" />
                  ))}
                  <line x1="34" x2="382" y1="142" y2="142" stroke="rgba(148,163,184,0.3)" strokeWidth="1" />
                  <path d={forecastAreaPath} fill="#C8A46A" opacity="0.08" />
                  <polyline
                    points={chartPoints}
                    fill="none"
                    stroke="#C8A46A"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points="34,130 92,124 150,116 208,111 266,103 324,94 382,88"
                    fill="none"
                    stroke="rgba(148,163,184,0.45)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="5 7"
                  />
                  {liquidityForecast.map((point, index) => {
                    const x = 34 + index * 58;
                    const y = 134 - (point.cash / maxCash) * 86;
                    return <circle key={point.week} cx={x} cy={y} r="2.8" fill="#060A12" stroke="#C8A46A" strokeWidth="1.4" />;
                  })}
                  <text x="34" y="22" fill="#CBD5E1" fontSize="9" fontWeight="800" letterSpacing="1">CASH BALANCE ($M)</text>
                  <text x="348" y="44" fill="#D78342" fontSize="9" fontWeight="900">+18.6%</text>
                  {liquidityForecast.map((point, index) => (
                    <text key={point.week} x={34 + index * 58} y="166" textAnchor="middle" fill="#64748B" fontSize="9" fontWeight="800">
                      {point.week}
                    </text>
                  ))}
                </svg>
              </div>
              <div className="mt-3 grid gap-2 text-xs font-bold text-slate-400 sm:grid-cols-3">
                <span><span className="text-[#C8A46A]">●</span> Treasury cash forecast</span>
                <span><span className="text-slate-500">●</span> Baseline scenario</span>
                <span className="text-[#FFB36F]">Ending cash: $1.63M</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {[
              ["AI Recommendation", "Review inventory expansion before approving hiring plan."],
              ["AP/AR Signal", "Collections improved while AP timing remains concentrated."],
              ["Workforce Insight", "Revenue per FTE improved despite payroll growth."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#FFB36F]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [selectedPackage, setSelectedPackage] = useState<(typeof packages)[number] | null>(null);

  const openPackagePdf = () => {
    if (!selectedPackage) return;
    const popup = window.open("", "_blank", "width=900,height=1100");
    if (!popup) return;
    popup.document.write(`
      <html>
        <head>
          <title>${selectedPackage.name} Package</title>
          <style>
            body { font-family: Inter, Arial, sans-serif; margin: 48px; color: #111827; }
            .brand { color: #0A1020; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; }
            h1 { font-size: 42px; color: #0A1020; margin: 16px 0; }
            h2 { color: #0A1020; margin-top: 28px; }
            li { margin: 10px 0; color: #374151; }
            .accent { color: #FF7A1A; font-weight: 800; }
            .box { border: 1px solid #E5E7EB; border-radius: 20px; padding: 24px; margin-top: 24px; }
          </style>
        </head>
        <body>
          <p class="brand">Advisacor Financial Intelligence</p>
          <h1>${selectedPackage.name} Package Breakdown</h1>
          <p>${selectedPackage.detail}</p>
          <div class="box"><h2>Included Analytics</h2><ul>${selectedPackage.analytics.map((item) => `<li>${item}</li>`).join("")}</ul></div>
          <div class="box"><h2>Included AI Capabilities</h2><ul>${selectedPackage.ai.map((item) => `<li>${item}</li>`).join("")}</ul></div>
          <div class="box"><h2>Workflow Features</h2><ul>${selectedPackage.workflow.map((item) => `<li>${item}</li>`).join("")}</ul></div>
          <p class="accent">Integrations: CSV, Excel, ERP exports, QuickBooks exports, and future connected ERP sync.</p>
          <script>window.print()</script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  return (
    <main className="min-h-screen bg-[#F5F7FA] text-[#111827]">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="block w-[min(525px,46.5vw)] px-0 py-0">
            <AdvisacorLogo priority className="w-full" />
          </Link>
          <div className="hidden items-center gap-8 text-sm font-bold text-[#6B7280] md:flex">
            <a href="#platform" className="hover:text-[#111827]">Platform</a>
            <a href="#packages" className="hover:text-[#111827]">Packages</a>
            <a href="#why" className="hover:text-[#111827]">Why Advisacor</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/signin" className="hidden rounded-full px-4 py-2 text-sm font-bold text-[#111827] hover:bg-slate-100 sm:inline-flex">
              Login
            </Link>
            <Link href="/free-review" className="premium-button rounded-full px-5 py-2.5 text-sm font-black text-white">
              Generate My Free Financial Review
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative isolate overflow-hidden bg-[#0A1020] px-6 py-20 text-white md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(30,107,255,0.2),transparent_30%),radial-gradient(circle_at_88%_14%,rgba(255,122,26,0.12),transparent_28%),linear-gradient(180deg,#0A1020_0%,#0D1426_100%)]" />
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
          <div className="max-w-3xl pb-8">
            <p className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Product-Led Financial Intelligence</p>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.08] tracking-[-0.045em] text-white md:text-6xl lg:text-5xl xl:text-6xl 2xl:text-7xl">
              Turn Accounting Data Into Executive Intelligence
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Upload your Balance Sheet and Income Statement to generate a free sample executive review. The product becomes the demo, so you can see the quality before talking to anyone.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/free-review" className="premium-button rounded-2xl px-6 py-4 text-center text-sm font-black text-white">
                Generate My Free Financial Review
              </Link>
              <a href="#videos" className="rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-4 text-center text-sm font-black text-white backdrop-blur transition hover:bg-white/[0.1]">
                Watch Advisacor In Action
              </a>
              <Link href="/upload" className="rounded-2xl border border-white/15 px-6 py-4 text-center text-sm font-black text-white/80 transition hover:bg-white/[0.06]">
                See Your Financials Through Advisacor
              </Link>
            </div>
          </div>
          <div className="min-w-0">
            <DashboardPreview />
          </div>
        </div>
      </section>

      <section id="platform" className="relative z-0 bg-[#F5F7FA] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#1E6BFF]">Free Review Funnel</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[#0A1020] md:text-6xl">
              Upload reports. Generate value. Upgrade when you are ready.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-6">
            {["Visitor", "Upload Reports", "Generate Free Review", "Experience Value", "See Upgrade Options", "Subscribe"].map((step, index) => (
              <div key={step} className="enterprise-card rounded-3xl p-5">
                <p className="text-sm font-black text-[#FF7A1A]">{index + 1}</p>
                <p className="mt-2 text-sm font-black text-[#0A1020]">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {platformCards.map((card) => (
              <div key={card.title} className="enterprise-card rounded-[2rem] p-7">
                <div className="mb-8 h-12 w-12 rounded-2xl bg-[#0A1020] p-3 shadow-lg shadow-slate-900/20">
                  <div className="h-full w-full rounded-lg border-l-4 border-t-4 border-[#FF7A1A]" />
                </div>
                <h3 className="text-2xl font-black tracking-[-0.025em] text-[#0A1020]">{card.title}</h3>
                <p className="mt-4 leading-7 text-[#6B7280]">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="packages" className="bg-[#0A1020] px-6 py-24 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Packages</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] md:text-6xl">
              Intelligence levels for every finance operating model.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {packages.map((tier) => (
              <div key={tier.name} className={`rounded-[2rem] border p-7 ${tier.featured ? "border-[#FF7A1A]/60 bg-white/[0.08]" : "border-white/10 bg-white/[0.045]"}`}>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#FFB36F]">{tier.name}</p>
                <p className="mt-4 min-h-16 text-sm leading-6 text-slate-300">{tier.summary}</p>
                <div className="mt-6 space-y-5">
                  {[
                    ["Included analytics", tier.analytics],
                    ["AI capabilities", tier.ai],
                    ["Workflow features", tier.workflow],
                  ].map(([title, items]) => (
                    <div key={title as string}>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{title as string}</p>
                      <ul className="mt-2 space-y-2 text-sm text-slate-200">
                        {(items as string[]).map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#FF7A1A]" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <Link href="/free-review" className="premium-button rounded-2xl px-4 py-3 text-center text-sm font-black text-white">
                    Generate Free Review
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedPackage(tier)}
                    className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
                  >
                    Learn More
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#1E6BFF]">Why Advisacor</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[#0A1020] md:text-6xl">
              Executive visibility without operational noise.
            </h2>
          </div>
          <div className="grid gap-4">
            {whyItems.map((item, index) => (
              <div key={item} className="enterprise-card flex gap-5 rounded-[1.75rem] p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0A1020] text-sm font-black text-[#FFB36F]">
                  {index + 1}
                </span>
                <p className="text-lg leading-8 text-[#374151]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="videos" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FF7A1A]">Watch Advisacor In Action</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[#0A1020] md:text-6xl">
              Short product videos instead of demo-first selling.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#6B7280]">
              Learn the platform in 1-3 minute visual walkthroughs, then generate your own free financial review.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {educationVideos.map(([title, body], index) => (
              <div key={title} className="enterprise-card rounded-[2rem] p-6">
                <div className="flex h-44 items-center justify-center rounded-3xl bg-[#0A1020] text-white">
                  <div className="text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FF7A1A] text-xl font-black">▶</div>
                    <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[#FFB36F]">Video {index + 1}</p>
                  </div>
                </div>
                <h3 className="mt-5 text-xl font-black text-[#0A1020]">{title}</h3>
                <p className="mt-3 leading-7 text-[#6B7280]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="advisacor-dark-grid mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[#0A1020] p-10 text-white shadow-2xl shadow-slate-950/30 md:p-14">
          <div className="max-w-3xl">
            <AdvisacorLogo className="mb-8 w-[230px]" />
            <h2 className="text-4xl font-black tracking-[-0.04em] md:text-6xl">
              Build the financial intelligence layer your leadership team deserves.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Bring forecasting, operational analytics, executive reporting, and AI-assisted advisory workflows into one premium enterprise platform.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/free-review" className="premium-button rounded-2xl px-6 py-4 text-center text-sm font-black text-white">
                Generate My Free Financial Review
              </Link>
              <a href="#videos" className="rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-4 text-center text-sm font-black text-white">
                Watch Advisacor In Action
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <AdvisacorLogo className="w-[190px]" />
          <p className="text-sm font-semibold text-[#6B7280]">Wiseman Financial Technologies LLC</p>
        </div>
      </footer>

      {selectedPackage && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0A1020]/80 px-4 py-8 backdrop-blur-xl">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between">
              <div>
                <AdvisacorLogo className="mb-6 w-[220px]" />
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#1E6BFF]">Package Breakdown</p>
                <h3 className="mt-3 text-4xl font-black tracking-[-0.04em] text-[#0A1020]">{selectedPackage.name}</h3>
                <p className="mt-4 max-w-2xl leading-7 text-[#6B7280]">{selectedPackage.detail}</p>
              </div>
              <button type="button" onClick={() => setSelectedPackage(null)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-[#111827]">
                Close
              </button>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {[
                ["Analytics", selectedPackage.analytics],
                ["AI Capabilities", selectedPackage.ai],
                ["Workflow", selectedPackage.workflow],
              ].map(([title, items]) => (
                <div key={title as string} className="rounded-3xl border border-slate-200 bg-[#F5F7FA] p-5">
                  <p className="text-sm font-black text-[#0A1020]">{title as string}</p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-[#6B7280]">
                    {(items as string[]).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-3xl border border-[#FF7A1A]/20 bg-[#FF7A1A]/10 p-5">
              <p className="font-black text-[#0A1020]">Integrations and reporting</p>
              <p className="mt-2 leading-7 text-[#6B7280]">
                Supports CSV, Excel, ERP exports, QuickBooks exports, report validation, AI review, PDF packages, PowerPoint presentations, executive dashboards, and future connected ERP sync.
              </p>
            </div>
            <button type="button" onClick={openPackagePdf} className="premium-button mt-6 rounded-2xl px-6 py-4 text-sm font-black text-white">
              Download PDF
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
