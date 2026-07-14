import { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont } from "@/components/site-ui";
import WaitlistForm from "./WaitlistForm";

export const metadata: Metadata = {
  title:
    "Advisacor for manufacturing controllers — private beta this quarter",
  description:
    "Standard costing variance, WIP, PPV, absorption, and ASC 606 for manufacturers. Purpose-built for the shop floor. Join the private beta waitlist.",
  openGraph: {
    title:
      "Advisacor for manufacturing controllers — private beta this quarter",
    description:
      "Standard costing variance, WIP, PPV, absorption, and ASC 606 for manufacturers.",
    type: "website",
  },
};

export default function ManufacturingWaitlistPage() {
  return (
    <main className="min-h-screen bg-[#111112] text-white">
      <SiteNav />
      {/* HERO with inline form */}
      <section className="mx-auto max-w-6xl px-6 pt-[200px] md:pt-[240px] lg:pt-[260px] pb-16 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#C9A961] mb-6">
              For the manufacturing controller
            </p>
            <h1
              className={`${headingFont} text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight`}
            >
              Purpose-built for the shop floor.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/70 leading-relaxed">
              Standard costing variance, WIP roll-forward, PPV, absorption
              analysis, and ASC 606 for manufacturers — with the disclosure logic
              your auditor actually asks about. Private beta opens this quarter,
              limited to ten controllers.
            </p>
            <p className="mt-8 text-sm text-white/55">
              Built by an assistant controller who used to run a month-end close
              for a team of eight. This one is personal.
            </p>
          </div>
          <div>
            <WaitlistForm />
          </div>
        </div>
      </section>
      {/* WHY THIS IS DIFFERENT */}
      <section className="border-t border-white/10 bg-[#1A1A1C]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-6">
            Why manufacturing gets its own vertical
          </p>
          <h2
            className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-14`}
          >
            Generic accounting software doesn&apos;t know what a PPV is.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: "Standard costing native",
                body: "PPV, MUV, labor rate variance, labor efficiency variance, overhead spending, and overhead volume variance — computed, explained, and posted with the entry logic that ties back to your standards.",
              },
              {
                label: "WIP that actually rolls",
                body: "Beginning WIP, materials in, labor in, overhead applied, finished goods out, ending WIP. Reconciled to the GL. Broken down by job or by cost center depending on how your shop is set up.",
              },
              {
                label: "Absorption + capacity variance",
                body: "Normal vs. actual capacity, applied vs. actual overhead, and idle capacity variance — with the disclosure logic your auditor wants and the ASC 330 lower-of-cost-or-NRV write-down triggers when they apply.",
              },
            ].map((p) => (
              <div
                key={p.label}
                className="rounded-2xl border border-white/10 bg-[#111112] p-6"
              >
                <p className="text-[#C9A961] text-sm font-semibold mb-2">
                  {p.label}
                </p>
                <p className="text-white/75 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* STANDARDS + FRAMEWORKS */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-6">
          Standards Advisacor speaks
        </p>
        <h2
          className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-14`}
        >
          The standards your auditor asks about, built in.
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            "ASC 606 for manufacturers",
            "ASC 330 inventory",
            "ASC 842 leases",
            "IFRS 15 revenue",
            "IAS 2 inventory",
            "Standard costing",
            "Variance analysis",
            "WIP roll-forward",
            "PPV / MUV",
            "Labor variance",
            "Absorption analysis",
            "Capacity variance",
          ].map((s) => (
            <div
              key={s}
              className="rounded-xl border border-white/10 bg-[#111112] px-4 py-3 text-sm text-white/80"
            >
              {s}
            </div>
          ))}
        </div>
      </section>
      {/* TIMELINE STRIP */}
      <section className="border-t border-white/10 bg-[#1A1A1C]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-6">
            Timeline
          </p>
          <h2
            className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-14`}
          >
            Small cohort. Fast cadence.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-[#111112] p-6">
              <p className="text-[#C9A961] text-sm font-semibold mb-2">
                This quarter
              </p>
              <p className="text-white/75 leading-relaxed">
                Private beta opens. Ten controllers, hand-selected. Full
                white-glove onboarding directly with the founder.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#111112] p-6">
              <p className="text-[#C9A961] text-sm font-semibold mb-2">
                Following quarter
              </p>
              <p className="text-white/75 leading-relaxed">
                Waitlist expands. Broader private beta, still capped. Waitlist
                priority based on ERP, revenue band, and use case.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#111112] p-6">
              <p className="text-[#C9A961] text-sm font-semibold mb-2">
                General availability
              </p>
              <p className="text-white/75 leading-relaxed">
                Public launch. Waitlist members get founding-cohort pricing,
                grandfathered.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* FOUNDER NOTE */}
      <section className="mx-auto max-w-4xl px-6 py-20 md:py-28">
        <div className="rounded-3xl border border-white/10 bg-[#111112] p-10 md:p-14">
          <p className="text-xs uppercase tracking-[0.2em] text-[#C9A961] mb-4">
            A note from the founder
          </p>
          <div className="space-y-4 text-white/75 leading-relaxed text-lg">
            <p>
              I spent years as an assistant controller running month-end close
              for a team of eight. I know what a standard-cost audit trail
              actually needs to look like. I know why generic accounting AI
              breaks on WIP. I know why every controller I&apos;ve met has a
              spreadsheet named something like &quot;monthly variance
              rollup_FINAL_v7_use this one.xlsx.&quot;
            </p>
            <p>
              This vertical is Wave 2 because I wanted to get it right, not fast.
              The private beta is limited to ten controllers because I want to
              onboard each of you myself, learn what your close actually looks
              like, and build the tool I would have wanted when I was in your
              chair.
            </p>
            <p>
              If you&apos;re running a real manufacturing close and you&apos;re
              tired of every &quot;AI accounting&quot; product being a bookkeeper
              tool with a manufacturing sticker on it, join the waitlist. I
              read every submission personally.
            </p>
          </div>
          <p className="mt-8 text-sm text-white/60">
            — Matthew Wiseman, Founder, Advisacor
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
