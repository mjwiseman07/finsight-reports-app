import { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont, focusRing } from "@/components/site-ui";

export const metadata: Metadata = {
  title:
    "Advisacor for business owners — a CFO's brain without a CFO's salary",
  description:
    "Connect QuickBooks or Xero, or upload a trial balance. Get a plain-English readout of what is actually happening in your business. Built for owners of $500K–$20M businesses.",
  openGraph: {
    title:
      "Advisacor for business owners — a CFO's brain without a CFO's salary",
    description:
      "Connect QuickBooks or Xero, or upload a trial balance. Get a plain-English readout of what is actually happening in your business.",
    type: "website",
  },
};

const SIGNUP_URL = "/signup?persona=owner";

export default function OwnerPage() {
  return (
    <main className="min-h-screen bg-[#0A1530] text-white">
      <SiteNav />
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 pt-[200px] md:pt-[240px] lg:pt-[260px] pb-16 md:pb-24">
        <p className="text-sm uppercase tracking-[0.2em] text-[#C9A961] mb-6">
          For the business owner
        </p>
        <h1
          className={`${headingFont} text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight max-w-4xl`}
        >
          A CFO&apos;s brain without a CFO&apos;s salary.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed">
          Connect QuickBooks, Xero, or upload a trial balance. Advisacor reads
          your books and hands you a plain-English readout of what is actually
          happening in your business — where you are making money, where you are
          bleeding money, and what to do about it.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link
            href={SIGNUP_URL}
            className={`inline-flex items-center gap-2 rounded-full bg-[#C9A961] px-8 py-4 text-base font-semibold text-[#0B0B0C] hover:bg-[#D4B672] transition-colors ${focusRing()}`}
          >
            Start free review
            <span aria-hidden>→</span>
          </Link>
          <p className="text-sm text-white/55">
            No accounting background required. Under 15 minutes to your first
            readout.
          </p>
        </div>
      </section>
      {/* WHAT YOU ACTUALLY WANT TO KNOW */}
      <section className="border-t border-white/10 bg-[#0F0F10]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-6">
            The questions you actually ask
          </p>
          <h2
            className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-14`}
          >
            You don&apos;t need another dashboard. You need answers.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                q: "Are we actually making money right now?",
                a: "Advisacor separates real profit from vanity revenue. Gross margin by product line, service, or customer segment. Where you make money and where you subsidize losses.",
              },
              {
                q: "Where is the cash going?",
                a: "A plain-English cash flow readout. Not a dashboard — a two-paragraph summary. Where cash came from this month, where it went, and what changed vs. last month.",
              },
              {
                q: "Which customers or products are dragging me down?",
                a: "Customer and product-level profitability. The names of the accounts you should probably raise prices on, or fire.",
              },
              {
                q: "Am I about to have a cash problem?",
                a: "Forward cash runway based on your actual booking, invoicing, and expense patterns. Not a spreadsheet you have to build. An always-on read.",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-white/10 bg-[#111112] p-6"
              >
                <p className="text-[#C9A961] text-sm font-semibold mb-3">
                  {item.q}
                </p>
                <p className="text-white/75 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-6">
          How it works
        </p>
        <h2
          className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-16`}
        >
          Three steps. Under fifteen minutes.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className={`${headingFont} text-6xl font-semibold text-[#C9A961] mb-4`}>
              01
            </p>
            <h3 className={`${headingFont} text-xl font-semibold mb-3`}>
              Connect your books
            </h3>
            <p className="text-white/70 leading-relaxed">
              One click to connect QuickBooks Online or Xero. Or upload a CSV
              trial balance from any system. We read what you have — clean or
              messy — and go from there.
            </p>
          </div>
          <div>
            <p className={`${headingFont} text-6xl font-semibold text-[#C9A961] mb-4`}>
              02
            </p>
            <h3 className={`${headingFont} text-xl font-semibold mb-3`}>
              Get your first readout
            </h3>
            <p className="text-white/70 leading-relaxed">
              A plain-English monthly readout. Not a P&amp;L dump. What happened
              this period, why it matters, and what to watch. Built for you to
              read on your phone in five minutes.
            </p>
          </div>
          <div>
            <p className={`${headingFont} text-6xl font-semibold text-[#C9A961] mb-4`}>
              03
            </p>
            <h3 className={`${headingFont} text-xl font-semibold mb-3`}>
              Ask anything
            </h3>
            <p className="text-white/70 leading-relaxed">
              Ask Advisacor a plain-language question. Get a plain-language
              answer, sourced from your own books. Like having a CFO on call, at
              2 a.m., on a Tuesday.
            </p>
          </div>
        </div>
      </section>
      {/* WHAT YOU GET — outcomes, not features */}
      <section className="border-t border-white/10 bg-[#0F0F10]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-6">
            What you actually get
          </p>
          <h2
            className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-14`}
          >
            Not features. Outcomes.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: "Monthly business readout",
                body: "A plain-English monthly summary. What happened, why, what to watch. Delivered to your inbox on the 5th. Five-minute read.",
              },
              {
                title: "Ask-anything CFO chat",
                body: "Ask questions about your books in plain English. Get answers sourced from your actual numbers. No training required.",
              },
              {
                title: "Cash runway you can trust",
                body: "Forward-looking cash position based on your real invoicing and expense patterns. Updated as your books update.",
              },
              {
                title: "Profit by customer, product, or line",
                body: "See where you actually make money — down to the customer, the product line, or the service. Fire the losers, double down on the winners.",
              },
              {
                title: "Flag before you feel it",
                body: "Advisacor spots trends before they become problems. Gross margin sliding? Customer concentration risk rising? You hear it here first.",
              },
              {
                title: "Works with your bookkeeper",
                body: "You keep your bookkeeper or firm. Advisacor sits on top of your books and gives you the executive view you were never going to get from a P&L PDF.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/10 bg-[#111112] p-6"
              >
                <h3 className={`${headingFont} text-lg font-semibold mb-3`}>
                  {f.title}
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* MID-PAGE CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="rounded-3xl border border-[#C9A961]/30 bg-gradient-to-br from-[#141416] to-[#111112] p-10 md:p-16">
          <h2
            className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-6`}
          >
            See your first readout before the end of today.
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mb-10">
            Connect QuickBooks, Xero, or upload a trial balance. Under 15 minutes
            to a plain-English readout on your actual business. No card required.
          </p>
          <Link
            href={SIGNUP_URL}
            className={`inline-flex items-center gap-2 rounded-full bg-[#C9A961] px-8 py-4 text-base font-semibold text-[#0B0B0C] hover:bg-[#D4B672] transition-colors ${focusRing()}`}
          >
            Start free review
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
      {/* PRICING — single tier, simple */}
      <section className="border-t border-white/10 bg-[#0F0F10]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-6">
            Owner pricing
          </p>
          <h2
            className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-14`}
          >
            One plan. Flat rate. That&apos;s it.
          </h2>
          <div className="max-w-2xl">
            <div className="rounded-2xl border border-[#C9A961]/40 bg-[#111112] p-10">
              <p className="text-[#C9A961] text-sm font-semibold mb-2">
                Advisacor for Owners
              </p>
              <p className={`${headingFont} text-6xl font-semibold mb-2`}>
                $199
                <span className="text-lg text-white/50 font-normal">/month</span>
              </p>
              <p className="text-white/70 mb-8">
                Flat rate. Unlimited readouts. Unlimited questions.
              </p>
              <ul className="space-y-3 text-sm text-white/75">
                <li className="flex gap-3">
                  <span className="text-[#C9A961]">→</span>
                  <span>QuickBooks Online, Xero, or CSV upload</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#C9A961]">→</span>
                  <span>Monthly plain-English business readout</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#C9A961]">→</span>
                  <span>Ask-anything CFO chat</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#C9A961]">→</span>
                  <span>Cash runway forecasting</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#C9A961]">→</span>
                  <span>Customer and product-level profitability</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#C9A961]">→</span>
                  <span>Cancel anytime, keep 90 days of history on export</span>
                </li>
              </ul>
              <div className="mt-10">
                <Link
                  href={SIGNUP_URL}
                  className={`inline-flex items-center gap-2 rounded-full bg-[#C9A961] px-8 py-4 text-base font-semibold text-[#0B0B0C] hover:bg-[#D4B672] transition-colors ${focusRing()}`}
                >
                  Start free review
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </div>
          <p className="mt-6 text-sm text-white/55 max-w-2xl">
            Priced for businesses doing $500K–$20M in revenue. Above that, ask us
            about the Controller plan.
          </p>
        </div>
      </section>
      {/* BUT I HAVE A BOOKKEEPER — objection handling */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="rounded-3xl border border-white/10 bg-[#111112] p-10 md:p-16">
          <p className="text-xs uppercase tracking-[0.2em] text-[#C9A961] mb-4">
            Objection, handled
          </p>
          <h2
            className={`${headingFont} text-3xl md:text-4xl font-semibold leading-[1.15] tracking-tight max-w-3xl mb-6`}
          >
            &quot;But I already have a bookkeeper.&quot;
          </h2>
          <p className="text-lg text-white/70 max-w-3xl mb-6 leading-relaxed">
            Keep them. Advisacor is not a bookkeeping replacement — it&apos;s the
            executive layer that sits on top of whatever books you have. Your
            bookkeeper does the books. Advisacor tells you what they mean, in
            plain English, on your phone.
          </p>
          <p className="text-lg text-white/70 max-w-3xl leading-relaxed">
            If your bookkeeper wants to use Advisacor too — great, they get their
            own view. If not, that&apos;s fine too. You do not need their
            permission to understand your own numbers.
          </p>
        </div>
      </section>
      {/* FAQ */}
      <section className="border-t border-white/10 bg-[#0F0F10]">
        <div className="mx-auto max-w-4xl px-6 py-20 md:py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-6">
            Common questions from business owners
          </p>
          <h2
            className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight mb-14`}
          >
            Frequently asked.
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "I do not have an accounting background. Will this work for me?",
                a: "Yes. Advisacor is built for business owners, not accountants. Every readout is written in plain English. Every answer is sourced from your own books, so you can trust it. If you can read a text message, you can use Advisacor.",
              },
              {
                q: "My books are a mess. Is that a problem?",
                a: "Not for a first look. Connect what you have. Advisacor reads it, flags the gaps, and still gives you the clearest possible read on what is happening. As your books get cleaner, the readout gets sharper.",
              },
              {
                q: "Does Advisacor replace my accountant or bookkeeper?",
                a: "No. Advisacor sits on top of whatever books you have. You keep your bookkeeper for the day-to-day. Advisacor gives you the executive view they were never going to build for you.",
              },
              {
                q: "What if I only have a spreadsheet, not QuickBooks?",
                a: "Upload a trial balance CSV. Advisacor works. It works better once you migrate to QBO or Xero, but it works today with what you have.",
              },
              {
                q: "How do I know the numbers are right?",
                a: "Every number in every readout is sourced. Click any figure and Advisacor shows you the underlying transactions and accounts. Nothing is hidden. Nothing is invented.",
              },
              {
                q: "Is my financial data secure?",
                a: "SOC 2 aligned. Encrypted at rest and in transit. We never train models on your data. Full data processing addendum available during signup.",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-white/10 bg-[#111112] p-6"
              >
                <h3 className={`${headingFont} text-lg font-semibold mb-3`}>
                  {item.q}
                </h3>
                <p className="text-white/70 leading-relaxed">{item.a}</p>
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
          Stop guessing at your own business.
        </h2>
        <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10">
          Connect QuickBooks, Xero, or upload a trial balance. Under 15 minutes
          to a plain-English readout on what is actually happening.
        </p>
        <Link
          href={SIGNUP_URL}
          className={`inline-flex items-center gap-2 rounded-full bg-[#C9A961] px-10 py-5 text-lg font-semibold text-[#0B0B0C] hover:bg-[#D4B672] transition-colors ${focusRing()}`}
        >
          Start free review
          <span aria-hidden>→</span>
        </Link>
        <p className="mt-4 text-sm text-white/55">
          No card required. No accounting background required. Cancel anytime.
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
