"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode, type SVGProps } from "react";
import heroLogo from "../public/advisacor-logo-full-transparent.png";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const headingFont = "[font-family:var(--font-geologica)]";

const primaryCtaClass =
  "bg-[#C9A961] font-semibold text-[#0A1530] shadow-lg shadow-[#C9A961]/30 transition-colors hover:bg-[#B8975A]";

const pillars = [
  {
    title: "Reports That Defend Themselves",
    description:
      "Every number is anchored to real SEC filing patterns and audited through a 29-stage validation cascade before it reaches your screen. No hallucinated footnotes. No silent errors. A complete provenance trail behind every disclosure.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Framework Discipline by Design",
    description:
      "US GAAP and IFRS never co-mingle. Healthcare revenue rules can't leak into manufacturing reports. The architecture enforces accounting framework boundaries the way good controls enforce SOX — automatically.",
    icon: LayersIcon,
  },
  {
    title: "A Memory That Knows Your Books",
    description:
      "Advisacor™ remembers your chart of accounts, your close calendar, your prior-period judgments, your auditor's preferences. You don't re-explain your business every month.",
    icon: DatabaseIcon,
  },
  {
    title: "An AI Workforce, Not a Chatbot",
    description:
      "Specialized agents for reconciliation, close, disclosure, and review — coordinated by an orchestrator that knows when to escalate and when to decide. Built like an accounting team, not a search box.",
    icon: UsersIcon,
  },
] as const;

const videoTiles = [
  { title: "Bank reconciliation in under a minute", src: "/videos/reconciliation.mp4" },
  { title: "Trial balance to disclosure footnotes", src: "/videos/disclosures.mp4" },
  { title: "Catching what a junior would miss", src: "/videos/gap-register.mp4" },
  { title: "GAAP vs IFRS, same data, two reports", src: "/videos/framework.mp4" },
  { title: "Nine industries, one platform", src: "/videos/verticals.mp4" },
  { title: "The audit trail every number carries", src: "/videos/provenance.mp4" },
] as const;

const industries = [
  { name: "Healthcare", descriptor: "ASC 606 healthcare revenue, 340B, payer mix", icon: HeartPulseIcon },
  { name: "Manufacturing", descriptor: "Inventory costing, WIP, cost variance", icon: FactoryIcon },
  { name: "Retail", descriptor: "POS reconciliation, gift cards, returns reserves", icon: StoreIcon },
  { name: "Fund Accounting", descriptor: "ASC 946, NAV, partner allocations", icon: LandmarkIcon },
  { name: "GovCon / DCAA", descriptor: "FAR, CAS, indirect rate compliance", icon: ShieldIcon },
  { name: "Construction", descriptor: "ASC 606 percentage completion, retention", icon: HardHatIcon },
  { name: "Professional Services", descriptor: "Time and materials, milestone billing", icon: BriefcaseIcon },
  { name: "SaaS", descriptor: "ARR, deferred revenue, multi-element arrangements", icon: CloudIcon },
  { name: "Nonprofit", descriptor: "ASC 958, restricted funds, grant tracking", icon: HandHeartIcon },
] as const;

const steps = [
  {
    number: "01",
    title: "Connect",
    description:
      "Plug into QuickBooks, NetSuite, Sage, Xero, or Microsoft Dynamics. Advisacor™ reads your existing books — no migration required.",
  },
  {
    number: "02",
    title: "Validate",
    description:
      "Every transaction, balance, and disclosure runs through a 29-stage validation cascade. Issues are flagged with full audit context. Nothing silent fails.",
  },
  {
    number: "03",
    title: "Report",
    description:
      "Audit-ready financial reports, disclosures, and management commentary — generated on demand, framework-correct, fully traceable.",
  },
] as const;

const badges = [
  { title: "SOC 1 / SOC 2 Type II", subtitle: "Architected from day one" },
  { title: "HIPAA-Aware", subtitle: "Healthcare data isolation by design" },
  { title: "US GAAP + IFRS", subtitle: "Both supported. Never mixed." },
  { title: "Patent Pending", subtitle: "Three U.S. provisional patents filed" },
] as const;

function focusRing(className = "") {
  return `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A961] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1020] ${className}`;
}

function IconBase({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

function ShieldCheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 3 4 6.5V11c0 4.4 3.1 8.5 8 10 4.9-1.5 8-5.6 8-10V6.5L12 3Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9.5 12 1.8 1.8L15.5 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function LayersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="m12 3 9 4.5 12 6 15 7.5 12 9 9 7.5 12 3Z" strokeLinejoin="round" />
      <path d="m3 12 9 15 21 9" strokeLinejoin="round" />
      <path d="m3 16.5 9 19.5 21 13.5" strokeLinejoin="round" />
    </IconBase>
  );
}

function DatabaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </IconBase>
  );
}

function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M16 19a4 4 0 0 0-8 0" strokeLinecap="round" />
      <circle cx="12" cy="9" r="3" />
      <path d="M20 19a3 3 0 0 0-2.2-5.8M4 19a3 3 0 0 1 2.2-5.8" strokeLinecap="round" />
    </IconBase>
  );
}

function HeartPulseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 20s-6.5-4.2-8.5-8.2C1.8 8.5 4.2 5 7.5 5c1.8 0 3 1 4.5 2.6C13.5 6 14.7 5 16.5 5 19.8 5 22.2 8.5 20.5 11.8 18.5 15.8 12 20 12 20Z" strokeLinejoin="round" />
      <path d="M10 11h1.5l1-2 1.5 4 1-2H16" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function FactoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M3 20h18" strokeLinecap="round" />
      <path d="M5 20V9l5 3V9l5 3V5h4v15" strokeLinejoin="round" />
    </IconBase>
  );
}

function StoreIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 9 6 4h12l2 5" strokeLinejoin="round" />
      <path d="M4 9h16v11H4z" strokeLinejoin="round" />
      <path d="M9 20v-6h6v6" />
    </IconBase>
  );
}

function LandmarkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 20h16" strokeLinecap="round" />
      <path d="M6 20V10l6-4 6 4v10" strokeLinejoin="round" />
      <path d="M10 20v-4h4v4" />
    </IconBase>
  );
}

function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 3 4 6.5V11c0 4.4 3.1 8.5 8 10 4.9-1.5 8-5.6 8-10V6.5L12 3Z" strokeLinejoin="round" />
    </IconBase>
  );
}

function HardHatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 15h16" strokeLinecap="round" />
      <path d="M6 15V11a6 6 0 0 1 12 0v4" />
      <path d="M10 19h4" strokeLinecap="round" />
    </IconBase>
  );
}

function BriefcaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="4" y="8" width="16" height="11" rx="2" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </IconBase>
  );
}

function CloudIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M7 18h11a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.5 9.2 4 4 0 0 0 7 18Z" strokeLinejoin="round" />
    </IconBase>
  );
}

function HandHeartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M11 20s-4-2.8-5.5-5.5C4 12.5 5.5 10 8 10c1.2 0 2 .6 3 1.8C12 10.6 12.8 10 14 10c2.5 0 4 2.5 2.5 4.5C15 17.2 11 20 11 20Z" strokeLinejoin="round" />
      <path d="M18 8v6M15 11h6" strokeLinecap="round" />
    </IconBase>
  );
}

function DashboardPreview() {
  const liquidityForecast = [
    { week: "W1", cash: 1.28 },
    { week: "W2", cash: 1.34 },
    { week: "W3", cash: 1.46 },
    { week: "W4", cash: 1.52 },
    { week: "W5", cash: 1.43 },
    { week: "W6", cash: 1.57 },
    { week: "W7", cash: 1.63 },
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
    <div className="relative overflow-hidden rounded-[2rem] bg-[#0A1530] p-5 ring-1 ring-white/5 shadow-2xl shadow-blue-950/40">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A1530] via-[#0B1838] to-[#091226]" />
      <div className="relative">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C9A961]">Executive Workspace</p>
            <p className={`mt-1 text-xl font-black text-white ${headingFont}`}>Financial Intelligence Command Center</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
            Live
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Revenue", "$1.82M", "+12.4%"],
            ["Runway", "21 wks", "stable"],
            ["AR 90+", "$48K", "review"],
            ["Margin", "34.6%", "+2.1 pts"],
          ].map(([label, value, tag]) => {
            const tagClass =
              tag === "stable" ? "text-slate-500" : tag === "review" ? "text-amber-500" : "text-[#C9A961]";

            return (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
              <p className={`mt-3 text-2xl font-black text-white ${headingFont}`}>{value}</p>
              <p className={`mt-2 text-xs font-bold ${tagClass}`}>{tag}</p>
            </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-[#060E22] p-5">
          <div className="flex items-center justify-between">
            <p className={`font-black text-white ${headingFont}`}>Liquidity Forecast</p>
            <p className="text-xs font-bold text-slate-500">13-week view</p>
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 p-4 shadow-inner shadow-black/30">
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#040918] p-4" aria-label="Sample liquidity forecast chart">
              <svg viewBox="0 0 420 178" className="h-56 w-full" preserveAspectRatio="none" role="img">
                <rect x="267" y="18" width="116" height="124" fill="#C9A961" opacity="0.07" />
                <text x="326" y="28" textAnchor="middle" fill="#94A3B8" fontSize="8" fontWeight="700" letterSpacing="1.2">
                  FORECAST
                </text>
                {[36, 64, 92, 120, 148].map((y) => (
                  <line key={y} x1="34" x2="382" y1={y} y2={y} stroke="rgba(148,163,184,0.16)" strokeWidth="0.8" />
                ))}
                <line x1="34" x2="382" y1="142" y2="142" stroke="rgba(148,163,184,0.3)" strokeWidth="1" />
                <path d={forecastAreaPath} fill="#C9A961" opacity="0.08" />
                <polyline points={chartPoints} fill="none" stroke="#C9A961" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
                  return <circle key={point.week} cx={x} cy={y} r="2.8" fill="#060A12" stroke="#C9A961" strokeWidth="1.4" />;
                })}
                <text x="34" y="22" fill="#CBD5E1" fontSize="9" fontWeight="800" letterSpacing="1">
                  CASH BALANCE ($M)
                </text>
                <text x="348" y="44" fill="#C9A961" fontSize="9" fontWeight="900">
                  +18.6%
                </text>
                {liquidityForecast.map((point, index) => (
                  <text key={point.week} x={34 + index * 58} y="166" textAnchor="middle" fill="#64748B" fontSize="9" fontWeight="800">
                    {point.week}
                  </text>
                ))}
              </svg>
            </div>
            <div className="mt-3 grid gap-2 text-xs font-bold text-slate-400 sm:grid-cols-3">
              <span>
                <span className="text-[#C9A961]">●</span> Treasury cash forecast
              </span>
              <span>
                <span className="text-slate-500">●</span> Baseline scenario
              </span>
              <span className="text-[#C9A961]">Ending cash: $1.63M</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoTile({ title, src }: { title: string; src: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="relative aspect-video bg-[#070B16]">
        {failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#C9A961]/40 bg-[#C9A961]/10 text-[#C9A961]">
              <span className="text-lg font-black" aria-hidden="true">
                ▶
              </span>
            </div>
            <p className="text-sm font-bold text-slate-500">Video coming soon</p>
          </div>
        ) : (
          <video
            className="h-full w-full object-cover"
            controls
            muted
            playsInline
            preload="metadata"
            onError={() => setFailed(true)}
            aria-label={title}
          >
            <source src={src} type="video/mp4" />
          </video>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0A1020] via-[#0A1020]/80 to-transparent px-4 pb-4 pt-16">
          <p className={`text-sm font-black text-white ${headingFont}`}>{title}</p>
        </div>
      </div>
    </div>
  );
}

function EarlyAccessForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setFormError("");
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
      setFormError("Please enter your name and a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail }),
      });

      if (!response.ok) {
        throw new Error("Early access submission failed.");
      }

      setSubmitted(true);
      setName("");
      setEmail("");
    } catch {
      setFormError("Something went wrong. Please try again or email sales@advisacor.com.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-[2rem] border border-white/10 bg-white/[0.05] px-8 py-12 text-center backdrop-blur">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3BB273]/15 text-[#3BB273]" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className={`mt-6 text-xl font-black text-[#C9A961] ${headingFont}`}>You&apos;re on the list. We&apos;ll be in touch.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-[480px] space-y-4">
      <div>
        <label htmlFor="early-access-name" className="sr-only">
          Your name
        </label>
        <input
          id="early-access-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          placeholder="Your name"
          className={`w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-white placeholder:text-slate-500 ${focusRing()}`}
        />
      </div>
      <div>
        <label htmlFor="early-access-email" className="sr-only">
          Email address
        </label>
        <input
          id="early-access-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="you@company.com"
          className={`w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-white placeholder:text-slate-500 ${focusRing()}`}
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full rounded-full px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${primaryCtaClass} ${focusRing()}`}
      >
        {isSubmitting ? (
          <span className="inline-flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A1530]/30 border-t-[#0A1530]" aria-hidden="true" />
            Submitting...
          </span>
        ) : (
          "Request Early Access"
        )}
      </button>
      {formError && (
        <p className="text-center text-sm font-semibold text-red-400" role="alert">
          {formError}
        </p>
      )}
    </form>
  );
}

export default function FullLandingPage() {
  const navLinkClass = `${focusRing("ring-offset-slate-300")} text-sm font-bold text-slate-900 transition hover:text-[#C9A961]`;

  return (
    <main className="min-h-screen bg-[#F5F7FA] text-[#111827]">
      {/* SECTION A + B — Navigation + Hero */}
      <section
        id="top"
        className="relative isolate overflow-hidden bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 px-6 pb-16 md:pb-20"
      >
        <header className="relative z-20">
          <Link
            href="/"
            className={`absolute top-4 left-6 z-20 md:top-6 md:left-8 ${focusRing("rounded-lg")}`}
            aria-label="Advisacor home"
          >
            <Image
              src={heroLogo}
              alt="Advisacor"
              priority
              className="h-auto w-[220px] md:w-[300px] lg:w-[320px]"
            />
          </Link>
          <nav className="relative mx-auto flex max-w-7xl justify-end px-0 pt-4 md:pt-6">
            <div className="ml-auto flex items-center gap-4 rounded-full bg-white/40 px-4 py-2 backdrop-blur-sm md:gap-8 md:px-6 md:py-3">
              <div className="hidden items-center gap-8 md:flex">
                <a href="#what-it-does" className={navLinkClass}>
                  What It Does
                </a>
                <a href="#how-it-works" className={navLinkClass}>
                  How It Works
                </a>
                <a href="#industries" className={navLinkClass}>
                  Industries
                </a>
                <a href="#about" className={navLinkClass}>
                  About
                </a>
                <a
                  href="#early-access"
                  className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm ${primaryCtaClass} ${focusRing()}`}
                >
                  Request Early Access
                </a>
              </div>
              <a
                href="#early-access"
                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs md:hidden ${primaryCtaClass} ${focusRing()}`}
              >
                Early Access
              </a>
            </div>
          </nav>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 pt-32 md:pt-40 lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,1.05fr)]">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9A961]">Early Access · Patent Pending</p>
            <h1 className={`mt-5 text-4xl font-black leading-[1.06] tracking-[-0.04em] text-slate-900 sm:text-5xl lg:text-6xl ${headingFont}`}>
              The first accounting platform that audits its own work.
            </h1>
            <p className="mt-6 max-w-[640px] text-lg leading-8 text-slate-700">
              Advisacor™ turns financial data into audit-ready reports across nine industries — with framework discipline,
              real-filing benchmarks, and a 29-stage validation cascade built in by design.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#early-access"
                className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm ${primaryCtaClass} ${focusRing()}`}
              >
                Request Early Access
              </a>
              <a
                href="#what-it-does"
                className={`inline-flex items-center gap-2 rounded-full border-2 border-[#0A1530] bg-[#0A1530] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#060E22] ${focusRing()}`}
              >
                See What It Does <span className="text-[#C9A961]">↓</span>
              </a>
            </div>
          </div>
          <div className="min-w-0">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* SECTION C — Patent strip */}
      <section className="border-y border-white/5 bg-[#0A1530] px-6 py-5">
        <p className="mx-auto max-w-5xl text-center text-xs leading-6 md:text-sm">
          <span className="font-semibold text-[#C9A961]">Three U.S. Provisional Patents Filed · June 2026</span>
          <span className="text-[#C9A961]/60"> · </span>
          <span className="text-white">Memory Substrate</span>
          <span className="text-[#C9A961]/60"> · </span>
          <span className="text-white">AI Workforce</span>
          <span className="text-[#C9A961]/60"> · </span>
          <span className="text-white">Disclosure Validation</span>
          <span className="text-[#C9A961]/60"> · </span>
          <span className="text-white/70">Wiseman Financial Technologies LLC</span>
        </p>
      </section>

      {/* SECTION D — Four Pillars */}
      <section id="what-it-does" className="scroll-mt-24 bg-[#F5F7FA] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">What Advisacor Does</p>
          <h2 className={`mt-4 max-w-3xl text-4xl font-black tracking-[-0.04em] text-[#0A1020] md:text-5xl ${headingFont}`}>
            Four things generic AI accounting tools can&apos;t do.
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {pillars.map((pillar) => (
              <article key={pillar.title} className="enterprise-card rounded-[2rem] p-7">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#C9A961]/20 bg-[#0A1020] text-[#C9A961]">
                  <pillar.icon className="h-6 w-6" />
                </div>
                <h3 className={`text-xl font-black tracking-[-0.02em] text-[#0A1020] ${headingFont}`}>{pillar.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">{pillar.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION E — Video Showcase */}
      <section id="see-it" className="scroll-mt-24 bg-[#0A1020] px-6 py-24 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">See It In Action</p>
          <h2 className={`mt-4 text-4xl font-black tracking-[-0.04em] md:text-5xl ${headingFont}`}>Sixty seconds is all it takes.</h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            Short segments showing Advisacor™ doing the work it was designed to do.
          </p>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {videoTiles.map((tile) => (
              <VideoTile key={tile.src} title={tile.title} src={tile.src} />
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-slate-500">More segments rolling out as features ship.</p>
        </div>
      </section>

      {/* SECTION F — Nine Industries */}
      <section id="industries" className="scroll-mt-24 bg-[#F5F7FA] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Built For The Industries That Need It Most</p>
          <h2 className={`mt-4 max-w-3xl text-4xl font-black tracking-[-0.04em] text-[#0A1020] md:text-5xl ${headingFont}`}>
            Nine industries. Each one built from the inside out.
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {industries.map((industry) => (
              <article key={industry.name} className="enterprise-card group rounded-2xl border border-transparent p-6 transition hover:border-[#C9A961]">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A1020] text-[#C9A961] transition group-hover:text-[#D9BE7B]">
                  <industry.icon className="h-5 w-5" />
                </div>
                <h3 className={`text-lg font-black text-[#0A1020] transition group-hover:text-[#C9A961] ${headingFont}`}>{industry.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{industry.descriptor}</p>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-3xl text-center text-sm leading-7 text-slate-600">
            Each industry includes its own KPIs, disclosure templates, regulatory rules, and benchmark filings — not a
            generic template forced to fit your sector.
          </p>
        </div>
      </section>

      {/* SECTION G — How It Works */}
      <section id="how-it-works" className="scroll-mt-24 bg-[#0A1020] px-6 py-24 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">How It Works</p>
          <h2 className={`mt-4 text-4xl font-black tracking-[-0.04em] md:text-5xl ${headingFont}`}>
            Three steps. No migration. No magic.
          </h2>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 backdrop-blur">
                <p
                  className={`flex h-14 w-14 items-center justify-center rounded-full bg-[#C9A961] text-lg font-black text-[#0A1530] ${headingFont}`}
                >
                  {step.number}
                </p>
                <h3 className={`mt-4 text-2xl font-black text-white ${headingFont}`}>{step.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-300">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION H — Built On */}
      <section className="bg-[#F5F7FA] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Built On</p>
          <h2 className={`mt-4 text-4xl font-black tracking-[-0.04em] text-[#0A1020] md:text-5xl ${headingFont}`}>
            The standards that matter.
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {badges.map((badge) => (
              <div
                key={badge.title}
                className={
                  badge.title === "Patent Pending"
                    ? "rounded-2xl border border-[#C9A961] bg-[#0A1530] p-6 text-center"
                    : "enterprise-card rounded-2xl p-6 text-center"
                }
              >
                <p
                  className={`text-lg font-black ${badge.title === "Patent Pending" ? "text-[#C9A961]" : "text-[#0A1020]"} ${headingFont}`}
                >
                  {badge.title}
                </p>
                <p className={`mt-2 text-sm ${badge.title === "Patent Pending" ? "text-white/70" : "text-slate-600"}`}>
                  {badge.subtitle}
                </p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-xs italic leading-6 text-slate-500">
            SOC and HIPAA commitments reflect platform architecture. Independent attestation reports will be available
            prior to general availability.
          </p>
        </div>
      </section>

      {/* SECTION I — About / Founder */}
      <section id="about" className="scroll-mt-24 bg-[#F5F7FA] px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Built By Accountants For Accountants</p>
          <h2 className={`mt-4 max-w-3xl text-4xl font-black tracking-[-0.04em] text-[#0A1020] md:text-5xl ${headingFont}`}>
            Designed by someone who&apos;s actually closed the books.
          </h2>
          <div className="mt-12 grid items-center gap-10 lg:grid-cols-[minmax(0,16rem)_1fr]">
            <div className="mx-auto h-56 w-56 shrink-0 overflow-hidden rounded-full border-2 border-slate-200 shadow-lg lg:h-64 lg:w-64">
              <Image
                src="/matthew-wiseman-headshot.png"
                alt="Matthew Wiseman, founder of Wiseman Financial Technologies LLC"
                width={1023}
                height={1537}
                priority={false}
                className="h-full w-full object-cover object-[center_28%]"
              />
            </div>
            <div>
              <p className="mb-4 leading-relaxed text-slate-600">
                Advisacor™ is being built by Matthew Wiseman, founder of Wiseman Financial Technologies LLC and an
                accounting professional with over a decade of experience inside the books of major public and private
                companies, supporting accounting operations for revenues of up to $8.3 billion.
              </p>
              <p className="mb-4 leading-relaxed text-slate-600">
                His career spans Fortune 500 accounting, ERP implementation, SOX documentation and controls, and the
                full library of revenue and consolidation standards — ASC 606, ASC 805, ASC 810, and ASC 842. He began
                his career in public accounting and holds a Bachelor&apos;s and Master&apos;s in Accounting from Liberty
                University.
              </p>
              <p className="mb-4 leading-relaxed text-slate-600">
                Matthew built Advisacor™ to solve the problems generic AI tools can&apos;t: framework discipline, audit
                defensibility, and the operational nuance only a working accountant recognizes.
              </p>
              <p className="text-sm font-medium text-slate-500">Headquartered in Clifton Forge, Virginia.</p>
              <a
                href="https://www.linkedin.com/in/matthew-wiseman-807bb155"
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-4 inline-flex text-sm font-semibold text-[#0A1530] transition hover:text-[#C9A961] ${focusRing("rounded")}`}
              >
                Connect on LinkedIn →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION J — Early Access */}
      <section id="early-access" className="scroll-mt-24 bg-[#0A1020] px-6 py-24 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Early Access</p>
          <h2 className={`mt-4 text-4xl font-black tracking-[-0.04em] md:text-5xl ${headingFont}`}>
            Be first when Advisacor™ opens.
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            Join the waitlist for launch updates, product previews, and early access invitations.
          </p>
          <div className="mt-10">
            <EarlyAccessForm />
          </div>
        </div>
      </section>

      {/* SECTION K — Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-14">
        <div className="mx-auto max-w-7xl">
          <Image
            src="/advisacor-logo-full.png"
            alt="Advisacor"
            width={680}
            height={340}
            className="h-20 w-auto"
          />
          <p className="mt-4 text-sm font-semibold text-slate-600">A product of Wiseman Financial Technologies LLC.</p>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 md:max-w-xl">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Contact</p>
              <ul className="mt-3 space-y-2 text-sm font-semibold">
                <li>
                  <a href="mailto:sales@advisacor.com" className={`text-[#0A1020] hover:text-[#C9A961] ${focusRing("rounded")}`}>
                    sales@advisacor.com
                  </a>
                </li>
                <li>
                  <a href="mailto:contact@advisacor.com" className={`text-[#0A1020] hover:text-[#C9A961] ${focusRing("rounded")}`}>
                    contact@advisacor.com
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Company</p>
              <ul className="mt-3 space-y-2 text-sm font-semibold">
                <li>
                  <a href="#" className={`text-[#0A1020] hover:text-[#C9A961] ${focusRing("rounded")}`}>
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/matthew-wiseman-807bb155"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-[#0A1020] hover:text-[#C9A961] ${focusRing("rounded")}`}
                  >
                    LinkedIn
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 space-y-2 border-t border-slate-200 pt-8 text-xs leading-6 text-slate-500">
            <p>
              Advisacor™ is a trademark of Wiseman Financial Technologies LLC.{" "}
              <span className="text-[#C9A961]">Trademark application pending.</span>
            </p>
            <p className="text-[#C9A961]">Patent Pending. Three U.S. provisional patent applications filed June 2026.</p>
            <p>© 2026 Wiseman Financial Technologies LLC. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
