import { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { WaitlistCapture } from "@/components/WaitlistCapture";
import { headingFont, focusRing } from "@/components/site-ui";

export const metadata: Metadata = {
  title:
    "Advisacor for solo bookkeepers — handle 25 clients like you handle 10",
  description:
    "AI drafts the monthly close on your QuickBooks Online clients. You review, adjust, and send. Built for solo bookkeepers with 1–10 QBO clients. Start free.",
  openGraph: {
    title:
      "Advisacor for solo bookkeepers — handle 25 clients like you handle 10",
    description:
      "AI drafts the monthly close on your QuickBooks Online clients. You review, adjust, and send.",
    type: "website",
  },
};


export default function BookkeeperPage() {
  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 pt-16 md:pt-20 lg:pt-24 pb-16 md:pb-24">
        <p className="text-sm uppercase tracking-[0.2em] text-[#C9A961] mb-6">
          For the solo bookkeeper
        </p>
        <h1
          className={`${headingFont} text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight max-w-4xl`}
        >
          Handle 25 clients like you handle 10.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-[#A29E93] max-w-2xl leading-relaxed">
          Advisacor drafts the monthly close on your QuickBooks Online clients.
          You review, adjust, and send. No more burning weekends on adjusting
          entries and tie-outs.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Launching soon"
            className={`inline-flex items-center gap-2 rounded-full bg-[#C9A961] px-8 py-4 text-base font-semibold text-[#111112] opacity-60 cursor-not-allowed transition-colors ${focusRing()}`}
          >
            Start free review
            <span aria-hidden>→</span>
          </button>
          <p className="text-sm text-[#7A7974]">
            Launching soon — join the waitlist for pilot access.
          </p>
        </div>
      </section>
      {/* PROBLEM BAND */}
      <section className="border-t border-[#C9A961]/20 bg-[#1A1A1C]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-[#7A7974] mb-6">
            The solo bookkeeper problem
          </p>
          <h2
            className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-14`}
          >
            You&apos;re not a bookkeeping problem. You&apos;re a capacity problem.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] p-6">
              <p className="text-[#C9A961] text-sm font-semibold mb-2">Month-end</p>
              <p className="text-[#A29E93] leading-relaxed">
                Every close eats the same 4–6 hours per client — reclassifications,
                bank tie-outs, uncategorized transactions, owner reimbursements.
                Multiply by 10 clients and your month never ends.
              </p>
            </div>
            <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] p-6">
              <p className="text-[#C9A961] text-sm font-semibold mb-2">Growth</p>
              <p className="text-[#A29E93] leading-relaxed">
                You&apos;d take on more clients, but you already work weekends.
                Hiring a subcontractor means training, review, and margin loss.
                So you cap at 10 and leave money on the table.
              </p>
            </div>
            <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] p-6">
              <p className="text-[#C9A961] text-sm font-semibold mb-2">Risk</p>
              <p className="text-[#A29E93] leading-relaxed">
                One missed reclassification or an out-of-period entry becomes
                your problem — even when the owner miscategorized it in QBO.
                You need a second set of eyes you can trust.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <p className="text-xs uppercase tracking-[0.2em] text-[#7A7974] mb-6">
          How it works
        </p>
        <h2
          className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-16`}
        >
          Three steps. Fifteen minutes to first draft.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className={`${headingFont} text-6xl font-semibold text-[#C9A961] mb-4`}>
              01
            </p>
            <h3 className={`${headingFont} text-xl font-semibold mb-3`}>
              Connect QuickBooks
            </h3>
            <p className="text-[#A29E93] leading-relaxed">
              One-click OAuth into your first client&apos;s QBO file. We pull the
              trial balance, chart of accounts, and transaction history. Read-only
              until you tell us otherwise.
            </p>
          </div>
          <div>
            <p className={`${headingFont} text-6xl font-semibold text-[#C9A961] mb-4`}>
              02
            </p>
            <h3 className={`${headingFont} text-xl font-semibold mb-3`}>
              Advisacor drafts the close
            </h3>
            <p className="text-[#A29E93] leading-relaxed">
              Reclassifications, accruals, prepaids, bank ties, and owner
              adjustments — proposed with reasoning you can audit. Auto-detected
              industry framework applied (retail, services, healthcare, and more).
            </p>
          </div>
          <div>
            <p className={`${headingFont} text-6xl font-semibold text-[#C9A961] mb-4`}>
              03
            </p>
            <h3 className={`${headingFont} text-xl font-semibold mb-3`}>
              Review and send
            </h3>
            <p className="text-[#A29E93] leading-relaxed">
              Accept, edit, or reject each proposed entry. Push adjusting entries
              back to QBO with one click. Export a plain-English monthly report
              for your client.
            </p>
          </div>
        </div>
      </section>
      {/* FEATURE GRID */}
      <section className="border-t border-[#C9A961]/20 bg-[#1A1A1C]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-[#7A7974] mb-6">
            Built for the way you actually work
          </p>
          <h2
            className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-14`}
          >
            Every close is a conversation with your AI teammate.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: "Auto industry detection",
                body: "Advisacor reads the chart of accounts and applies the right framework — retail, services, construction, healthcare, non-profit, SaaS, manufacturing, professional services, government contracting, or fund accounting.",
              },
              {
                title: "Reclassification engine",
                body: "Catches miscategorized transactions the owner made in QBO. Proposes the right account with reasoning you can read.",
              },
              {
                title: "Accrual + prepaid tracking",
                body: "Remembers monthly rent, insurance, and subscription patterns. Proposes accruals and prepaid amortizations without you re-explaining every month.",
              },
              {
                title: "Bank + credit card tie-outs",
                body: "Reconciles to statement balance. Flags timing differences and outstanding checks with the exact transactions that need attention.",
              },
              {
                title: "Client-ready monthly report",
                body: "Plain-English narrative for the owner: what happened, what to watch, what to ask about. Not a P&L dump.",
              },
              {
                title: "Audit trail on every entry",
                body: "Every AI-proposed entry logs the source data, the reasoning, and your accept/edit/reject decision. If you ever need to explain a number, it's there.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] p-6"
              >
                <h3 className={`${headingFont} text-lg font-semibold mb-3`}>
                  {f.title}
                </h3>
                <p className="text-sm text-[#A29E93] leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* MID-PAGE CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="rounded-3xl border border-[#C9A961]/30 bg-gradient-to-br from-[#1A1A1C] to-[#111112] p-10 md:p-16">
          <h2
            className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-6`}
          >
            See Advisacor draft a real close on one of your clients.
          </h2>
          <p className="text-lg text-[#A29E93] max-w-2xl mb-10">
            Connect one QBO file. Watch the draft close land in under 15 minutes.
            No card. No commitment. Just proof it works on your data.
          </p>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Launching soon"
            className={`inline-flex items-center gap-2 rounded-full bg-[#C9A961] px-8 py-4 text-base font-semibold text-[#111112] opacity-60 cursor-not-allowed transition-colors ${focusRing()}`}
          >
            Start free review
            <span aria-hidden>→</span>
          </button>
        </div>
      </section>
      {/* PRICING */}
      <section className="border-t border-[#C9A961]/20 bg-[#1A1A1C]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-[#7A7974] mb-6">
            Solo bookkeeper pricing
          </p>
          <h2
            className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-14`}
          >
            Priced for a real practice — or lighter if you&apos;re still evaluating.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
            <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] p-8">
              <p className="text-[#C9A961] text-sm font-semibold mb-2">
                Solo Starter
              </p>
              <p className={`${headingFont} text-5xl font-semibold mb-2`}>
                $79
                <span className="text-base text-[#7A7974] font-normal">/month</span>
              </p>
              <p className="text-[#A29E93] mb-8">1–3 QBO clients</p>
              <ul className="space-y-3 text-sm text-[#A29E93]">
                <li className="flex gap-3">
                  <span className="text-[#C9A961]">→</span>
                  <span>Full review-assist close on every client</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#C9A961]">→</span>
                  <span>Auto industry detection</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#C9A961]">→</span>
                  <span>Monthly client-ready reports</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#C9A961]">→</span>
                  <span>Full audit trail</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#C9A961]">→</span>
                  <span>Full Close early-access add-on: $149/client/mo</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#C9A961]/40 bg-[#111112] p-8 relative">
              <span className="absolute -top-3 left-8 px-3 py-1 text-[10px] uppercase tracking-wider bg-[#C9A961] text-[#111112] font-semibold rounded-full">
                Most solo bookkeepers pick this
              </span>
              <p className="text-[#C9A961] text-sm font-semibold mb-2">Solo Pro</p>
              <p className={`${headingFont} text-5xl font-semibold mb-2`}>
                $149
                <span className="text-base text-[#7A7974] font-normal">/month</span>
              </p>
              <p className="text-[#A29E93] mb-8">4–10 QBO clients</p>
              <ul className="space-y-3 text-sm text-[#A29E93]">
                <li className="flex gap-3">
                  <span className="text-[#C9A961]">→</span>
                  <span>Everything in Solo Starter</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#C9A961]">→</span>
                  <span>Multi-client dashboard</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#C9A961]">→</span>
                  <span>Batch close review across clients</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#C9A961]">→</span>
                  <span>Priority email support</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#C9A961]">→</span>
                  <span>Full Close early-access add-on: $149/client/mo</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 max-w-4xl">
            <div className="rounded-2xl border border-[#C9A961]/30 bg-[#1A1A1C] p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex-1">
                  <p className="text-[#C9A961] text-xs uppercase tracking-[0.2em] font-semibold mb-2">
                    Or, lighter option
                  </p>
                  <h3 className={`${headingFont} text-2xl md:text-3xl font-semibold mb-3`}>
                    Review Assist — $99/mo
                  </h3>
                  <p className="text-[#A29E93] leading-relaxed max-w-2xl">
                    Read-only close review. 9-source findings feed (variance,
                    anomalies, reconciliation, cutoff, duplicates) plus an
                    8-assertion coverage badge — but no write-back to QBO.
                    Ideal if you want a second set of AI eyes on the close
                    before you&apos;re ready for full automation.
                  </p>
                </div>
                <div className="shrink-0">
                  <Link
                    href="/signup?persona=bookkeeper&plan=review_assist&mode=flat"
                    className={`inline-flex items-center gap-2 rounded-full bg-[#C9A961] px-6 py-3 text-sm font-semibold text-[#111112] transition hover:bg-[#DFC084] ${focusRing()}`}
                  >
                    Start Review Assist
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-6 text-sm text-[#7A7974] max-w-2xl">
            All plans include unlimited monthly closes on your covered clients.
            No per-close fees. No per-transaction fees. Cancel anytime.
          </p>
        </div>
      </section>
      {/* FULL CLOSE STRIP */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <div className="rounded-3xl border border-[#C9A961]/20 bg-[#111112] p-10 md:p-14">
          <p className="text-xs uppercase tracking-[0.2em] text-[#C9A961] mb-4">
            Full Close early access · limited pilot
          </p>
          <h2
            className={`${headingFont} text-3xl md:text-4xl font-semibold leading-[1.15] tracking-tight max-w-3xl mb-6`}
          >
            Want Advisacor to do the close for you?
          </h2>
          <p className="text-lg text-[#A29E93] max-w-2xl mb-8 leading-relaxed">
            For an add-on fee per client, our team drafts and reconciles the entire
            monthly close, human-QA&apos;s it, and hands it back to you ready for
            your client sign-off. Limited to 10 pilot clients in Wave 1.
          </p>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Launching soon"
            className={`inline-flex items-center gap-2 text-[#C9A961] opacity-60 cursor-not-allowed transition-colors text-base font-semibold ${focusRing()}`}
          >
            Apply for Full Close pilot during signup
            <span aria-hidden>→</span>
          </button>
        </div>
      </section>
      {/* FAQ */}
      <section className="border-t border-[#C9A961]/20 bg-[#1A1A1C]">
        <div className="mx-auto max-w-4xl px-6 py-20 md:py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-[#7A7974] mb-6">
            Common questions from solo bookkeepers
          </p>
          <h2
            className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight mb-14`}
          >
            Frequently asked.
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "Does Advisacor replace me?",
                a: "No. Advisacor drafts the close so you can review, edit, and send faster. The relationship with the client, the judgment calls, and the final sign-off are always yours. We're a capacity multiplier, not a replacement.",
              },
              {
                q: "What if the AI proposes a wrong entry?",
                a: "You reject or edit it. Every proposed entry shows its reasoning and source data. Nothing is pushed to QBO until you approve. Rejections train the model on your client's patterns over time.",
              },
              {
                q: "Do you support Xero or only QuickBooks?",
                a: "Wave 1 is QuickBooks Online only for the solo bookkeeper plan. Xero support is on the roadmap and already available for firm plans. If you're QBO-only, you're fully supported today.",
              },
              {
                q: "Is my client data secure?",
                a: "Yes. SOC 2 aligned, HIPAA-ready. Client data is encrypted at rest and in transit. We never train models on your client data. Read the data processing addendum during signup.",
              },
              {
                q: "How long is onboarding?",
                a: "First QBO connection to first draft close: under 15 minutes. That includes OAuth, initial trial balance pull, and industry framework detection.",
              },
              {
                q: "What happens if I cancel?",
                a: "You keep read-only access to your existing close data for 90 days. You can export everything. No auto-renewals into higher tiers. No cancellation fees.",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] p-6"
              >
                <h3 className={`${headingFont} text-lg font-semibold mb-3`}>
                  {item.q}
                </h3>
                <p className="text-[#A29E93] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* FINAL CTA BAND */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32 text-center">
        <h2
          className={`${headingFont} text-4xl md:text-6xl font-semibold leading-[1.05] tracking-tight max-w-3xl mx-auto mb-8`}
        >
          Your next month-end doesn&apos;t have to eat your weekend.
        </h2>
        <p className="text-lg md:text-xl text-[#A29E93] max-w-2xl mx-auto mb-10">
          Connect one QuickBooks client. See the draft close in under 15 minutes.
          Decide from there.
        </p>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Launching soon"
          className={`inline-flex items-center gap-2 rounded-full bg-[#C9A961] px-10 py-5 text-lg font-semibold text-[#111112] opacity-60 cursor-not-allowed transition-colors ${focusRing()}`}
        >
          Start free review
          <span aria-hidden>→</span>
        </button>
        <p className="mt-4 text-sm text-[#7A7974]">
          Launching soon — join the waitlist below.
        </p>
        <div className="mt-8 max-w-md mx-auto">
          <WaitlistCapture skuKey="solo_bookkeeper" />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
