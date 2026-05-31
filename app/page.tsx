"use client";

import Link from "next/link";
import { useState } from "react";
import { AdvisacorLogo } from "../components/AdvisacorLogo";
import FullLandingPage from "../components/FullLandingPage";

const features = [
  {
    title: "Executive Package Generation",
    description: "Turn accounting data into board-ready PDF financial packages, PowerPoint executive packages, executive summaries, dashboards, and AI-assisted commentary.",
  },
  {
    title: "Product-Led Free Review",
    description: "Upload Balance Sheet, Income Statement, AR Aging, AP Aging, or Inventory reports to generate a free sample executive review without a demo.",
  },
  {
    title: "Business Owner Weekly Briefs",
    description: "Give owners weekly financial awareness with business health, cash, revenue, profitability, payroll, collections, top risk, and top opportunity.",
  },
  {
    title: "Ask Advisacor AI Assistant",
    description: "Let leaders ask secure questions about profit changes, cash health, hiring capacity, and what to focus on this week.",
  },
  {
    title: "Advisory Firm Workflows",
    description: "Help accounting firms scale advisory services with client health status, package tracking, review queues, delivery status, and multi-client workflows.",
  },
  {
    title: "Industry Intelligence",
    description: "Adapt KPIs and commentary for healthcare, manufacturing, construction, wholesale distribution, professional services, and more.",
  },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ComingSoonPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string }>({});

  const validateForm = () => {
    const nextErrors: { name?: string; email?: string } = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) nextErrors.name = "Name is required.";
    if (!trimmedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!emailPattern.test(trimmedEmail)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setSubmitted(false);
    setFormError("");

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      if (!response.ok) {
        throw new Error("Early access submission failed.");
      }

      setSubmitted(true);
      setName("");
      setEmail("");
      setFieldErrors({});
    } catch {
      setFormError("Something went wrong. Please try again or email sales@advisacor.com.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F7FA] text-[#111827]">
      {/* This is a temporary public Coming Soon page. Full landing page preserved at /landing-preview. */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6">
          <Link href="/" className="block w-[min(525px,46.5vw)] px-0 py-0">
            <AdvisacorLogo priority className="w-full" />
          </Link>
          <div className="hidden items-center gap-8 text-sm font-bold text-[#6B7280] lg:flex">
            <a href="#about" className="transition hover:text-[#111827]">About</a>
            <a href="#platform-preview" className="transition hover:text-[#111827]">Platform Preview</a>
            <a href="#contact" className="transition hover:text-[#111827]">Contact</a>
            <a href="#early-access" className="premium-button rounded-full px-5 py-2.5 text-white">
              Join Early Access
            </a>
          </div>
        </nav>
      </header>

      <section className="relative isolate overflow-hidden bg-[#0A1020] px-6 py-16 text-white md:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(30,107,255,0.22),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(255,122,26,0.14),transparent_30%)]" />
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-[#FF7A1A]/30 bg-[#FF7A1A]/10 px-5 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#FFB36F]">
              Coming Soon
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.055em] md:text-6xl xl:text-7xl">
              AI-Assisted Financial Intelligence
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Turn accounting data into executive intelligence. Advisacor generates board-ready financial packages, owner weekly briefs, AI-assisted commentary, and industry-aware dashboards for modern finance teams and advisory firms.
            </p>
            <p className="mt-5 max-w-2xl leading-7 text-slate-400">
              From upload to first executive package in under 15 minutes: manual upload creates a fast sample review, while connected accounting unlocks QuickBooks, Xero, NetSuite, Sage, Microsoft Dynamics, recurring packages, forecasting, budgeting, and Ask Advisacor.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="#early-access" className="premium-button rounded-2xl px-6 py-4 text-center text-sm font-black text-white">
                Join Early Access
              </a>
              <a href="#contact" className="rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-4 text-center text-sm font-black text-white transition hover:bg-white/[0.1]">
                Contact Us
              </a>
            </div>
          </div>

          <div className="dark-enterprise-card relative overflow-hidden rounded-[2rem] p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(30,107,255,0.22),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(255,122,26,0.16),transparent_28%)]" />
            <div className="relative">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFB36F]">Platform Preview</p>
                  <h2 className="mt-1 text-xl font-black text-white">Executive Intelligence Command Center</h2>
                </div>
                <span className="rounded-full bg-[#3BB273]/15 px-3 py-1 text-xs font-black text-[#B9F4D2]">Soon</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                {[
                  ["Revenue", "$1.82M", "+12.4%"],
                  ["Runway", "21 wks", "stable"],
                  ["AR 90+", "$48K", "review"],
                  ["Margin", "34.6%", "+2.1 pts"],
                ].map(([label, value, status]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
                    <p className="mt-3 text-2xl font-black text-white">{value}</p>
                    <p className="mt-2 text-xs font-bold text-[#FFB36F]">{status}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
                <div className="rounded-2xl border border-white/10 bg-[#070B16]/80 p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-white">Liquidity Forecast</p>
                    <p className="text-xs font-bold text-slate-500">13-week view</p>
                  </div>
                  <div className="mt-5 rounded-2xl border border-white/10 bg-[#050915] p-4">
                    <svg viewBox="0 0 520 220" className="h-44 w-full" role="img" aria-label="Sample executive forecast chart">
                      <rect x="332" y="42" width="134" height="122" fill="#D78342" opacity="0.07" />
                      <text x="399" y="50" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="800" letterSpacing="1.4">FORECAST</text>
                      {[52, 92, 132, 172].map((y) => (
                        <line key={y} x1="36" x2="482" y1={y} y2={y} stroke="rgba(148,163,184,0.16)" strokeWidth="1" />
                      ))}
                      <line x1="36" x2="482" y1="178" y2="178" stroke="rgba(148,163,184,0.3)" strokeWidth="1" />
                      <path
                        d="M50 146 C88 128, 108 116, 130 112 C165 106, 178 124, 205 116 C246 104, 250 80, 286 84 C318 88, 330 94, 352 84 C382 70, 402 58, 460 48 L460 178 L50 178 Z"
                        fill="#C8A46A"
                        opacity="0.08"
                      />
                      <path
                        d="M50 146 C88 128, 108 116, 130 112 C165 106, 178 124, 205 116 C246 104, 250 80, 286 84 C318 88, 330 94, 352 84 C382 70, 402 58, 460 48"
                        fill="none"
                        stroke="#C8A46A"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                      <polyline
                        points="50,160 130,150 205,142 286,132 352,116 460,98"
                        fill="none"
                        stroke="rgba(148,163,184,0.5)"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="5 8"
                      />
                      {[
                        [130, 112],
                        [286, 84],
                        [460, 48],
                      ].map(([cx, cy]) => (
                        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" fill="#050915" stroke="#C8A46A" strokeWidth="1.5" />
                      ))}
                      <text x="36" y="32" fill="#CBD5E1" fontSize="11" fontWeight="900" letterSpacing="1">TREASURY CASH FORECAST</text>
                      <text x="392" y="72" fill="#D78342" fontSize="11" fontWeight="900">+18.6%</text>
                      {["W1", "W2", "W3", "W4", "W5", "W6", "W7"].map((week, index) => (
                        <text key={week} x={71 + index * 62} y="206" textAnchor="middle" fill="#64748B" fontSize="12" fontWeight="800">
                          {week}
                        </text>
                      ))}
                    </svg>
                    <div className="mt-3 grid gap-2 text-xs font-bold text-slate-400 sm:grid-cols-3">
                      <span><span className="text-[#C8A46A]">●</span> Treasury cash forecast</span>
                      <span><span className="text-slate-500">●</span> Baseline scenario</span>
                      <span className="text-[#FFB36F]">Ending cash: $1.63M</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    ["AI Recommendation", "Generate the board package and review cash timing before approving the hiring plan."],
                    ["Owner Brief Signal", "Cash is stable, revenue is improving, and collections remain this week's top risk."],
                    ["Industry Insight", "Manufacturing variance and inventory efficiency are driving the next executive recommendation."],
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
        </div>
      </section>

      <section id="early-access" className="scroll-mt-[220px] px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#1E6BFF]">Be First To Know</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[#0A1020] md:text-6xl">
              Join early access for financial intelligence that starts with value.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#6B7280]">
              Receive launch updates for free sample financial reviews, product-led onboarding, executive package generation, owner weekly briefs, Ask Advisacor, industry intelligence, and advisory firm workflows.
            </p>
          </div>
          <form onSubmit={handleSubmit} noValidate className="enterprise-card rounded-[2rem] p-7">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-black text-[#111827]">Name</span>
                <input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setFieldErrors((current) => ({ ...current, name: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? "early-access-name-error" : undefined}
                  className={`rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-[#FF7A1A] ${
                    fieldErrors.name ? "border-red-300 bg-red-50/40" : "border-slate-200"
                  }`}
                  placeholder="Your name"
                />
                {fieldErrors.name && (
                  <span id="early-access-name-error" className="text-sm font-bold text-red-600">
                    {fieldErrors.name}
                  </span>
                )}
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-black text-[#111827]">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFieldErrors((current) => ({ ...current, email: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "early-access-email-error" : undefined}
                  className={`rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-[#FF7A1A] ${
                    fieldErrors.email ? "border-red-300 bg-red-50/40" : "border-slate-200"
                  }`}
                  placeholder="you@company.com"
                />
                {fieldErrors.email && (
                  <span id="early-access-email-error" className="text-sm font-bold text-red-600">
                    {fieldErrors.email}
                  </span>
                )}
              </label>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="premium-button mt-5 w-full rounded-2xl px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Request Early Access"}
            </button>
            {submitted && (
              <p className="mt-4 rounded-2xl border border-[#3BB273]/20 bg-[#3BB273]/10 px-4 py-3 text-sm font-bold text-[#176B42]">
                Thank you. Your request has been received. Please check your email for confirmation.
              </p>
            )}
            {formError && (
              <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                Something went wrong. Please try again or email{" "}
                <a href="mailto:sales@advisacor.com" className="underline">
                  sales@advisacor.com
                </a>.
              </p>
            )}
          </form>
        </div>
      </section>

      <section id="platform-preview" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FF7A1A]">Platform Preview</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[#0A1020] md:text-6xl">
              More than reporting: executive intelligence infrastructure.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="enterprise-card rounded-[2rem] p-7">
                <div className="mb-7 inline-flex rounded-full bg-[#FF7A1A]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#FF7A1A]">
                  Launching Soon
                </div>
                <h3 className="text-2xl font-black tracking-[-0.025em] text-[#0A1020]">{feature.title}</h3>
                <p className="mt-4 leading-7 text-[#6B7280]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="px-6 py-24">
        <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-2xl shadow-slate-900/10 md:p-14">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#1E6BFF]">Built By Finance Professionals</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.04em] text-[#0A1020] md:text-6xl">
            Financial intelligence for bookkeepers, controllers, fractional CFOs, accounting firms, and business owners.
          </h2>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-[#6B7280]">
            Advisacor helps bookkeepers prepare AP, AR, payroll/FTE, and month-end packages; controllers review close quality, flux, accruals, reserves, fixed assets, and stale balances; fractional CFOs deliver forecasting, budgeting, treasury, board packages, and strategic commentary; and business owners receive weekly financial awareness without reading accounting reports.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="advisacor-dark-grid mx-auto max-w-7xl rounded-[2.5rem] bg-[#0A1020] p-10 text-white shadow-2xl shadow-slate-950/30 md:p-14">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Financial Intelligence Is Coming Soon</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.04em] md:text-6xl">
            Generate board-ready financial packages in minutes.
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            Join the early access list and be among the first to see how Advisacor turns uploaded statements and connected accounting systems into executive summaries, dashboards, PDF packages, PowerPoint packages, weekly briefs, support workflows, and industry-specific recommendations.
          </p>
          <a href="#early-access" className="premium-button mt-8 inline-flex rounded-2xl px-6 py-4 text-sm font-black text-white">
            Join Early Access
          </a>
        </div>
      </section>

      <footer id="contact" className="border-t border-slate-200 bg-white px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <AdvisacorLogo className="w-[260px]" />
            <p className="mt-3 text-sm font-semibold text-[#6B7280]">
              A product of Wiseman Financial Technologies LLC
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm font-bold text-[#6B7280]">
            <a href="https://advisacor.com" className="hover:text-[#111827]">advisacor.com</a>
            <a href="mailto:contact@advisacor.com" className="hover:text-[#111827]">Contact</a>
            <span>Privacy Policy</span>
            <span>LinkedIn</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default FullLandingPage;
