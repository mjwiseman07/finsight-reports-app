import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteNav } from "../../components/SiteNav";
export const metadata: Metadata = {
  title: "Refund Policy | Advisacor™",
  description:
    "Advisacor™ 30-day money-back guarantee and refund procedures.",
};
export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#28251D]">
      <SiteNav />
      <section className="bg-gradient-to-br from-[#F7F6F2] via-[#EEEDE7] to-[#D4D1CA] pb-20 pt-[240px] md:pt-[260px] lg:pt-[280px]">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-4 text-xs font-semibold tracking-wider text-[#C9A961]">REFUND POLICY</p>
          <h1 className="text-4xl font-bold leading-tight text-[#28251D] md:text-5xl">Refund Policy</h1>
          <p className="mt-4 text-sm text-[#7A7974]">Last updated: July 14, 2026 · Effective: July 14, 2026</p>
        </div>
      </section>
      <section className="bg-[#F9F8F5] py-20">
        <div className="prose prose-slate mx-auto max-w-3xl px-6">
          <div className="not-prose rounded-2xl border border-[#C9A961]/40 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A961]">Our Guarantee</p>
            <p className="mt-3 text-2xl font-bold leading-snug text-[#28251D] md:text-3xl">
              30-day money-back guarantee.
            </p>
            <p className="mt-3 text-base leading-relaxed text-[#28251D]">
              If Advisacor isn&apos;t right for you, request a full refund of your first paid subscription payment
              within thirty (30) days — no reason required.
            </p>
          </div>
          <h2>1. What&apos;s covered</h2>
          <p>
            Your <strong>first paid subscription payment</strong> for any Advisacor tier is fully refundable if you
            request a refund within thirty (30) days of the payment date. This applies whether you paid monthly or
            annually.
          </p>
          <h2>2. How to request a refund</h2>
          <p>
            Email <a href="mailto:mwiseman@advisacor.com">mwiseman@advisacor.com</a> from the email address associated
            with your Advisacor account. Include:
          </p>
          <ul>
            <li>Your account email</li>
            <li>The organization or subscriber name on the account</li>
            <li>A brief note (optional) telling us how we can improve</li>
          </ul>
          <p>
            We respond to refund requests within two (2) business days. Approved refunds are processed to the original
            payment method within ten (10) business days.
          </p>
          <h2>3. What&apos;s not covered</h2>
          <ul>
            <li>Renewal payments after your first paid month or year are not covered by the 30-day guarantee. If you don&apos;t want to renew, cancel your subscription before the renewal date through the Advisacor billing page.</li>
            <li>Refund requests submitted more than 30 days after the initial payment date are considered on a case-by-case basis but are not guaranteed.</li>
            <li>Complimentary, pilot, and free-trial accounts have nothing to refund.</li>
            <li>Refunds are not available for accounts terminated for breach of our <Link href="/terms">Terms of Service</Link>.</li>
          </ul>
          <h2>4. Cancellation vs. refund</h2>
          <p>
            <strong>Cancelling</strong> your subscription stops future renewals but does not automatically issue a
            refund of fees already paid. If you want a refund, you must email us at the address above within the
            30-day window in addition to (or instead of) cancelling.
          </p>
          <p>
            After you request a refund and it is approved, your account is downgraded to the free tier (if any) or
            deactivated. Advisacor stops accessing your connected QuickBooks Online company. Your data is deleted on
            the schedule described in our <Link href="/privacy">Privacy Policy</Link>.
          </p>
          <h2>5. Chargebacks</h2>
          <p>
            Please contact us before initiating a chargeback with your card issuer or bank. We are almost always able
            to resolve the issue faster and more completely by email. If a chargeback is filed, we may suspend the
            account pending resolution.
          </p>
          <h2>6. Questions</h2>
          <p>
            Email <a href="mailto:mwiseman@advisacor.com">mwiseman@advisacor.com</a>. This Refund Policy is
            incorporated by reference into our <Link href="/terms">Terms of Service</Link>.
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
