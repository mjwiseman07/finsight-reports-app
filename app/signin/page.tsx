"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !data?.session?.access_token) {
        setError("Invalid email or password. Please try again.");
        return;
      }

      window.localStorage.setItem("supabase_access_token", data.session.access_token);
      router.push("/dashboard");
    } catch {
      setError("Invalid email or password. Please try again.");
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
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 16L10 11L13 14L19 7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 7H19V10" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h1 className="mt-8 text-4xl font-black leading-tight">
                  Welcome back to FinSight.
                </h1>
                <p className="mt-5 max-w-md text-lg leading-8 text-blue-50">
                  Sign in to continue building client-ready financial reports,
                  AI commentary, and board presentation packages.
                </p>
              </div>
            </div>
          </section>

          <section className="p-8 sm:p-10">
            <div className="mx-auto max-w-md">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-300">
                Sign In
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">
                Access your account
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Continue to your FinSight dashboard and client reporting workflow.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-200">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
                    placeholder="you@firm.com"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-200">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
                    placeholder="Enter your password"
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
                  className="mt-2 rounded-2xl bg-[#1a6cf6] px-5 py-4 text-sm font-black text-white shadow-xl shadow-blue-500/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-400">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-bold text-blue-300 hover:text-blue-200">
                  Start your free trial
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
