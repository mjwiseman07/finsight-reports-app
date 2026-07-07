"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { focusRing, headingFont, primaryCtaClass } from "@/components/site-ui";

type Industry = {
  slug: string;
  name: string;
  eyebrow: string;
  title: string;
  body: string;
  coverage: string[];
};

const industries: Industry[] = [
  {
    slug: "healthcare",
    name: "Healthcare",
    eyebrow: "ASC 606 · HIPAA · Per-Patient-Day",
    title: "Healthcare",
    body:
      "Practices, clinics, and multi-site providers. Advisacor tracks per-patient-day economics, payer-mix variance, and revenue-recognition rules unique to healthcare — with disclosure libraries built in.",
    coverage: [
      "Per-patient-day KPIs and payer-mix reporting",
      "ASC 606 healthcare revenue recognition",
      "HIPAA-ready audit trail on every entry",
    ],
  },
  {
    slug: "manufacturing",
    name: "Manufacturing",
    eyebrow: "Weighted Avg · FIFO · Cost Rollups",
    title: "Manufacturing",
    body:
      "Discrete and process manufacturers. Weighted-average and FIFO costing, standard-cost variances, work-in-process tracking, and BOM roll-ups — with the disclosure libraries auditors expect.",
    coverage: [
      "Inventory costing (WAVG, FIFO, standard)",
      "Work-in-process and BOM roll-up reporting",
      "Manufacturing-specific KPIs and benchmarks",
    ],
  },
  {
    slug: "construction",
    name: "Construction",
    eyebrow: "Percentage-of-Completion · ASC 606 · ASC 842",
    title: "Construction",
    body:
      "General contractors, specialty trades, and construction managers. Percentage-of-completion revenue, job-cost variance, retainage, and ASC 842 lease reporting — with construction-specific disclosures.",
    coverage: [
      "Percentage-of-completion revenue and job-cost variance",
      "Retainage and progress-billing tracking",
      "ASC 842 lease accounting for equipment fleets",
    ],
  },
  {
    slug: "retail",
    name: "Retail",
    eyebrow: "SKU · POS Reconciliation · Shrinkage",
    title: "Retail",
    body:
      "Single-location and multi-location retail. SKU-level margin, POS reconciliation, shrinkage analysis, and inventory-turn benchmarks — with omnichannel revenue recognition built in.",
    coverage: [
      "SKU-level margin and inventory-turn analysis",
      "POS-to-GL reconciliation across locations",
      "Omnichannel revenue recognition under ASC 606",
    ],
  },
  {
    slug: "professional-services",
    name: "Professional Services",
    eyebrow: "Utilization · Realization · WIP",
    title: "Professional Services",
    body:
      "Consulting, legal, agency, and professional-services firms. Utilization and realization tracking, WIP schedules, time-based revenue recognition, and per-partner economics — with the disclosures your firm needs.",
    coverage: [
      "Utilization, realization, and per-consultant KPIs",
      "WIP schedules and time-based revenue recognition",
      "Multi-entity and multi-partner reporting",
    ],
  },
  {
    slug: "saas-technology",
    name: "SaaS / Technology",
    eyebrow: "ARR · Net Retention · Deferred Revenue",
    title: "SaaS / Technology",
    body:
      "SaaS, subscription, and technology companies. ARR and net-retention tracking, deferred-revenue waterfalls, capitalized software, and ASC 606 subscription revenue — with SaaS-specific disclosures.",
    coverage: [
      "ARR, MRR, net-revenue-retention, and churn analytics",
      "Deferred-revenue waterfalls and ASC 606 subscription recognition",
      "Capitalized software and R&D reporting",
    ],
  },
  {
    slug: "wholesale-distribution",
    name: "Wholesale Distribution",
    eyebrow: "GMROI · Turn · Landed Cost",
    title: "Wholesale Distribution",
    body:
      "Distributors, importers, and wholesale merchants. GMROI, inventory-turn analytics, landed-cost accounting, and multi-warehouse reporting — with the specialized disclosures distributors face.",
    coverage: [
      "GMROI and inventory-turn analytics by SKU and vendor",
      "Landed-cost accounting across freight, duty, and handling",
      "Multi-warehouse and multi-currency reporting",
    ],
  },
  {
    slug: "real-estate",
    name: "Real Estate",
    eyebrow: "NOI · Cap Rate · Straight-Line Rent",
    title: "Real Estate",
    body:
      "Property owners, operators, and real-estate holding entities. NOI, cap-rate, straight-line rent recognition, and CAM reconciliation — with the tenant-level and property-level reporting owners expect.",
    coverage: [
      "Property-level NOI, cap-rate, and yield analytics",
      "Straight-line rent recognition and CAM reconciliation",
      "Multi-property and multi-entity portfolio reporting",
    ],
  },
  {
    slug: "franchise",
    name: "Franchise",
    eyebrow: "Royalty · Same-Store · Unit Economics",
    title: "Franchise",
    body:
      "Franchisors and multi-unit franchisees. Royalty computation and reconciliation, same-store sales, unit-economics reporting, and franchise-disclosure-document alignment.",
    coverage: [
      "Royalty computation, reconciliation, and variance analysis",
      "Same-store-sales and unit-economics dashboards",
      "Multi-unit consolidation with per-location reporting",
    ],
  },
  {
    slug: "nonprofit",
    name: "Nonprofit",
    eyebrow: "ASC 958 · Grants · Restricted Funds",
    title: "Nonprofit",
    body:
      "501(c)(3) and mission-driven organizations. Restricted-fund tracking, grant reporting, functional-expense allocation under ASC 958, and program-versus-support economics.",
    coverage: [
      "Restricted, temporarily-restricted, and unrestricted fund tracking",
      "Grant reporting and functional-expense allocation (ASC 958)",
      "Program-versus-support cost analytics",
    ],
  },
];

export default function IndustriesPage() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < maxScroll - 4);
    const children = Array.from(el.children) as HTMLElement[];
    if (children.length === 0) return;
    let closest = 0;
    let closestDelta = Number.POSITIVE_INFINITY;
    const scrollerLeft = el.getBoundingClientRect().left;
    children.forEach((child, i) => {
      const delta = Math.abs(child.getBoundingClientRect().left - scrollerLeft);
      if (delta < closestDelta) {
        closestDelta = delta;
        closest = i;
      }
    });
    setActiveIndex(closest);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateEdges();
    const onScroll = () => updateEdges();
    el.addEventListener("scroll", onScroll, { passive: true });
    const onResize = () => updateEdges();
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [updateEdges]);

  const scrollToIndex = useCallback((idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    const target = children[Math.max(0, Math.min(industries.length - 1, idx))];
    if (!target) return;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({
      left: target.offsetLeft - el.offsetLeft,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, []);

  const onPrev = () => scrollToIndex(activeIndex - 1);
  const onNext = () => scrollToIndex(activeIndex + 1);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onPrev();
    }
  };

  return (
    <main className="min-h-screen bg-[#0A1530] text-white">
      <SiteNav />
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-12 pt-[300px] md:pb-16 md:pt-[380px] lg:pt-[440px]">
        <p className="mb-6 text-sm font-semibold uppercase tracking-[0.22em] text-[#C9A961] md:text-base">
          Industries
        </p>
        <h1
          className={`${headingFont} max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl`}
        >
          Ten verticals. One platform.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70 md:text-xl">
          Advisacor ships industry-aware KPIs, disclosure libraries, and benchmark
          frameworks for every vertical below. Each is built on the same trust stack —
          the accounting logic is what changes.
        </p>
      </section>
      {/* Snap-scroll carousel */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative">
          <div
            ref={scrollerRef}
            onKeyDown={onKeyDown}
            tabIndex={0}
            role="region"
            aria-label="Industry coverage carousel"
            className={`flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${focusRing("rounded-2xl")}`}
          >
            {industries.map((ind) => (
              <article
                key={ind.slug}
                className="w-[85%] flex-none snap-start rounded-3xl border border-white/10 bg-white/[0.04] p-8 sm:w-[60%] md:w-[45%] lg:w-[calc((100%-2rem)/3.25)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A961]">
                  {ind.eyebrow}
                </p>
                <h2
                  className={`${headingFont} mt-4 text-2xl font-semibold leading-tight tracking-tight md:text-3xl`}
                >
                  {ind.title}
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-white/70 md:text-base">
                  {ind.body}
                </p>
                <ul className="mt-6 grid gap-2.5">
                  {ind.coverage.map((c) => (
                    <li
                      key={c}
                      className="flex items-start gap-3 text-xs text-white/75 md:text-sm"
                    >
                      <span aria-hidden className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-[#C9A961]" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrev}
                disabled={!canPrev}
                aria-label="Previous industry"
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white/80 transition-colors hover:border-[#C9A961]/60 hover:text-[#C9A961] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/15 disabled:hover:text-white/80 ${focusRing("rounded-full")}`}
              >
                <span aria-hidden>←</span>
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!canNext}
                aria-label="Next industry"
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white/80 transition-colors hover:border-[#C9A961]/60 hover:text-[#C9A961] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/15 disabled:hover:text-white/80 ${focusRing("rounded-full")}`}
              >
                <span aria-hidden>→</span>
              </button>
            </div>
            <div className="flex items-center gap-2" role="tablist" aria-label="Industry slides">
              {industries.map((ind, i) => (
                <button
                  key={ind.slug}
                  type="button"
                  role="tab"
                  aria-selected={activeIndex === i}
                  aria-label={`Go to ${ind.name}`}
                  onClick={() => scrollToIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    activeIndex === i
                      ? "w-6 bg-[#C9A961]"
                      : "w-1.5 bg-white/25 hover:bg-white/40"
                  } ${focusRing("rounded-full")}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* Closing strip */}
      <section className="border-t border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <h2
            className={`${headingFont} max-w-3xl text-3xl font-semibold leading-[1.1] tracking-tight md:text-5xl`}
          >
            Don't see your vertical? It's likely on the roadmap.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            Advisacor's industry framework is built to add verticals on a published
            cadence. Tell us what you run — if it isn't live, we'll tell you when.
          </p>
          <div className="mt-10">
            <Link
              href="/free-review"
              className={`inline-flex items-center justify-center rounded-full px-8 py-4 text-base ${primaryCtaClass} ${focusRing()}`}
            >
              Request Early Access
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
