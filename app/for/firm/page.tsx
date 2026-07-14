import { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont, focusRing } from "@/components/site-ui";

export const metadata: Metadata = {
  title:
    "Advisacor for bookkeeping and accounting firms — never scramble when staff leaves",
  description:
    "Multi-client dashboard, AI review assist across your book of business, and Full Close elastic capacity for when your team is short-staffed. Built for 3–30 person firms.",
  openGraph: {
    title:
      "Advisacor for bookkeeping and accounting firms — never scramble when staff leaves",
    description:
      "Multi-client dashboard, AI review assist, and Full Close elastic capacity.",
    type: "website",
  },
};

const SIGNUP_URL = "/signup?persona=firm";

export default function FirmPage() {
  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 pt-[200px] md:pt-[240px] lg:pt-[260px] pb-16 md:pb-24">
        <p className="text-sm uppercase tracking-[0.2em] text-[#C9A961] mb-6">
          For the firm
        </p>
        <h1
          className={`${headingFont} text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight max-w-4xl`}
        >
          Never scramble when a bookkeeper leaves.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-[#A29E93] max-w-2xl leading-relaxed">
          Advisacor gives your firm a shared AI teammate across every client
          engagement, a real-time multi-client dashboard, and elastic Full Close
          capacity when your team is short-staffed. Standardized closes.
          Predictable capacity. No more scrambling.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link
            href={SIGNUP_URL}
            className={`inline-flex items-center gap-2 rounded-full bg-[#C9A961] px-8 py-4 text-base font-semibold text-[#111112] hover:bg-[#DFC084] transition-colors ${focusRing()}`}
          >
            Start free review
            <span aria-hidden>→</span>
          </Link>
          <p className="text-sm text-[#7A7974]">
            Connect your QuickBooks Accountant firm master. Under 15 minutes.
          </p>
        </div>
      </section>
      {/* PROBLEM BAND */}
      <section className="border-t border-[#C9A961]/20 bg-[#1A1A1C]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-[#7A7974] mb-6">
            What breaks a firm
          </p>
          <h2
            className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-14`}
          >
            The three failure modes every firm owner already knows.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: "Staffing risk",
                body: "A senior bookkeeper gives notice. She had 12 clients. Half her workpapers live in her head. You have 30 days to hire, train, and hope nothing drops. Your Q-end just became a bonfire.",
              },
              {
                label: "Firm-wide inconsistency",
                body: "Every bookkeeper closes differently. Different accrual habits, different reclass logic, different report formats. When a client moves between staff, they notice. When you review workpapers, you spend more time on style than substance.",
              },
              {
                label: "Capacity spikes you cannot hire for",
                body: "You take on 4 new clients in Q1. You lose 2 staff in Q3. You cannot hire fast enough for the swing. Contractors are expensive and inconsistent. So you burn out your seniors instead.",
              },
            ].map((p) => (
              <div
                key={p.label}
                className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] p-6"
              >
                <p className="text-[#C9A961] text-sm font-semibold mb-2">
                  {p.label}
                </p>
                <p className="text-[#A29E93] leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <p className="text-xs uppercase tracking-[0.2em] text-[#7A7974] mb-6">
          How it works for a firm
        </p>
        <h2
          className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-16`}
        >
          Firm master to standardized close in fifteen minutes.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className={`${headingFont} text-6xl font-semibold text-[#C9A961] mb-4`}>
              01
            </p>
            <h3 className={`${headingFont} text-xl font-semibold mb-3`}>
              Connect your firm master
            </h3>
            <p className="text-[#A29E93] leading-relaxed">
              One OAuth into QuickBooks Online Accountant pulls every client file
              your firm manages. Xero support rolling out in Wave 1. Seat and
              permission controls per staff member.
            </p>
          </div>
          <div>
            <p className={`${headingFont} text-6xl font-semibold text-[#C9A961] mb-4`}>
              02
            </p>
            <h3 className={`${headingFont} text-xl font-semibold mb-3`}>
              Standardize every close
            </h3>
            <p className="text-[#A29E93] leading-relaxed">
              Firm-wide close templates, industry frameworks, and review
              checklists. Every bookkeeper on your team closes to the same
              standard. Every client report reads like it came from the same firm,
              because now it does.
            </p>
          </div>
          <div>
            <p className={`${headingFont} text-6xl font-semibold text-[#C9A961] mb-4`}>
              03
            </p>
            <h3 className={`${headingFont} text-xl font-semibold mb-3`}>
              Full Close when you need it
            </h3>
            <p className="text-[#A29E93] leading-relaxed">
              Losing staff or spiking on new engagements? Turn on Full Close for
              a subset of clients. Our team drafts and reconciles, human-QAs,
              hands it back to your partner for sign-off. Turn it off when you
              rehire.
            </p>
          </div>
        </div>
      </section>
      {/* FEATURE GRID */}
      <section className="border-t border-[#C9A961]/20 bg-[#1A1A1C]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-[#7A7974] mb-6">
            Built for firm operations
          </p>
          <h2
            className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-14`}
          >
            Everything your close manager wishes existed.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: "Multi-client dashboard",
                body: "Every client, every close, every status on one screen. Filter by owner, by industry, by close stage. Spot the slippage before month-end 20th.",
              },
              {
                title: "Firm-wide standardization",
                body: "Close templates, review checklists, and report formats set at the firm level. Every staff member closes to the same standard. Every client output looks the same.",
              },
              {
                title: "Seat + permission controls",
                body: "Assign clients to staff. Restrict Full Close visibility. Partner-only report approval. SOC 2 aligned access controls.",
              },
              {
                title: "Elastic Full Close capacity",
                body: "Turn Full Close on for one client, five clients, or twenty. Off-boarding a senior? Onboarding a new engagement? Adjust capacity per month without a hire.",
              },
              {
                title: "Ten industry frameworks live",
                body: "Retail, healthcare, non-profit, SaaS, manufacturing, professional services, construction, government contracting, fund accounting, and services. Auto-detected from the chart of accounts.",
              },
              {
                title: "Full audit trail across the firm",
                body: "Every AI-proposed entry, every human accept or edit, every partner sign-off, timestamped and searchable. Peer review and workpaper review just got a lot faster.",
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
        <div className="rounded-3xl border border-[#C9A961]/30 bg-gradient-to-br from-[#141416] to-[#111112] p-10 md:p-16">
          <h2
            className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-6`}
          >
            See your entire book of business on one screen.
          </h2>
          <p className="text-lg text-[#A29E93] max-w-2xl mb-10">
            Connect your QuickBooks Accountant firm master. Under 15 minutes to
            see every client, every close status, every AI-proposed entry across
            your firm.
          </p>
          <Link
            href={SIGNUP_URL}
            className={`inline-flex items-center gap-2 rounded-full bg-[#C9A961] px-8 py-4 text-base font-semibold text-[#111112] hover:bg-[#DFC084] transition-colors ${focusRing()}`}
          >
            Start free review
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
      {/* FULL CLOSE PILOT BAND — bigger for firms */}
      <section className="border-t border-[#C9A961]/20 bg-[#1A1A1C]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <p className="text-xs uppercase tracking-[0.2em] text-[#C9A961] mb-4">
            Full Close early access · limited to 5 firms in Wave 1
          </p>
          <h2
            className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-8`}
          >
            The staff-insurance mode.
          </h2>
          <p className="text-lg text-[#A29E93] max-w-3xl mb-10 leading-relaxed">
            For a per-client add-on fee, our team drafts and reconciles the
            monthly close, human-QAs it, and hands it back to your firm ready for
            partner review. Turn it on for the clients where you are short-staffed.
            Turn it off when you rehire. Elastic capacity without a permanent
            headcount decision.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] p-6">
              <p className="text-[#C9A961] text-sm font-semibold mb-2">
                Firm Starter add-on
              </p>
              <p className={`${headingFont} text-3xl font-semibold mb-2`}>
                $149
                <span className="text-sm text-[#7A7974] font-normal">
                  /client/mo
                </span>
              </p>
              <p className="text-sm text-[#A29E93]">Up to 10 firm clients</p>
            </div>
            <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] p-6">
              <p className="text-[#C9A961] text-sm font-semibold mb-2">
                Firm Growth add-on
              </p>
              <p className={`${headingFont} text-3xl font-semibold mb-2`}>
                $129
                <span className="text-sm text-[#7A7974] font-normal">
                  /client/mo
                </span>
              </p>
              <p className="text-sm text-[#A29E93]">Up to 30 firm clients</p>
            </div>
            <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] p-6">
              <p className="text-[#C9A961] text-sm font-semibold mb-2">
                Firm Scale add-on
              </p>
              <p className={`${headingFont} text-3xl font-semibold mb-2`}>
                $99
                <span className="text-sm text-[#7A7974] font-normal">
                  /client/mo
                </span>
              </p>
              <p className="text-sm text-[#A29E93]">30+ firm clients</p>
            </div>
          </div>
          <Link
            href={SIGNUP_URL}
            className={`inline-flex items-center gap-2 text-[#C9A961] hover:text-[#DFC084] transition-colors text-base font-semibold ${focusRing()}`}
          >
            Apply for Full Close pilot during signup
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
      {/* PRICING */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <p className="text-xs uppercase tracking-[0.2em] text-[#7A7974] mb-6">
          Firm pricing
        </p>
        <h2
          className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight max-w-3xl mb-14`}
        >
          Three plans. Per firm, not per seat.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] p-8">
            <p className="text-[#C9A961] text-sm font-semibold mb-2">
              Firm Starter
            </p>
            <p className={`${headingFont} text-5xl font-semibold mb-2`}>
              $299
              <span className="text-base text-[#7A7974] font-normal">/month</span>
            </p>
            <p className="text-[#A29E93] mb-8">Up to 10 firm clients</p>
            <ul className="space-y-3 text-sm text-[#A29E93]">
              <li className="flex gap-3">
                <span className="text-[#C9A961]">→</span>
                <span>Unlimited staff seats</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#C9A961]">→</span>
                <span>Multi-client dashboard</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#C9A961]">→</span>
                <span>Firm-wide standardization</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#C9A961]">→</span>
                <span>Full audit trail</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#C9A961]">→</span>
                <span>Full Close add-on at $149/client/mo</span>
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[#C9A961]/40 bg-[#111112] p-8 relative">
            <span className="absolute -top-3 left-8 px-3 py-1 text-[10px] uppercase tracking-wider bg-[#C9A961] text-[#111112] font-semibold rounded-full">
              Most firms pick this
            </span>
            <p className="text-[#C9A961] text-sm font-semibold mb-2">
              Firm Growth
            </p>
            <p className={`${headingFont} text-5xl font-semibold mb-2`}>
              $599
              <span className="text-base text-[#7A7974] font-normal">/month</span>
            </p>
            <p className="text-[#A29E93] mb-8">Up to 30 firm clients</p>
            <ul className="space-y-3 text-sm text-[#A29E93]">
              <li className="flex gap-3">
                <span className="text-[#C9A961]">→</span>
                <span>Everything in Firm Starter</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#C9A961]">→</span>
                <span>Priority support</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#C9A961]">→</span>
                <span>Custom close templates</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#C9A961]">→</span>
                <span>SSO for staff seats</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#C9A961]">→</span>
                <span>Full Close add-on at $129/client/mo</span>
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] p-8">
            <p className="text-[#C9A961] text-sm font-semibold mb-2">
              Firm Scale
            </p>
            <p className={`${headingFont} text-5xl font-semibold mb-2`}>
              $999
              <span className="text-base text-[#7A7974] font-normal">/month</span>
            </p>
            <p className="text-[#A29E93] mb-8">30+ firm clients</p>
            <ul className="space-y-3 text-sm text-[#A29E93]">
              <li className="flex gap-3">
                <span className="text-[#C9A961]">→</span>
                <span>Everything in Firm Growth</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#C9A961]">→</span>
                <span>Dedicated implementation lead</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#C9A961]">→</span>
                <span>Quarterly firm-standards review</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#C9A961]">→</span>
                <span>Custom SLA</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#C9A961]">→</span>
                <span>Full Close add-on at $99/client/mo</span>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-6 text-sm text-[#7A7974] max-w-2xl">
          Firm plans include unlimited staff seats. Client count means unique QBO
          files under your firm master. No per-close fees. No per-transaction
          fees. Cancel anytime.
        </p>
      </section>
      {/* FAQ */}
      <section className="border-t border-[#C9A961]/20 bg-[#1A1A1C]">
        <div className="mx-auto max-w-4xl px-6 py-20 md:py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-[#7A7974] mb-6">
            Common questions from firm owners
          </p>
          <h2
            className={`${headingFont} text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight mb-14`}
          >
            Frequently asked.
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "Does Advisacor replace my staff?",
                a: "No. Advisacor is a capacity multiplier and a standardization layer for your existing team. Your staff still owns the client relationship, judgment calls, and partner sign-off. Full Close is designed as elastic capacity for staffing gaps, not permanent replacement.",
              },
              {
                q: "How does QuickBooks Accountant firm master OAuth work?",
                a: "One OAuth authorizes your firm master account. Every client file under that master becomes visible in the Advisacor multi-client dashboard. Individual bookkeepers on your team see only the clients you assign them.",
              },
              {
                q: "What about Xero clients?",
                a: "Xero support is rolling out during Wave 1. If your firm is Xero-heavy, tell us during signup and we will prioritize your onboarding sequence.",
              },
              {
                q: "How does Full Close billing work?",
                a: "Full Close is a per-client-per-month add-on on top of your firm plan. You turn it on and off per client each month. If you turn it on for 4 clients in June and 2 clients in July, you pay for 4 in June and 2 in July. No annual commitment.",
              },
              {
                q: "Who does the Full Close work?",
                a: "Vetted contract bookkeepers under an Advisacor QA layer. Every Full Close file is human-reviewed before hand-back to your firm. Your partner still signs off on client output.",
              },
              {
                q: "Is my firm and client data secure?",
                a: "SOC 2 aligned, HIPAA-ready. Encrypted at rest and in transit. Firm-level and staff-level access controls. Full data processing addendum available during signup. We never train models on your client data.",
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
          className={`${headingFont} text-4xl md:text-6xl font-semibold leading-[1.05] tracking-tight max-w-4xl mx-auto mb-8`}
        >
          Your next departing bookkeeper doesn&apos;t have to break your firm.
        </h2>
        <p className="text-lg md:text-xl text-[#A29E93] max-w-2xl mx-auto mb-10">
          Connect your QuickBooks Accountant firm master. Under 15 minutes to see
          every client, every close, every AI-proposed entry across your firm.
        </p>
        <Link
          href={SIGNUP_URL}
          className={`inline-flex items-center gap-2 rounded-full bg-[#C9A961] px-10 py-5 text-lg font-semibold text-[#111112] hover:bg-[#DFC084] transition-colors ${focusRing()}`}
        >
          Start free review
          <span aria-hidden>→</span>
        </Link>
        <p className="mt-4 text-sm text-[#7A7974]">
          No card required. Cancel anytime.
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
