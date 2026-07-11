"use client";

import { useRouter } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont, primaryCtaClass, focusRing } from "@/components/site-ui";

type PaidUserWelcomeProps = {
  tierKey: string;
  email: string;
  businessName?: string;
};

/**
 * Phase TCP1 W2.5 Block 9j — paid post-checkout welcome.
 * Brand-aligned with /for/bookkeeper and /signup (navy + gold). Never inherits
 * legacy /free-review lead-capture styling.
 */
export function PaidUserWelcome({ tierKey, email, businessName }: PaidUserWelcomeProps) {
  const router = useRouter();
  const isReviewAssist = tierKey === "review_assist";
  const eyebrow = isReviewAssist
    ? "Review Assist — Welcome"
    : "Solo Bookkeeper — Welcome";
  const headline = businessName
    ? `You're in, ${businessName}. Let's connect your first client.`
    : "You're in. Let's connect your first client.";

  return (
    <main className="min-h-screen bg-[#0A1530] text-white">
      <SiteNav />
      <section className="mx-auto max-w-6xl px-6 pt-[200px] md:pt-[240px] lg:pt-[260px] pb-16 md:pb-24">
        <p className="text-sm uppercase tracking-[0.2em] text-[#C9A961] mb-6">
          {eyebrow}
        </p>
        <h1
          className={`${headingFont} text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight max-w-4xl`}
        >
          {headline}
        </h1>
        <p className="mt-6 text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed">
          {isReviewAssist
            ? "Your Review Assist subscription is active. Choose how you'd like to connect your first client's books to get your first findings review."
            : "Your Solo Bookkeeper subscription is active. Choose how you'd like to connect your first client's books."}
          {email ? (
            <>
              {" "}
              Signed in as <span className="text-white/90 font-semibold">{email}</span>.
            </>
          ) : null}
        </p>
      </section>

      <section className="border-t border-white/10 bg-[#0F0F10]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#C9A961]/40 bg-[#111112] p-8 flex flex-col">
              <p className="text-[#C9A961] text-sm font-semibold mb-2 uppercase tracking-[0.15em]">
                Recommended · 15 minutes
              </p>
              <h2
                className={`${headingFont} text-2xl md:text-3xl font-semibold leading-[1.15] tracking-tight mb-4`}
              >
                Connect QuickBooks Online
              </h2>
              <p className="text-white/75 leading-relaxed mb-8 flex-grow">
                Read-only OAuth connection to your client&apos;s QuickBooks. We
                pull the trial balance and general ledger automatically —
                no manual uploads. Fully connected and ready for your first
                review in about 15 minutes.
              </p>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/onboarding?step=connect-accounting&provider=quickbooks&paid=1",
                  )
                }
                className={`inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base ${primaryCtaClass} ${focusRing()}`}
              >
                Connect QuickBooks
                <span aria-hidden>→</span>
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111112] p-8 flex flex-col">
              <p className="text-white/50 text-sm font-semibold mb-2 uppercase tracking-[0.15em]">
                Alternative · 30–60 minutes
              </p>
              <h2
                className={`${headingFont} text-2xl md:text-3xl font-semibold leading-[1.15] tracking-tight mb-4`}
              >
                Upload files manually
              </h2>
              <p className="text-white/75 leading-relaxed mb-4">
                For clients not on QuickBooks. Upload trial balance, general
                ledger, or financial statements as PDF or Excel.
              </p>
              <div className="rounded-lg border border-[#C9A961]/30 bg-[#C9A961]/5 p-4 mb-8">
                <p className="text-[#C9A961] text-sm font-semibold mb-1">
                  Longer onboarding
                </p>
                <p className="text-white/70 text-sm leading-relaxed">
                  Manual uploads take longer to process — expect 30–60
                  minutes for your first review versus 15 minutes when
                  connected via QuickBooks.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  router.push("/onboarding?step=manual-upload&paid=1")
                }
                className={`inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/5 ${focusRing()}`}
              >
                Upload files
                <span aria-hidden>→</span>
              </button>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
