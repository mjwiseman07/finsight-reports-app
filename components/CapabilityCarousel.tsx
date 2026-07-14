"use client";

import { useState, useEffect, useRef } from "react";

type Slide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
};

const SLIDES: Slide[] = [
  {
    id: "business-owner",
    eyebrow: "For Business Owners",
    title: "Know what your numbers mean — without becoming an accountant.",
    body:
      "Advisacor™ gives owners a plain-English read on cash, revenue, margin, and compliance. Ask a question, get a defensible answer with the source attached.",
    bullets: [
      "Plain-English answers, not spreadsheet gymnastics",
      "Cash, revenue, and margin in one view",
      "Every answer cites the underlying transaction or rule",
    ],
  },
  {
    id: "fractional-cfo",
    eyebrow: "For Fractional CFO Firms",
    title: "Run more clients without hiring more people.",
    body:
      "A multi-entity workspace built for firms serving 5, 20, or 200 clients. Switch between books, run close cycles in parallel, and deliver board-ready reporting from one console.",
    bullets: [
      "Multi-entity console with per-client roles",
      "Parallel close cycles and variance review",
      "Board packets generated, not assembled by hand",
    ],
  },
  {
    id: "accounting-firm",
    eyebrow: "For Accounting Firms",
    title: "Close faster. Review with confidence. Defend every number.",
    body:
      "Built by an accountant for accountants. Reconciliation, close, disclosures, and review workflows that respect how the work actually happens — and produce audit-ready trails by default.",
    bullets: [
      "Reconciliation and close agents that work alongside your team",
      "Disclosure drafting with citations to ASC, IFRS, and IFRS for SMEs",
      "Full audit trail and review queue on every entry",
    ],
  },
  {
    id: "bookkeeping-firm",
    eyebrow: "For Bookkeeping Firms",
    title: "Move up-market without rebuilding your stack.",
    body:
      "Connect QuickBooks, Xero, Sage, NetSuite, or Dynamics. Advisacor™ layers automation, review, and reporting on top of the ledgers you already use — so you can offer advisory work, not just data entry.",
    bullets: [
      "Works with QBO, Xero, Sage Intacct, NetSuite, and Dynamics",
      "Automated categorization with human-in-the-loop review",
      "Client-ready monthly packages in minutes, not days",
    ],
  },
  {
    id: "industries",
    eyebrow: "Industry Coverage",
    title: "Nine verticals live. More on the way.",
    body:
      "Healthcare, Manufacturing, Retail, Fund Accounting, GovCon/DCAA, Construction, Professional Services, SaaS, and Nonprofit — each with its own KPIs, disclosure rules, and benchmark library. Don't see yours? It's likely on the roadmap.",
    bullets: [
      "Vertical-specific KPIs, ratios, and benchmarks",
      "GAAP and IFRS disclosure libraries per industry",
      "New verticals added on a published cadence",
    ],
  },
  {
    id: "ai-workforce",
    eyebrow: "AI Workforce",
    title: "Staff accountants, seniors, and auditors — on demand.",
    body:
      "Advisacor™ is engineered to do the work that historically required a Staff Accountant, Senior Accountant, Staff Auditor, or Senior Auditor on the team. Replace roles you can't afford to hire, or supplement the team you already have — at a fraction of the loaded cost of a headcount. And every AI worker can be programmed with the same job description you'd hand a new hire.",
    bullets: [
      "Reconciliation Agent — handles Staff Accountant–level bank, AP, AR, and intercompany recs",
      "Close Agent — runs Senior Accountant–level month-end close, accruals, and consolidations",
      "Controls & Review Agents — perform Staff and Senior Auditor–level testing, sampling, and sign-off",
      "Disclosure & Variance Agents — draft footnotes and explain movements with full citations",
      "Each worker can be programmed with a job description — same scope you'd give a human hire",
      "Replace open roles, or supplement the people you already have — your call, per client",
    ],
  },
  {
    id: "programmable-workers",
    eyebrow: "Programmable Workers",
    title: "Hand it the job description. It does the job.",
    body:
      "Every AI worker in Advisacor™ can be configured against an actual job description — the same one you'd hand a Staff Accountant, Senior Accountant, Staff Auditor, or Senior Auditor on day one. Paste the JD, define the scope, set the review rules, and the worker takes on that role's responsibilities across the clients or entities you assign it to.",
    bullets: [
      "Paste in a real job description — Staff Accountant, Senior Auditor, AR Clerk, Controller-track Senior, you name it",
      "Define scope: which clients, which entities, which close cycles, which disclosure standards",
      "Set the review rules — what gets auto-posted, what gets escalated, who signs off",
      "Memory carries forward — the worker remembers prior-period decisions, client elections, and reviewer preferences",
      "Update the JD anytime — the worker adapts to the new scope on the next cycle",
    ],
  },
  {
    id: "ai-helpers",
    eyebrow: "AI Helpers",
    title: "A senior reviewer over every accountant's shoulder.",
    body:
      "For the humans you keep, Advisacor™ helpers sit beside them inside the work — suggesting journal entries as they type, autocompleting disclosure language against the standard they're filing under, and explaining variances without making them leave the screen. Less swivel-chair. Fewer review cycles.",
    bullets: [
      "Inline journal entry suggestions with the source row attached",
      "Disclosure autocomplete tied to ASC, IFRS, and IFRS for SMEs citations",
      "Variance explanations sourced from the underlying data, not guessed",
      "Catches what a tired reviewer at 11 PM on close night would miss",
    ],
  },
  {
    id: "disclosures",
    eyebrow: "Reports That Defend Themselves",
    title: "Every disclosure ships with its evidence attached.",
    body:
      "Financial statements and disclosures generated by Advisacor™ carry a provenance trail — the rule, the source data, and the review history — so when an auditor asks, the answer is already in the report.",
    bullets: [
      "Disclosure drafts linked to ASC, IFRS, and IFRS for SMEs citations",
      "Provenance trail on every figure and footnote",
      "Review queue with sign-off and version history",
    ],
  },
  {
    id: "memory",
    eyebrow: "Memory Substrate",
    title: "The software remembers — so your team doesn't have to.",
    body:
      "A patent-pending memory layer that retains client elections, prior-period decisions, recurring adjustments, and reviewer preferences. Less re-explaining. Fewer repeat errors. Continuity across close cycles.",
    bullets: [
      "Per-client election registry and decision history",
      "Recurring adjustments carried forward with audit",
      "Reviewer preferences and firm standards remembered",
    ],
  },
  {
    id: "pulse",
    eyebrow: "Pulse AI",
    title: "One question. One defensible answer.",
    body:
      "Pulse is the conversational layer over your entire ledger, disclosures, and memory. Ask anything — cash position, margin trend, revenue recognition treatment, prior-period decisions — and get a sourced answer in seconds.",
    bullets: [
      "Natural-language access to ledgers, disclosures, and memory",
      "Every answer cites its source rows and rules",
      "Available to authenticated users only",
    ],
  },
  {
    id: "the-math",
    eyebrow: "The Math",
    title: "A finance team's worth of work — for a fraction of one salary.",
    body:
      "Hiring the team Advisacor™ replicates is expensive. Industry-reported loaded compensation in the US runs roughly: Staff Accountant $65–85K, Senior Accountant $95–120K, Staff Auditor $70–90K, Senior Auditor $100–130K — and that's before benefits, recruiting, ramp time, or turnover. Advisacor™ delivers that coverage as software, at roughly a quarter of the cost of staffing the same scope of work.",
    bullets: [
      "Staff Accountant: roughly $65,000 – $85,000 per year, loaded",
      "Senior Accountant: roughly $95,000 – $120,000 per year, loaded",
      "Staff Auditor: roughly $70,000 – $90,000 per year, loaded",
      "Senior Auditor: roughly $100,000 – $130,000 per year, loaded",
      "Advisacor™: a fraction of a single role — covering the work of all four",
    ],
  },
];

const AUTO_ADVANCE_MS = 7000;

export default function CapabilityCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % SLIDES.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [isPaused]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setActiveIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length);
      } else if (e.key === "ArrowRight") {
        setActiveIndex((i) => (i + 1) % SLIDES.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const slide = SLIDES[activeIndex];
  const goPrev = () => setActiveIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length);
  const goNext = () => setActiveIndex((i) => (i + 1) % SLIDES.length);

  return (
    <section
      id="capabilities"
      ref={containerRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full scroll-mt-24 bg-gradient-to-b from-[#060E22] via-[#111112] to-[#060E22] pt-20 pb-20 lg:pt-28 lg:pb-28"
      aria-roledescription="carousel"
      aria-label="Advisacor capabilities"
    >
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mb-12 text-center lg:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C9A961]/30 bg-[#C9A961]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A961]">
            A finance team — in software. At a fraction of the cost.
          </div>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            What Advisacor<sup className="text-[#C9A961]">™</sup> does.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-white/65 sm:text-lg">
            Designed to do the work of staff accountants, seniors, and auditors — programmable with the same job
            description you&apos;d hand a new hire. Replace roles you can&apos;t afford to fill, or supplement the team
            you already have.
          </p>
        </div>

        <div
          key={slide.id}
          className="animate-fadeIn relative rounded-2xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-sm sm:p-12 lg:p-16"
          aria-live="polite"
        >
          <div className="absolute bottom-8 left-0 top-8 w-1 rounded-r bg-gradient-to-b from-[#C9A961] via-[#D9BE7B] to-[#B8975A]" />
          <div className="pl-4 sm:pl-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C9A961] sm:text-sm">{slide.eyebrow}</p>
            <h3 className="mt-4 max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
              {slide.title}
            </h3>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/75 sm:text-lg">{slide.body}</p>
            <ul className="mt-8 grid max-w-3xl gap-3 sm:gap-4">
              {slide.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#C9A961]" />
                  <span className="text-sm leading-relaxed text-white/85 sm:text-base">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-6 lg:mt-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous slide"
              className="group inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white/70 transition hover:border-[#C9A961]/60 hover:bg-[#C9A961]/10 hover:text-[#C9A961]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next slide"
              className="group inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white/70 transition hover:border-[#C9A961]/60 hover:bg-[#C9A961]/10 hover:text-[#C9A961]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <span className="ml-2 font-mono text-xs tracking-wider text-white/50">
              {String(activeIndex + 1).padStart(2, "0")}
              <span className="mx-1 text-white/25">/</span>
              {String(SLIDES.length).padStart(2, "0")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-label={`Go to slide ${i + 1}: ${s.eyebrow}`}
                aria-current={i === activeIndex ? "true" : undefined}
                className={
                  i === activeIndex
                    ? "h-2 w-8 rounded-full bg-[#C9A961] transition-all duration-300"
                    : "h-2 w-2 rounded-full bg-white/25 transition-all duration-300 hover:bg-white/50"
                }
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 500ms ease-out;
        }
      `}</style>
    </section>
  );
}
