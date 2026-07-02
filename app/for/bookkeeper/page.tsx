import { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont } from "@/components/site-ui";

export const metadata: Metadata = {
  title:
    "Advisacor for solo bookkeepers — handle 25 clients like you handle 10",
  description:
    "AI drafts the monthly close on your QBO clients. You review, adjust, and send. Built for solo bookkeepers with 1–10 QBO clients.",
};

export default function BookkeeperPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0C] text-white">
      <SiteNav />
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-[200px] md:pt-[240px]">
        <p className="mb-6 text-sm uppercase tracking-[0.2em] text-[#C9A961]">
          For the solo bookkeeper
        </p>
        <h1
          className={`${headingFont} text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl`}
        >
          Handle 25 clients like you handle 10.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/70">
          Full landing copy shipping in Block 2. Connect QBO, upload a trial
          balance, and see Advisacor draft the close for one of your real
          clients — in under 15 minutes.
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
