"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdvisacorLogo } from "../../components/AdvisacorLogo";
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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError || !data?.session?.access_token) {
        setError("Invalid email or password. Please try again.");
        return;
      }

      window.localStorage.setItem("supabase_access_token", data.session.access_token);
      const isSuperAdmin =
        data.user?.app_metadata?.role === "super_admin" ||
        data.user?.user_metadata?.role === "super_admin";
      const nextPath = new URLSearchParams(window.location.search).get("next") || (isSuperAdmin ? "/admin" : "/dashboard");
      router.push(nextPath.startsWith("/") ? nextPath : "/dashboard");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="advisacor-dark-grid min-h-screen bg-[#0A1020] px-6 py-8 text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="block w-[min(525px,46.5vw)] px-0 py-0">
          <AdvisacorLogo priority className="w-full" />
        </Link>
        <Link href="/signup" className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/[0.1]">
          Request Early Access
        </Link>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-7xl items-center gap-10 py-12 lg:grid-cols-[1fr_0.85fr]">
        <div className="hidden lg:block">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Enterprise Login</p>
          <h1 className="mt-5 max-w-3xl text-6xl font-black leading-[0.95] tracking-[-0.055em]">
            Access your financial intelligence workspace.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Continue reviewing KPI dashboards, forecasting signals, AP/AR intelligence, executive packages, and AI-powered advisory recommendations.
          </p>
          <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
            {["Forecasting", "AP/AR", "Executive AI"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-xl shadow-black/10 backdrop-blur">
                <p className="text-sm font-black text-white">{item}</p>
                <div className="mt-4 h-2 rounded-full bg-white/10">
                  <div className="h-2 w-2/3 rounded-full bg-[#FF7A1A]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dark-enterprise-card rounded-[2rem] p-8 md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Sign In</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">Welcome back</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Sign in to access Advisacor dashboards, import workflows, executive packages, and AI recommendations.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-200">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="rounded-2xl border border-white/10 bg-[#070B16] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#FF7A1A]"
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
                className="rounded-2xl border border-white/10 bg-[#070B16] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#FF7A1A]"
                placeholder="Enter your password"
              />
            </label>

            {error && <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">{error}</p>}

            <button type="submit" disabled={isSubmitting} className="premium-button mt-2 rounded-2xl px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-bold text-[#FFB36F] hover:text-[#FF7A1A]">
              Request early access
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
