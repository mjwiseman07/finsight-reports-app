import { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont } from "@/components/site-ui";

export const metadata: Metadata = {
  title:
    "Advisacor for bookkeeping and accounting firms — never scramble when staff leaves",
  description:
    "Multi-client dashboard, AI review assist, and Full Close elastic capacity so a departing bookkeeper never breaks your firm.",
};

export default function FirmPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0C] text-white">
      <SiteNav />
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-[200px] md:pt-[240px]">
        <p className="mb-6 text-sm uppercase tracking-[0.2em] text-[#C9A961]">
          For the firm
        </p>
        <h1
          className={`${headingFont} text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl`}
        >
          Never scramble when a bookkeeper leaves.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/70">
          Full landing copy shipping in Block 3. Connect your QBO firm master and
          see every client&apos;s close status on one screen — in under 15
          minutes.
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
