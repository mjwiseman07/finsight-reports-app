"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteNav } from "../../components/SiteNav";
import { focusRing, headingFont, primaryCtaClass } from "../../components/site-ui";
import { supabase } from "../../lib/supabase";
import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "@/lib/reviewer/constants";

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    if (!captchaToken && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      setError("Please complete the security check before continuing.");
      setIsSubmitting(false);
      return;
    }
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      });
      if (signInError || !data?.session?.access_token) {
        setError("Invalid email or password. Please try again.");
        setCaptchaToken("");
        turnstileRef.current?.reset();
        return;
      }
      window.localStorage.setItem("supabase_access_token", data.session.access_token);
      const maxAge = data.session.expires_in ?? 3600;
      document.cookie = `${ADVISACOR_ACCESS_TOKEN_COOKIE}=${encodeURIComponent(data.session.access_token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
      const isSuperAdmin =
        data.user?.app_metadata?.role === "super_admin" ||
        data.user?.user_metadata?.role === "super_admin";
      const nextPath =
        new URLSearchParams(window.location.search).get("next") ||
        (isSuperAdmin ? "/admin" : "/dashboard");
      if (nextPath.startsWith("/api/integrations/")) {
        document.cookie = `advisacor_oauth_token=${encodeURIComponent(data.session.access_token)}; path=/; max-age=600; SameSite=Lax`;
        window.location.assign(nextPath);
        return;
      }
      router.push(nextPath.startsWith("/") ? nextPath : "/dashboard");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />
      <section
        id="signin"
        className="relative isolate overflow-hidden bg-[#111112] px-6 pb-24 pt-[200px] md:pt-[240px] lg:pt-[260px]"
      >
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,1.05fr)]">
          {/* LEFT — Marketing narrative that matches the hero on the landing page */}
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9A961]">
              Sign In — Patent Pending
            </p>
            <h1
              className={`mt-5 text-4xl font-black leading-[1.06] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl ${headingFont}`}
            >
              Welcome back.
            </h1>
            <p className="mt-6 max-w-[640px] text-lg leading-8 text-[#ECEBE7]">
              Access your Advisacor workspace to continue reviewing KPI dashboards, forecasting
              signals, AP/AR intelligence, executive packages, and AI-powered advisory
              recommendations.
            </p>
            <p className="mt-6 max-w-[640px] text-sm leading-7 text-[#A29E93]">
              Advisacor keeps US GAAP and IFRS separate by design, anchors every disclosure to
              real SEC filing patterns, and remembers your chart of accounts, close calendar,
              and prior-period judgments across every session.
            </p>
          </div>

          {/* RIGHT — Sign in card, styled to match the executive workspace card on the home hero */}
          <div className="min-w-0">
            <div className="relative ml-auto w-full max-w-2xl">
              <div className="relative overflow-hidden rounded-2xl border border-[#C9A961]/40 bg-[#0B1A3A] p-8 shadow-2xl sm:p-10">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#C9A961]/15 blur-3xl"
                />
                <div className="relative flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C9A961] sm:text-xs">
                    Sign In
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A961]/40 bg-[#C9A961]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#C9A961]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C9A961]" />
                    Secure Access
                  </span>
                </div>
                <h2
                  className={`relative mt-5 text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl ${headingFont}`}
                >
                  Sign in to Advisacor
                </h2>
                <p className="relative mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
                  Use the email address associated with your Advisacor account.
                </p>
                <div
                  aria-hidden
                  className="relative mt-7 h-px w-full bg-gradient-to-r from-transparent via-[#C9A961]/40 to-transparent"
                />
                <form onSubmit={handleSubmit} className="relative mt-7 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A961]">
                      Email
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      autoComplete="email"
                      className={`w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-white placeholder:text-slate-500 ${focusRing()}`}
                      placeholder="you@company.com"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A961]">
                      Password
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      autoComplete="current-password"
                      className={`w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-white placeholder:text-slate-500 ${focusRing()}`}
                      placeholder="Enter your password"
                    />
                  </label>
                  <div className="flex justify-end">
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-[#C9A961] hover:text-[#D9BE7B]"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  {error && (
                    <p
                      role="alert"
                      className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200"
                    >
                      {error}
                    </p>
                  )}
                  {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                    <div className="mt-1 flex justify-center">
                      <Turnstile
                        ref={turnstileRef}
                        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                        onSuccess={(token) => setCaptchaToken(token)}
                        onError={() => setCaptchaToken("")}
                        onExpire={() => setCaptchaToken("")}
                        options={{ theme: "dark" }}
                      />
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken)}
                    className={`mt-2 inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${primaryCtaClass} ${focusRing()}`}
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <span
                          className="h-4 w-4 animate-spin rounded-full border-2 border-[#111112]/30 border-t-[#111112]"
                          aria-hidden="true"
                        />
                        Signing in...
                      </span>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>
                <p className="relative mt-6 text-center text-sm text-white/70">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="font-bold text-[#C9A961] hover:text-[#D9BE7B]">
                    Request early access
                  </Link>
                </p>
                <p className="relative mt-6 text-[11px] uppercase tracking-[0.22em] text-white/45">
                  Every session audited — Every action provenance-bound
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
