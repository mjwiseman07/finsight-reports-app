"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import framedNavyLogo from "../../public/advisacor-logo-framed-navy.png";
import { headingFont, primaryCtaClass } from "../../components/site-ui";
import { supabase } from "../../lib/supabase";

type CheckoutPricingStructure = "flat" | "perClient";

// Phase TCP1 W2.5 Block 9e: new phase `confirmed_ready` — poll detected
// email_confirmed_at but has NOT yet initiated checkout. User must click
// Continue. This decouples confirmation from checkout POST, killing the
// cookie-write race that Block 9d retry loop was patching.
type SignupPhase =
  | "form"
  | "verify_email"
  | "confirmed_ready"
  | "creating_checkout";

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const persona = searchParams?.get("persona") ?? null;
  const plan = searchParams?.get("plan") ?? null;
  const modeParam = searchParams?.get("mode") ?? null;

  // Phase TCP1 W1 supports Solo Bookkeeper. Phase TCP1 W2.5 adds Review Assist.
  // Anything else → /pricing.
  const isSbkFlow = persona === "bookkeeper" && plan === "solo_bookkeeper";
  const isRaFlow = persona === "bookkeeper" && plan === "review_assist";
  const isSupportedFlow = isSbkFlow || isRaFlow;
  // SBK supports flat + per_client. RA is flat-only (single SKU).
  const pricingStructure: CheckoutPricingStructure = isRaFlow
    ? "flat"
    : modeParam === "per_client"
      ? "perClient"
      : "flat";
  // Tier-derived checkout params.
  const tierKey = isRaFlow ? "review_assist" : "solo_bookkeeper";
  const track = isRaFlow ? "standard" : "pilot";

  useEffect(() => {
    if (!isSupportedFlow) {
      router.replace("/pricing");
    }
  }, [isSupportedFlow, router]);

  const [phase, setPhase] = useState<SignupPhase>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function createCheckoutAndRedirect() {
    setPhase("creating_checkout");
    setError("");
    try {
      // On phase transition to confirmed_ready, React form state should still
      // be populated (same tab, same mount). But keep the metadata fallback
      // as defense against Suspense re-mount edge cases.
      let resolvedBusinessName = businessName.trim();
      if (!resolvedBusinessName) {
        const { data: sessionData } = await supabase.auth.getSession();
        resolvedBusinessName = String(
          sessionData?.session?.user?.user_metadata?.business_name ?? "",
        ).trim();
      }
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier_key: tierKey,
          pricing_structure: pricingStructure,
          pricing_cadence: "monthly",
          track,
          business_name: resolvedBusinessName,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body?.checkout_url) {
        // Phase TCP1 W2.5 (Block 9c) — server 403s unconfirmed emails.
        // Post-Block 9e this should be unreachable because the poll gates
        // the Continue button on email_confirmed_at, but keep as defense.
        if (res.status === 403 && body?.error === "email_not_confirmed") {
          setError(
            "Please confirm your email first. We already sent a link to " +
              email +
              ".",
          );
          setPhase("verify_email");
          void pollForConfirmation();
          return;
        }
        setError(body?.error ?? "Unable to start checkout. Please try again.");
        setPhase("confirmed_ready");
        return;
      }
      window.location.href = body.checkout_url;
    } catch {
      setError("Network error creating checkout. Please try again.");
      setPhase("confirmed_ready");
    }
  }

  // Phase TCP1 W2.5 Block 9g: poll server-side status endpoint (auth.users
  // read via service role). Getting user() would require an active session
  // on THIS tab, but confirmation happens on a different tab.
  //
  // Phase TCP1 W2.5 Block 9h: after detecting confirmation, sign the user
  // in on THIS tab so cookies are established before Continue is clicked.
  // supabase.auth.signUp does NOT create a session when email confirmation
  // is required — the user's password stays in React state (from the form
  // submission) and is used here for the auto sign-in. Same security
  // posture as the original submission; no additional password exposure.
  async function pollForConfirmation() {
    const pollEmail = email;
    const pollPassword = password;
    if (!pollEmail || !pollPassword) {
      setError("Missing credentials — please refresh and try again.");
      setPhase("form");
      return;
    }
    const started = Date.now();
    const maxWaitMs = 5 * 60 * 1000; // 5 min
    while (Date.now() - started < maxWaitMs) {
      try {
        const res = await fetch("/api/auth/confirmation-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: pollEmail }),
        });
        if (res.ok) {
          const body = (await res.json()) as { confirmed?: boolean };
          if (body?.confirmed === true) {
            // Block 9h: establish session on this tab before advancing.
            const { error: signInError } =
              await supabase.auth.signInWithPassword({
                email: pollEmail,
                password: pollPassword,
              });
            if (signInError) {
              setError(
                "Signed you in failed after confirmation. Please refresh and sign in manually.",
              );
              setPhase("form");
              return;
            }
            setPhase("confirmed_ready");
            return;
          }
        }
        // Non-2xx and unconfirmed both fall through to retry.
      } catch {
        // Network hiccup — retry on next tick.
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    setError("Verification link expired. Please try signing up again.");
    setPhase("form");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // Derive redirect origin from the current window so we never fall back
      // to the Supabase Site URL default (which was previously misconfigured
      // to localhost). Preview deploys and prod both resolve correctly.
      const redirectOrigin =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : "https://www.advisacor.com";
      // Phase TCP1 W2.5 Block 9e: redirect to the dedicated /auth/confirmed
      // landing page (no query params needed — this is a static page). This
      // replaces the /signup?confirmed=1 round-trip that caused the mount-
      // effect cookie-write race in Block 9a/9d.
      const emailRedirectTo = `${redirectOrigin}/auth/confirmed`;

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            first_name: firstName,
            last_name: lastName,
            business_name: businessName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Phase TCP1 W2.5 (Block 9c/9e) — ALWAYS transition to verify_email
      // after signup. Server is the sole authority on confirmation state.
      setPhase("verify_email");
      void pollForConfirmation();
    } catch {
      setError("Unable to create your account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isSupportedFlow) {
    // Redirect effect is running — render nothing to avoid flash of legacy form.
    return null;
  }

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
        <Link
          href="/signin"
          className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/[0.1]"
        >
          Sign In
        </Link>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-7xl items-center gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#C9A961]">
            {isRaFlow ? "Review Assist" : "Solo Bookkeeper pilot"}
          </p>
          <h1
            className={`${headingFont} mt-5 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl`}
          >
            {isRaFlow
              ? "Start reviewing closes in under 15 minutes."
              : "Start your pilot in under 15 minutes."}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            {isRaFlow
              ? "$99/mo — read-only Review Assist. Findings across variance, anomalies, reconciliation, cutoff, and duplicates. No write-back to QBO."
              : pricingStructure === "flat"
                ? "$279/mo pilot — first 10 slots. Full Advisacor stack for up to 10 QBO clients."
                : "$69/client/mo pilot — first 10 slots. Metered — pay only for active clients each month."}
          </p>
          <ul className="mt-6 grid max-w-lg gap-3 text-sm text-white/70">
            {isRaFlow ? (
              <>
                <li>• Connect QuickBooks Online in read-only mode</li>
                <li>• 9-source findings feed per close period</li>
                <li>• Coverage badge across 8 audit assertions</li>
                <li>• Upgrade to Solo Bookkeeper for full close automation</li>
                <li>• Cancel any time</li>
              </>
            ) : (
              <>
                <li>• Connect QuickBooks Online after checkout</li>
                <li>• 15-vertical intelligence stack included</li>
                <li>• Organizational memory across every client</li>
                <li>• Cancel any time</li>
              </>
            )}
          </ul>
        </div>

        <div className="rounded-[2rem] border border-[#C9A961]/40 bg-[#1A1A1C]/85 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-10">
          {phase === "verify_email" ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#C9A961]">
                Check your email
              </p>
              <h2
                className={`${headingFont} mt-3 text-4xl font-semibold tracking-tight`}
              >
                Verify to continue
              </h2>
              <p className="mt-4 text-sm leading-6 text-white/70">
                We sent a confirmation link to{" "}
                <span className="font-bold text-white">{email}</span>. Click
                the link in that email, then return to this tab to continue.
              </p>
              <div className="mt-6 rounded-2xl border border-[#C9A961]/40 bg-[#C9A961]/10 p-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A961]">
                Keep this tab open — do not close until you continue to checkout
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/60">
                Waiting for verification…
              </div>
              {error && (
                <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
                  {error}
                </p>
              )}
            </>
          ) : phase === "confirmed_ready" ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#C9A961]">
                Email confirmed
              </p>
              <h2
                className={`${headingFont} mt-3 text-4xl font-semibold tracking-tight`}
              >
                Continue to checkout
              </h2>
              <p className="mt-4 text-sm leading-6 text-white/70">
                Your email <span className="font-bold text-white">{email}</span>{" "}
                is verified. Click below to complete your subscription on
                Stripe.
              </p>
              {error && (
                <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={() => void createCheckoutAndRedirect()}
                className={`mt-6 w-full rounded-2xl px-5 py-4 text-sm ${primaryCtaClass}`}
              >
                Continue to Checkout
              </button>
            </>
          ) : phase === "creating_checkout" ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#C9A961]">
                Preparing checkout
              </p>
              <h2
                className={`${headingFont} mt-3 text-4xl font-semibold tracking-tight`}
              >
                Redirecting to Stripe…
              </h2>
              <p className="mt-4 text-sm leading-6 text-white/70">
                Setting up your workspace. This takes a moment.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#C9A961]">
                Create your workspace
              </p>
              <h2
                className={`${headingFont} mt-3 text-4xl font-semibold tracking-tight`}
              >
                {isRaFlow
                  ? "Review Assist — $99/mo"
                  : `Solo Bookkeeper — ${pricingStructure === "flat" ? "$279/mo pilot" : "$69/client/mo pilot"}`}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Fields marked with an asterisk are required. You&apos;ll verify
                your email, then complete checkout on Stripe.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-white/80">
                      First name *
                    </span>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="rounded-2xl border border-white/10 bg-[#070B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C9A961]"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-white/80">
                      Last name *
                    </span>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="rounded-2xl border border-white/10 bg-[#070B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C9A961]"
                    />
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-white/80">
                    Business name *
                  </span>
                  <input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    className="rounded-2xl border border-white/10 bg-[#070B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C9A961]"
                    placeholder="e.g. Smith Bookkeeping LLC"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-white/80">
                    Email *
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-2xl border border-white/10 bg-[#070B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C9A961]"
                    placeholder="you@firm.com"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-white/80">
                    Password *
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="rounded-2xl border border-white/10 bg-[#070B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C9A961]"
                    placeholder="Minimum 8 characters"
                  />
                </label>

                {error && (
                  <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`mt-2 rounded-2xl px-5 py-4 text-sm ${primaryCtaClass} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isSubmitting ? "Creating workspace…" : isRaFlow ? "Start Review Assist" : "Start pilot"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-white/60">
                Already have access?{" "}
                <Link
                  href="/signin"
                  className="font-semibold text-[#C9A961] transition hover:text-[#DFC084]"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupPageContent />
    </Suspense>
  );
}
