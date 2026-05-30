"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdvisacorLogo } from "../../components/AdvisacorLogo";
import { supabase } from "../../lib/supabase";

const tiers = [
  "Essentials monthly review",
  "Professional controller intelligence",
  "Enterprise Virtual CFO platform",
];

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedTier, setSelectedTier] = useState(tiers[1]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
            requested_tier: selectedTier,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data?.session?.access_token) {
        window.localStorage.setItem("supabase_access_token", data.session.access_token);
      }

      router.push("/dashboard");
    } catch {
      setError("Unable to create your account. Please try again.");
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
        <Link href="/signin" className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/[0.1]">
          Sign In
        </Link>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-7xl items-center gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Enterprise Onboarding</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.055em] md:text-7xl">
            Build your AI-powered finance command center.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Advisacor helps accounting firms, controllers, and finance leaders move from static reporting to operational intelligence, forecasting, executive packages, and AI-assisted advisory workflows.
          </p>
          <div className="mt-8 grid max-w-3xl gap-4 md:grid-cols-3">
            {["Operational analytics", "Forecast visibility", "Executive reporting"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur">
                <div className="mb-5 h-10 w-10 rounded-2xl bg-[#FF7A1A]/15 p-2">
                  <div className="h-full rounded-xl bg-[#FF7A1A]" />
                </div>
                <p className="text-sm font-black text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="dark-enterprise-card rounded-[2rem] p-8 md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Request Early Access</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">Create your workspace</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Start with a guided setup for your advisory, controller, or executive reporting workflow.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-200">Full name</span>
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} required className="rounded-2xl border border-white/10 bg-[#070B16] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A1A]" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-200">Company</span>
                <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} required className="rounded-2xl border border-white/10 bg-[#070B16] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A1A]" />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-200">Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="rounded-2xl border border-white/10 bg-[#070B16] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A1A]" placeholder="you@firm.com" />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-200">Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} className="rounded-2xl border border-white/10 bg-[#070B16] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A1A]" placeholder="Create a secure password" />
            </label>

            <div className="grid gap-2">
              <span className="text-sm font-bold text-slate-200">Primary package interest</span>
              <div className="grid gap-2">
                {tiers.map((tier) => (
                  <button
                    type="button"
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${selectedTier === tier ? "border-[#FF7A1A] bg-[#FF7A1A]/15 text-white" : "border-white/10 bg-white/[0.035] text-slate-300 hover:bg-white/[0.07]"}`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">{error}</p>}

            <button type="submit" disabled={isSubmitting} className="premium-button mt-2 rounded-2xl px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? "Creating workspace..." : "Request Early Access"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have access?{" "}
            <Link href="/signin" className="font-bold text-[#FFB36F] hover:text-[#FF7A1A]">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
