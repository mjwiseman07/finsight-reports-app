"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    business_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordMatchStatus =
    form.confirm_password.length === 0
      ? "empty"
      : form.password === form.confirm_password
        ? "match"
        : "mismatch";

  const updateField =
    (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match. Please check both password fields.");
      return;
    }

    setIsSubmitting(true);
    const signupPayload = {
      first_name: form.first_name,
      last_name: form.last_name,
      business_name: form.business_name,
      email: form.email,
      password: form.password,
    };

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signupPayload),
      });
      const responseText = await response.text();
      let result: { error?: string; code?: string } = {};
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        result = { error: responseText.slice(0, 300) || `Signup failed with status ${response.status}.` };
      }

      if (!response.ok) {
        console.error("[signup] /api/signup failed", {
          status: response.status,
          statusText: response.statusText,
          response: result,
        });
        setError(
          response.status === 409
            ? "An account with this email already exists."
            : result.error || `Signup failed with status ${response.status}.`,
        );
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (signInError || !data?.session?.access_token) {
        console.error("[signup] Supabase sign-in failed after account creation", signInError);
        setError(signInError?.message || "Account created, but automatic sign-in failed. Please try signing in.");
        return;
      }

      window.localStorage.setItem("supabase_access_token", data.session.access_token);
      router.push("/dashboard");
    } catch (error) {
      console.error("[signup] Unexpected signup error", error);
      setError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07111f] px-6 py-12 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="hidden bg-gradient-to-br from-[#1a6cf6] to-[#4f46e5] p-10 lg:block">
            <div className="flex h-full flex-col justify-between">
              <div>
                <Link href="/" className="inline-flex items-center gap-3 rounded-2xl text-white transition hover:opacity-85">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 16L10 11L13 14L19 7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M16 7H19V10" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-lg font-black">FinSight</span>
                </Link>
                <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 16L10 11L13 14L19 7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 7H19V10" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h1 className="mt-8 text-4xl font-black leading-tight">
                  Build CFO-level client reports in minutes.
                </h1>
                <p className="mt-5 max-w-md text-lg leading-8 text-blue-50">
                  Start your FinSight workspace and turn accounting exports into PDF reports,
                  KPI insights, and board-ready presentations.
                </p>
              </div>
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-100">
                  Included
                </p>
                <div className="mt-4 grid gap-3 text-sm font-semibold text-white">
                  <p>15+ financial ratios</p>
                  <p>AI variance commentary</p>
                  <p>PDF + PowerPoint automation</p>
                </div>
              </div>
            </div>
          </section>

          <section className="p-8 sm:p-10">
            <div className="mx-auto max-w-xl">
              <Link href="/" className="mb-6 inline-flex text-sm font-bold text-slate-400 transition hover:text-white">
                ← Back to homepage
              </Link>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-300">
                Create Account
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">
                Start your free trial
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                No credit card required. Set up your firm profile and start building client-ready reports.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-200">First Name</span>
                  <input
                    value={form.first_name}
                    onChange={updateField("first_name")}
                    required
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
                    placeholder="Jordan"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-200">Last Name</span>
                  <input
                    value={form.last_name}
                    onChange={updateField("last_name")}
                    required
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
                    placeholder="Taylor"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-200">Business Name</span>
                  <input
                    value={form.business_name}
                    onChange={updateField("business_name")}
                    required
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
                    placeholder="Wiseman's Bookkeeping"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-200">Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={updateField("email")}
                    required
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
                    placeholder="you@firm.com"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-200">Password</span>
                    <input
                      type="password"
                      value={form.password}
                      onChange={updateField("password")}
                      required
                      minLength={6}
                      className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
                      placeholder="Create a secure password"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-200">Confirm Password</span>
                    <input
                      type="password"
                      value={form.confirm_password}
                      onChange={updateField("confirm_password")}
                      required
                      minLength={6}
                      className={`rounded-2xl border bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400 ${
                        passwordMatchStatus === "mismatch"
                          ? "border-red-400/70"
                          : passwordMatchStatus === "match"
                            ? "border-emerald-400/60"
                            : "border-white/10"
                      }`}
                      placeholder="Retype password"
                    />
                    {passwordMatchStatus !== "empty" && (
                      <span
                        className={`text-xs font-semibold ${
                          passwordMatchStatus === "match" ? "text-emerald-300" : "text-red-300"
                        }`}
                      >
                        {passwordMatchStatus === "match" ? "Passwords match." : "Passwords do not match"}
                      </span>
                    )}
                  </label>
                </div>

                {error && (
                  <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
                    {error}
                  </p>
                )}

                <div className="rounded-2xl border border-blue-300/20 bg-blue-500/10 px-4 py-3 text-sm leading-6 text-blue-100">
                  Your free trial includes 1 complete report at no charge. No credit card required to start. After your free report, choose from our Essential ($99/mo), Professional ($199/mo), or Virtual CFO ($499/mo) plans to continue.
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || passwordMatchStatus !== "match"}
                  className="mt-2 rounded-2xl bg-[#1a6cf6] px-5 py-4 text-sm font-black text-white shadow-xl shadow-blue-500/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Creating account..." : "Start Free Trial"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-400">
                Already have an account?{" "}
                <Link href="/signin" className="font-bold text-blue-300 hover:text-blue-200">
                  Sign in
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
