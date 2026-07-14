import Image from "next/image";
import Link from "next/link";
import framedNavyLogo from "../../../public/advisacor-logo-framed-navy.png";
import { headingFont } from "../../../components/site-ui";

export const metadata = {
  title: "Email confirmed — Advisacor",
};

// Phase TCP1 W2.5 Block 9e:
// Dedicated confirmation landing page. Replaces the fragile ?confirmed=1
// redirect back to /signup that produced cookie-write races and 401s. This
// page is deliberately server-rendered with no Supabase JS — it works even
// if Supabase is down, and there is nothing here that can race.
//
// User flow:
//   1. User submits signup form on /signup?persona=...&plan=...
//   2. Supabase sends confirmation email pointing here
//   3. User clicks link → lands on this page
//   4. This page tells them to return to the original tab
//   5. Original tab is polling for email_confirmed_at every 3s
//   6. Original tab surfaces a "Continue to Checkout" button once confirmed
//
// This decouples the confirmation event from the checkout POST entirely.
// No mount effect, no retry loop, no cookie race.
export default function ConfirmedPage() {
  return (
    <main className="advisacor-signup-brand min-h-screen bg-[#111112] px-6 py-8 text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="block" aria-label="Advisacor home">
          <Image
            src={framedNavyLogo}
            alt="Advisacor"
            width={1536}
            height={902}
            priority
            className="pointer-events-none h-auto w-[320px] select-none md:w-[420px]"
          />
        </Link>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-3xl flex-col items-center justify-center py-12 text-center">
        <div className="rounded-[2rem] border border-[#C9A961]/40 bg-[#1A1A1C]/85 p-10 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-14">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#C9A961]">
            Email confirmed
          </p>
          <h1
            className={`${headingFont} mt-5 text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl`}
          >
            Your email is verified.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-white/70">
            <span className="font-bold text-white">Return to the original signup tab</span>{" "}
            to continue to checkout.
          </p>
          <p className="mt-4 text-sm leading-6 text-white/60">
            You may close this window.
          </p>
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 text-xs uppercase tracking-[0.18em] text-white/50">
            Advisacor™ — Powerful Intelligence. Simplified.
          </div>
        </div>
      </section>
    </main>
  );
}
