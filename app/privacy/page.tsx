import type { Metadata } from "next";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteNav } from "../../components/SiteNav";

export const metadata: Metadata = {
  title: "Privacy Policy | Advisacor™",
  description: "Privacy policy for Wiseman Financial Technologies, LLC and the Advisacor™ platform.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#28251D]">
      <SiteNav />
      <section className="bg-gradient-to-br from-[#F7F6F2] via-[#EEEDE7] to-[#D4D1CA] pb-20 pt-[240px] md:pt-[260px] lg:pt-[280px]">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-4 text-xs font-semibold tracking-wider text-[#C9A961]">PRIVACY POLICY</p>
          <h1 className="text-4xl font-bold leading-tight text-[#28251D] md:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-sm text-[#7A7974]">Last updated: June 2026</p>
        </div>
      </section>

      <section className="bg-[#F9F8F5] py-20">
        <div className="prose prose-slate mx-auto max-w-3xl px-6">
          <p>
            Wiseman Financial Technologies, LLC (&quot;Advisacor™,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is
            committed to protecting the privacy of visitors to our website and prospective customers who join our early
            access waitlist.
          </p>
          <h2>Information We Collect</h2>
          <p>
            During the pre-launch phase, the only information we collect is the name and email address you voluntarily
            submit through the Request Early Access form on our website. We use this information solely to communicate
            with you about product updates, early access invitations, and launch news.
          </p>
          <h2>How We Use Your Information</h2>
          <p>
            We do not sell, rent, or share your information with third parties. Your information is stored securely and
            used only for the purposes described above.
          </p>
          <h2>Future Updates</h2>
          <p>
            A comprehensive privacy policy describing how Advisacor™ handles customer financial data, security
            architecture, and data residency will be published prior to general availability of the platform.
          </p>
          <h2>Contact</h2>
          <p>
            For questions about data privacy, contact{" "}
            <a href="mailto:privacy@advisacor.com" className="text-[#C9A961] hover:underline">
              privacy@advisacor.com
            </a>
            .
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
