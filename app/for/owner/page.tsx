import { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont } from "@/components/site-ui";

export const metadata: Metadata = {
  title: "Advisacor for business owners — a CFO's brain without a CFO's salary",
  description:
    "Connect QuickBooks or Xero, or upload a trial balance. Get a plain-English readout of what's actually happening in your business.",
};

export default function OwnerPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0C] text-white">
      <SiteNav />
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-[200px] md:pt-[240px]">
        <p className="mb-6 text-sm uppercase tracking-[0.2em] text-[#C9A961]">
          For the business owner
        </p>
        <h1
          className={`${headingFont} text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl`}
        >
          A CFO&apos;s brain without a CFO&apos;s salary.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/70">
          Full landing copy shipping in Block 4. Connect your books and see your
          first CFO-grade readout — in under 15 minutes.
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
