import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteNav } from "../../components/SiteNav";
import { focusRing, headingFont, primaryCtaClass } from "../../components/site-ui";

export const metadata: Metadata = {
  title: "About Wiseman Financial Technologies | Advisacor™",
  description:
    "Enterprise SaaS that turns complex financial and operational work into powerful intelligence. Meet the founders behind Advisacor™.",
};

const founders = [
  {
    name: "Matthew Wiseman",
    title: "Co-Founder & Chief Executive Officer",
    subtitle: "Principal Software Architect & Creator of Advisacor™",
    body: "Matthew designed and developed Advisacor's™ enterprise architecture, AI-powered digital workforce framework, intelligent automation platform, governance engine, integrations, and evidence-based intelligence systems.",
    image: "/matthew-wiseman-headshot.png",
    imageAlt: "Matthew Wiseman, Co-Founder & CEO of Wiseman Financial Technologies",
    imageWidth: 1023,
    imageHeight: 1537,
    imageClassName: "h-full w-full object-cover object-[center_28%]",
    linkedIn: "https://www.linkedin.com/in/matthew-wiseman-807bb155",
  },
  {
    name: "Janice Wiseman",
    title: "Co-Founder & Chief Operating Officer",
    subtitle: "Enterprise Governance, Operations & Client Experience",
    body: "Janice leads the governance framework, legal architecture, operational strategy, client onboarding experience, billing philosophy, compliance standards, client success strategy, and business operations for Wiseman Financial Technologies.",
    image: "/janice-wiseman-headshot.jpg",
    imageAlt: "Janice Wiseman, Co-Founder & COO of Wiseman Financial Technologies",
    imageWidth: 400,
    imageHeight: 400,
    imageClassName: "h-full w-full object-cover object-center",
    linkedIn: "https://www.linkedin.com/in/janice-wiseman-a13850161",
  },
] as const;

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F5F7FA] text-[#111827]">
      {/* SECTION 1 — Hero */}
      <section className="relative overflow-hidden bg-[#0A1530] pb-24 pt-[200px] md:pt-[240px]">
        <SiteNav />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C9A961]/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="mb-6 text-xs font-semibold tracking-[0.2em] text-[#C9A961]">WISEMAN FINANCIAL TECHNOLOGIES, LLC</p>
          <p className="mb-8 text-sm tracking-wide text-[#C9A961] md:text-base">
            ADVISACOR™ · Powerful Intelligence. Simplified. · Insight. Accuracy. Confidence.
          </p>
          <h1 className="text-5xl font-bold leading-tight text-white md:text-6xl lg:text-7xl">
            About Wiseman Financial Technologies
          </h1>
          <p className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-white/80 md:text-xl">
            Enterprise SaaS that turns complex financial and operational work into powerful intelligence — designed to
            enhance the systems organizations already trust, not replace them.
          </p>
          <div className="mt-12 inline-flex items-center gap-3 text-sm text-white/50">
            <span className="h-px w-12 bg-[#C9A961]/40" />
            <span className="tracking-wider">CLIFTON FORGE · VIRGINIA</span>
            <span className="h-px w-12 bg-[#C9A961]/40" />
          </div>
        </div>
      </section>

      {/* SECTION 2 — Who We Are */}
      <section className="bg-[#0A1530] px-6 py-24 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Who We Are</p>
          <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] md:text-4xl ${headingFont}`}>
            Powerful technology should simplify work — not complicate it.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-8 text-white/85">
            <p>
              Wiseman Financial Technologies, LLC is an enterprise Software-as-a-Service company dedicated to helping
              organizations simplify complex financial and operational work through powerful intelligence, enterprise
              governance, and an exceptional client experience.
            </p>
            <p>
              Our flagship platform, Advisacor™, transforms complex financial and operational work into powerful
              intelligence that organizations can understand, trust, and act upon with confidence.
            </p>
            <p>
              Rather than replacing existing accounting, ERP, payroll, banking, or operational systems, Advisacor™
              enhances them through intelligent automation, enterprise financial intelligence, digital workforce
              capabilities, governance, operational insight, and evidence-based decision support.
            </p>
          </div>
          <p className={`mt-10 text-xl font-medium italic text-[#C9A961] md:text-2xl ${headingFont}`}>
            Our philosophy is simple: Powerful technology should simplify work — not complicate it.
          </p>
        </div>
      </section>

      {/* SECTION 3 — The Wiseman Promise */}
      <section className="bg-[#F5F7FA] px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">The Wiseman Promise</p>
          <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] text-slate-900 md:text-4xl ${headingFont}`}>
            Trust is not something we ask for. It is something we earn.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-8 text-slate-700">
            <p>At Wiseman Financial Technologies, trust is not something we ask for — it is something we earn.</p>
            <p>
              Everything we build is designed to make powerful technology feel simple while never compromising insight,
              accuracy, confidence, governance, security, or trust.
            </p>
            <p>
              We promise to communicate clearly, operate transparently, and treat every client with professionalism and
              fairness.
            </p>
            <p>
              When we make a mistake, we will make it right. When questions arise, we will rely upon documented evidence
              — not assumptions — to reach fair decisions.
            </p>
            <p>We believe the strongest business relationships are not built on contracts alone. They are built on trust.</p>
          </div>
          <p className={`mt-10 text-xl font-black text-[#C9A961] md:text-2xl ${headingFont}`}>That is the Wiseman Promise.</p>
        </div>
      </section>

      {/* SECTION 4 — Meet the Founders */}
      <section className="bg-[#F5F7FA] px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Meet the Founders</p>
          <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] text-slate-900 md:text-4xl ${headingFont}`}>
            Two roles. One shared vision.
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {founders.map((founder) => (
              <article key={founder.name} className="enterprise-card rounded-[2rem] p-8">
                <div className="mx-auto h-40 w-40 overflow-hidden rounded-full border-2 border-slate-200 shadow-lg md:h-48 md:w-48">
                  <Image
                    src={founder.image}
                    alt={founder.imageAlt}
                    width={founder.imageWidth}
                    height={founder.imageHeight}
                    className={founder.imageClassName}
                  />
                </div>
                <h3 className={`mt-6 text-2xl font-black text-slate-900 ${headingFont}`}>{founder.name}</h3>
                <p className="mt-2 text-sm font-semibold text-[#C9A961]">{founder.title}</p>
                <p className="mt-1 text-sm italic text-slate-600">{founder.subtitle}</p>
                <p className="mt-5 text-sm leading-7 text-slate-700">{founder.body}</p>
                <a
                  href={founder.linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-5 inline-flex text-sm font-semibold text-[#0A1530] transition hover:text-[#C9A961] ${focusRing("rounded")}`}
                >
                  Connect on LinkedIn →
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — A Shared Vision */}
      <section className="bg-[#0A1530] px-6 py-24 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">A Shared Vision</p>
          <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] md:text-4xl ${headingFont}`}>
            Powerful on the inside. Simple on the outside.
          </h2>
          <p className="mt-8 text-base leading-8 text-white/85">
            Together, Matthew and Janice founded Wiseman Financial Technologies with one shared vision: to build
            enterprise technology that is powerful on the inside, simple on the outside, and worthy of the trust placed
            in it by every client.
          </p>
          <div className={`mt-10 space-y-2 text-xl font-black text-[#C9A961] md:text-2xl ${headingFont}`}>
            <p>Matthew focuses on building the technology.</p>
            <p>Janice focuses on building the company around that technology.</p>
          </div>
        </div>
      </section>

      {/* SECTION 6 — What Makes Advisacor Different */}
      <section className="bg-[#F5F7FA] px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">What Makes Advisacor™ Different</p>
          <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] text-slate-900 md:text-4xl ${headingFont}`}>
            Built to enhance — not replace — the systems you already trust.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-8 text-slate-700">
            <p>
              Advisacor™ was never designed to replace the business systems organizations already trust. It was designed
              to make those systems significantly more powerful by combining enterprise intelligence, automation,
              governance, and digital workforce capabilities into one seamless experience.
            </p>
            <p>
              Behind the scenes, Advisacor™ performs complex analysis, validation, evidence gathering, automation, and
              decision support.
            </p>
          </div>
          <p className={`mx-auto mt-12 max-w-2xl text-center text-xl font-medium italic text-[#C9A961] md:text-2xl ${headingFont}`}>
            To our clients… it simply feels easy.
          </p>
        </div>
      </section>

      {/* SECTION 7 — Client Experience Philosophy */}
      <section className="bg-[#0A1530] px-6 py-24 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Our Client Experience Philosophy</p>
          <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] md:text-4xl ${headingFont}`}>
            Every screen. Every workflow. Every interaction.
          </h2>
          <div className="mt-8 space-y-3 text-base leading-8 text-white/85">
            <p>Every screen. Every workflow. Every agreement. Every policy. Every recommendation. Every interaction with Pulse.</p>
            <p>Everything is guided by one principle:</p>
          </div>
          <p className={`mx-auto mt-10 max-w-2xl text-center text-xl font-black text-[#C9A961] md:text-2xl ${headingFont}`}>
            Powerful technology should create a simple experience.
          </p>
          <p className="mt-10 text-center text-base leading-8 text-white/70">
            Our responsibility is to make every interaction intuitive, transparent, educational, and trustworthy.
          </p>
        </div>
      </section>

      {/* SECTION 8 — Looking Forward */}
      <section className="bg-[#F5F7FA] px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Looking Forward</p>
          <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] text-slate-900 md:text-4xl ${headingFont}`}>
            Built for the long term.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-8 text-slate-700">
            <p>
              Wiseman Financial Technologies was founded with a long-term vision. We will continue building technology that
              helps organizations work smarter, operate more efficiently, strengthen governance, reduce complexity, and
              make more confident decisions.
            </p>
            <p>
              Because we believe the best enterprise platforms are measured by how simple, trustworthy, and valuable they
              are to the people who depend on them every day.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 9 — CTA Strip */}
      <section className="bg-[#0A1530] px-6 py-20 text-center text-white">
        <div className="mx-auto max-w-2xl">
          <h2 className={`text-3xl font-black tracking-[-0.04em] md:text-4xl ${headingFont}`}>
            Ready to see what powerful intelligence looks like?
          </h2>
          <p className="mt-4 text-lg text-white/70">Request early access and we&apos;ll be in touch.</p>
          <Link
            href="/#early-access"
            className={`mt-8 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm ${primaryCtaClass} ${focusRing()}`}
          >
            Request Early Access
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
