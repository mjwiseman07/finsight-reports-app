"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AdvisacorLogo } from "../../components/AdvisacorLogo";
import { supabase } from "../../lib/supabase";

type CheckoutPricingStructure = "flat" | "perClient";

type SignupPhase = "form" | "verify_email" | "creating_checkout";

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const persona = searchParams?.get("persona") ?? null;
  const plan = searchParams?.get("plan") ?? null;
  const modeParam = searchParams?.get("mode") ?? null;

  // W1 supports ONLY the Solo Bookkeeper flow. Anything else → redirect to /pricing.
  const isW1Flow = persona === "bookkeeper" && plan === "solo_bookkeeper";
  const pricingStructure: CheckoutPricingStructure =
    modeParam === "per_client" ? "perClient" : "flat";

  useEffect(() => {
    if (!isW1Flow) {
      router.replace("/pricing");
    }
  }, [isW1Flow, router]);

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
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier_key: "solo_bookkeeper",
          pricing_structure: pricingStructure,
          pricing_cadence: "monthly",
          track: "pilot",
          business_name: businessName,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body?.checkout_url) {
        setError(body?.error ?? "Unable to start checkout. Please try again.");
        setPhase("form");
        return;
      }
      window.location.href = body.checkout_url;
    } catch {
      setError("Network error creating checkout. Please try again.");
      setPhase("form");
    }
  }

  async function pollForSessionAndCheckout() {
    // The verify-email screen polls every 3s for up to 5 min. When the user
    // clicks the confirmation link in Gmail, Supabase populates the session,
    // and we kick off checkout automatically.
    const started = Date.now();
    const maxWaitMs = 5 * 60 * 1000;
    while (Date.now() - started < maxWaitMs) {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        await createCheckoutAndRedirect();
        return;
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
      // Preserve the persona/plan/mode query params through the confirmation
      // round-trip so the user lands back on the same tier signup page.
      const currentSearch =
        typeof window !== "undefined" && window.location?.search
          ? window.location.search
          : "";
      const separator = currentSearch ? "&" : "?";
      const emailRedirectTo = `${redirectOrigin}/signup${currentSearch}${separator}confirmed=1`;
      const { data, error: signUpError } = await supabase.auth.signUp({
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

      if (data?.session?.access_token) {
        // Email confirmation disabled (or user auto-confirmed) — go straight to checkout.
        window.localStorage.setItem("supabase_access_token", data.session.access_token);
        await createCheckoutAndRedirect();
      } else {
        // Email confirmation required — show verify screen and poll for session.
        setPhase("verify_email");
        void pollForSessionAndCheckout();
      }
    } catch {
      setError("Unable to create your account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isW1Flow) {
    // Redirect effect is running — render nothing to avoid flash of legacy form.
    return null;
  }

  return (
    <main className="advisacor-dark-grid min-h-screen bg-[#0A1020] px-6 py-8 text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="block w-[min(525px,46.5vw)] px-0 py-0">
          <AdvisacorLogo priority className="w-full" />
        </Link>
        <Link href="/signin" className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/[0.1]">
          Sign In
        </Link>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-7xl items-center gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Solo Bookkeeper pilot</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.055em] md:text-7xl">
            Start your pilot in under 15 minutes.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            {pricingStructure === "flat"
              ? "$279/mo pilot — first 10 slots. Full Advisacor stack for up to 10 QBO clients."
              : "$69/client/mo pilot — first 10 slots. Metered — pay only for active clients each month."}
          </p>
          <ul className="mt-6 grid max-w-lg gap-3 text-sm text-slate-300">
            <li>• Connect QuickBooks Online after checkout</li>
            <li>• 15-vertical intelligence stack included</li>
            <li>• Organizational memory across every client</li>
            <li>• Cancel any time</li>
          </ul>
        </div>

        <div className="dark-enterprise-card rounded-[2rem] p-8 md:p-10">
          {phase === "verify_email" ? (
            <>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Check your email</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">Verify to continue</h2>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                We just sent a confirmation link to <span className="font-bold text-white">{email}</span>.
                Click it, then come back here — checkout will start automatically.
              </p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-400">
                Waiting for verification… Don&apos;t close this tab.
              </div>
              {error && <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">{error}</p>}
            </>
          ) : phase === "creating_checkout" ? (
            <>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Preparing checkout</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">Redirecting to Stripe…</h2>
              <p className="mt-4 text-sm leading-6 text-slate-300">Setting up your workspace and pilot slot. This takes a moment.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Create your workspace</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">Solo Bookkeeper — {pricingStructure === "flat" ? "$279/mo pilot" : "$69/client/mo pilot"}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Fields marked with an asterisk are required. You&apos;ll verify your email, then complete checkout on Stripe.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-200">First name *</span>
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="rounded-2xl border border-white/10 bg-[#070B16] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A1A]" />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-200">Last name *</span>
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} required className="rounded-2xl border border-white/10 bg-[#070B16] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A1A]" />
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-200">Business name *</span>
                  <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className="rounded-2xl border border-white/10 bg-[#070B16] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A1A]" placeholder="e.g. Smith Bookkeeping LLC" />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-200">Email *</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-2xl border border-white/10 bg-[#070B16] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A1A]" placeholder="you@firm.com" />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-200">Password *</span>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="rounded-2xl border border-white/10 bg-[#070B16] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A1A]" placeholder="Minimum 8 characters" />
                </label>

                {error && <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">{error}</p>}

                <button type="submit" disabled={isSubmitting} className="premium-button mt-2 rounded-2xl px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
                  {isSubmitting ? "Creating workspace…" : "Start pilot"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-400">
                Already have access?{" "}
                <Link href="/signin" className="font-bold text-[#FFB36F] hover:text-[#FF7A1A]">
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
