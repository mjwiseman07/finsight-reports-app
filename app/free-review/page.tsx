"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AdvisacorLogo } from "../../components/AdvisacorLogo";

type LeadForm = {
  first_name: string;
  last_name: string;
  business_name: string;
  email: string;
  phone: string;
};

function FreeReviewLeadCapture() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<LeadForm>({
    first_name: "",
    last_name: "",
    business_name: "",
    email: "",
    phone: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const updateForm = (key: keyof LeadForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submitLead = async () => {
    setError("");
    setIsSaving(true);

    try {
      const utmTrackingData = Object.fromEntries(
        Array.from(searchParams?.entries() || []).filter(([key]) => key.startsWith("utm_")),
      );
      const response = await fetch("/api/free-review/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          source_page: searchParams?.get("source") || "free-review",
          referral_information: document.referrer || searchParams?.get("ref") || "",
          utm_tracking_data: utmTrackingData,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.lead?.id) {
        setError(result.error || "Unable to save your free review information.");
        return;
      }

      window.localStorage.setItem("advisacor_free_review_lead_id", result.lead.id);
      window.localStorage.setItem("advisacor_free_review_lead_email", result.lead.email || form.email);
      router.push(`/onboarding?leadId=${encodeURIComponent(result.lead.id)}`);
    } catch {
      setError("Unable to save your free review information.");
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmit = Boolean(
    form.first_name.trim() &&
      form.last_name.trim() &&
      form.business_name.trim() &&
      form.email.trim().includes("@"),
  );

  return (
    <main className="min-h-screen bg-[#F5F7FA] text-[#111827]">
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="block w-[min(525px,46.5vw)] px-0 py-0">
            <AdvisacorLogo priority className="w-full" />
          </Link>
          <Link href="/signin" className="rounded-full px-4 py-2 text-sm font-bold text-[#111827] hover:bg-slate-100">
            Sign In
          </Link>
        </nav>
      </header>

      <section className="bg-[#0A1020] px-6 py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Free Financial Review</p>
            <h1 className="mt-4 text-5xl font-black leading-[1.02] tracking-[-0.05em] md:text-7xl">
              Generate My Free Financial Review
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Start with a short lead form so Advisacor can save your review session, follow up if onboarding is incomplete, and personalize your first package.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Lead captured before onboarding",
                "QuickBooks can enrich the record",
                "Upload only if accounting data is incomplete",
                "Guided path to first package",
                "Follow-up ready for incomplete sessions",
                "No manual details if Advisacor can import them",
              ].map((item) => (
                <p key={item} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-slate-200">
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white p-6 text-[#111827] shadow-2xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#1E6BFF]">Lead Capture</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] text-[#0A1020]">Tell us where to send your review</h2>
            <p className="mt-3 text-sm leading-6 text-[#6B7280]">
              Required before connecting QuickBooks, uploading reports, or generating your free package.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <LeadField label="First name" value={form.first_name} onChange={(value) => updateForm("first_name", value)} />
              <LeadField label="Last name" value={form.last_name} onChange={(value) => updateForm("last_name", value)} />
              <LeadField label="Business name" value={form.business_name} onChange={(value) => updateForm("business_name", value)} className="md:col-span-2" />
              <LeadField label="Email address" value={form.email} onChange={(value) => updateForm("email", value)} type="email" />
              <LeadField label="Phone number optional" value={form.phone} onChange={(value) => updateForm("phone", value)} type="tel" />
            </div>
            {error && <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
            <button
              type="button"
              onClick={submitLead}
              disabled={!canSubmit || isSaving}
              className="premium-button mt-5 w-full rounded-2xl px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Continue to Free Review Onboarding"}
            </button>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="enterprise-card rounded-[2rem] p-7">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FF7A1A]">What Happens Next</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-[#0A1020]">
              Capture, connect, review.
            </h2>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {[
                ["Lead record created", "First name, last name, business name, email, phone, source, referral, and UTM data are saved immediately."],
                ["Guided onboarding opens", "The user selects customer type, then chooses QuickBooks or report upload."],
                ["QuickBooks enriches the lead", "Imported company profile and report-discovery details are attached when available."],
                ["First package begins", "Advisacor generates the first review after data connection or required uploads."],
              ].map(([title, body]) => (
                <PreviewCard key={title} title={title} body={body} />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-[#0A1020] p-7 text-white shadow-2xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Conversion Workflow</p>
            <h2 className="mt-3 text-3xl font-black">Incomplete sessions are follow-up ready.</h2>
            <p className="mt-4 leading-7 text-slate-300">
              Capturing every free-review prospect before onboarding gives Advisacor a clean recovery path for users who start but do not finish connecting data or generating their first package.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function LeadField({ label, value, onChange, type = "text", className = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; className?: string }) {
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-sm font-black text-[#0A1020]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#FF7A1A]"
      />
    </label>
  );
}

function PreviewCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-black text-[#0A1020]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#6B7280]">{body}</p>
    </div>
  );
}

export default function FreeReviewPage() {
  return (
    <Suspense>
      <FreeReviewLeadCapture />
    </Suspense>
  );
}
