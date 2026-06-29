import type { Metadata } from "next";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteNav } from "../../components/SiteNav";
import { headingFont } from "../../components/site-ui";

export const metadata: Metadata = {
  title: "Privacy Policy | Advisacor™",
  description: "Privacy policy for Wiseman Financial Technologies LLC and Advisacor™.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F5F7FA] text-[#111827]">
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 px-6 pb-16 md:pb-20">
        <SiteNav />
        <div className="relative z-10 mx-auto max-w-3xl pt-32 md:pt-40">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9A961]">Legal</p>
          <h1 className={`mt-4 text-4xl font-black tracking-[-0.04em] text-slate-900 md:text-5xl ${headingFont}`}>
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm font-semibold text-slate-600">Last updated June 2026</p>
          <div className="mt-10 space-y-4 text-lg leading-8 text-slate-700">
            <p>
              Wiseman Financial Technologies LLC (&quot;Advisacor™&quot;) is committed to protecting the privacy of our
              users. A full privacy policy will be published prior to general availability of the platform.
            </p>
            <p>
              For questions about data privacy, contact{" "}
              <a href="mailto:privacy@advisacor.com" className="font-semibold text-[#C9A961] hover:text-[#B8975A]">
                privacy@advisacor.com
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
