"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteNav } from "../../components/SiteNav";
import { focusRing, headingFont, primaryCtaClass } from "../../components/site-ui";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [sent, setSent] = useState(false);
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
      const redirectOrigin =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : "https://www.advisacor.com";
      const redirectTo = `${redirectOrigin}/auth/reset-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
        captchaToken,
      });

      if (resetError) {
        setError(resetError.message);
        setCaptchaToken("");
        turnstileRef.current?.reset();
        return;
      }

      // Always show the same confirmation regardless of whether the email exists —
      // prevents account enumeration.
      setSent(true);
    } catch {
      setError("Unable to send the reset email. Please try again.");
      setCaptchaToken("");
      turnstileRef.current?.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />
      <section
        id="forgot-password"
        className="relative isolate overflow-hidden bg-[#111112] px-6 pb-24 pt-[200px] md:pt-[240px] lg:pt-[260px]"
      >
        <div className="relative z-10 mx-auto max-w-xl">
          <div className="rounded-3xl border border-white/10 bg-[#141416] p-8 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9A961]">
              Password Recovery
            </p>
            <h1
              className={`mt-3 text-3xl font-black leading-tight tracking-[-0.02em] text-white ${headingFont}`}
            >
              {sent ? "Check your email" : "Reset your password"}
            </h1>

            {!sent ? (
              <>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  Enter the email associated with your Advisacor account and we&apos;ll send you a link to reset your password.
                </p>
                <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
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
                    {isSubmitting ? "Sending..." : "Send reset link"}
                  </button>
                </form>
              </>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                If an account exists for <span className="font-semibold text-white">{email}</span>, we&apos;ve sent a password reset link. Check your inbox — the link expires in 1 hour.
              </p>
            )}

            <p className="mt-6 text-center text-sm text-white/70">
              Remembered it?{" "}
              <Link href="/signin" className="font-bold text-[#C9A961] hover:text-[#D9BE7B]">
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
