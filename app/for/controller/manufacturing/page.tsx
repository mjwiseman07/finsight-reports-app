import { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont } from "@/components/site-ui";

export const metadata: Metadata = {
  title:
    "Advisacor for manufacturing controllers — private beta this quarter",
  description:
    "Standard costing variance, WIP, PPV, absorption, and ASC 606 for manufacturers. Join the private beta waitlist.",
};

export default function ManufacturingWaitlistPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0C] text-white">
      <SiteNav />
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-[200px] md:pt-[240px]">
        <p className="mb-6 text-sm uppercase tracking-[0.2em] text-[#C9A961]">
          For the manufacturing controller
        </p>
        <h1
          className={`${headingFont} text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl`}
        >
          Purpose-built for the shop floor.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/70">
          Waitlist form shipping in Block 5. Standard costing variance, WIP, PPV,
          absorption, and ASC 606 for manufacturers.
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
