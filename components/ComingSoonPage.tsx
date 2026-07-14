"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";
import { headingFont } from "./site-ui";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ComingSoonPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string }>({});

  const validateForm = () => {
    const nextErrors: { name?: string; email?: string } = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) nextErrors.name = "Name is required.";
    if (!trimmedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!emailPattern.test(trimmedEmail)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setSubmitted(false);
    setFormError("");
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      if (!response.ok) {
        throw new Error("Early access submission failed.");
      }

      setSubmitted(true);
      setName("");
      setEmail("");
      setFieldErrors({});
    } catch {
      setFormError("Something went wrong. Please try again or email sales@advisacor.com.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#111112] text-white">
      <SiteNav />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-12 pt-[300px] md:pb-16 md:pt-[380px] lg:pt-[440px]">
        <p className="mb-6 text-sm font-semibold uppercase tracking-[0.22em] text-[#C9A961] md:text-base">
          Early access — staged rollout
        </p>
        <h1
          className={`${headingFont} max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl`}
        >
          This one&apos;s not open yet. Get on the list.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70 md:text-xl">
          Advisacor opens SKUs in waves. The one you followed isn&apos;t taking
          new accounts today — but we&apos;ll let you know the minute it does,
          and you&apos;ll get first access when the next wave opens.
        </p>
      </section>

      {/* Waitlist card */}
      <section id="early-access" className="mx-auto max-w-4xl px-6 pb-24">
        <div className="rounded-2xl border border-[#C9A961]/40 bg-[#1A1A1C] p-8 md:p-10">
          <p className="text-xs uppercase tracking-[0.2em] text-[#C9A961] mb-3">
            Join the waitlist
          </p>
          <h2 className={`${headingFont} text-2xl md:text-3xl font-semibold leading-tight mb-6`}>
            First access when the next SKU opens.
          </h2>

          {submitted ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-[#C9A961]/50 bg-[#C9A961]/10 p-6 text-white"
            >
              <p className={`${headingFont} text-xl font-semibold`}>You&apos;re on the list.</p>
              <p className="mt-2 text-white/80">
                We&apos;ll email you the moment the next Advisacor SKU opens.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-white">Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setFieldErrors((current) => ({ ...current, name: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? "coming-soon-name-error" : undefined}
                  className="rounded-lg border border-white/15 bg-[#111112] px-4 py-3 text-white placeholder:text-white/40 focus:border-[#C9A961] focus:outline-none focus:ring-2 focus:ring-[#C9A961]/40"
                  placeholder="Your full name"
                  autoComplete="name"
                />
                {fieldErrors.name && (
                  <span id="coming-soon-name-error" className="text-sm text-red-300">
                    {fieldErrors.name}
                  </span>
                )}
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-white">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFieldErrors((current) => ({ ...current, email: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "coming-soon-email-error" : undefined}
                  className="rounded-lg border border-white/15 bg-[#111112] px-4 py-3 text-white placeholder:text-white/40 focus:border-[#C9A961] focus:outline-none focus:ring-2 focus:ring-[#C9A961]/40"
                  placeholder="you@company.com"
                  autoComplete="email"
                />
                {fieldErrors.email && (
                  <span id="coming-soon-email-error" className="text-sm text-red-300">
                    {fieldErrors.email}
                  </span>
                )}
              </label>

              {formError && (
                <p role="alert" className="text-sm text-red-300">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-[#C9A961] px-6 py-3 font-semibold text-[#111112] transition hover:bg-[#DFC084] disabled:opacity-60"
              >
                {isSubmitting ? "Submitting…" : "Add me to the waitlist"}
              </button>

              <p className="text-xs text-white/50">
                We only use your email for launch updates and preview invitations.
                No spam, no third-party sharing.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Deflection — what IS open */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          <Link
            href="/for/owner"
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-[#C9A961]/40 hover:bg-white/[0.06]"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#C9A961]">For business owners</p>
            <h3 className={`${headingFont} mt-3 text-xl font-semibold`}>See what a CFO&apos;s brain looks like.</h3>
            <p className="mt-2 text-white/70 text-sm leading-relaxed">
              How Advisacor turns your books into decisions you can actually make.
            </p>
          </Link>

          <Link
            href="/for/firm"
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-[#C9A961]/40 hover:bg-white/[0.06]"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#C9A961]">For accounting firms</p>
            <h3 className={`${headingFont} mt-3 text-xl font-semibold`}>Ship more closes with the same team.</h3>
            <p className="mt-2 text-white/70 text-sm leading-relaxed">
              An AI teammate that drafts, reviews, and hands the work back to your reviewer.
            </p>
          </Link>

          <Link
            href="/how-it-works"
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-[#C9A961]/40 hover:bg-white/[0.06]"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#C9A961]">How it works</p>
            <h3 className={`${headingFont} mt-3 text-xl font-semibold`}>The mechanics, in plain English.</h3>
            <p className="mt-2 text-white/70 text-sm leading-relaxed">
              Where the AI drafts, where a human reviews, and where your books actually change.
            </p>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

export default ComingSoonPage;
