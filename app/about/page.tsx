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
    body: "Janice leads the operational strategy, governance, compliance, and business execution behind Advisacor™.",
    bioParagraphs: [
      "As Co-Founder & Chief Operating Officer of Wiseman Financial Technologies, LLC, Janice leads the operational strategy, governance, compliance, and business execution behind Advisacor™ — an AI-powered platform designed to transform accounting, finance, audit, healthcare revenue cycle, and operational decision-making.",
      "She oversees operations, legal and regulatory compliance, client onboarding, customer success, billing strategy, business development, and long-term organizational planning.",
      "Her experience spans healthcare revenue cycle management, patient financial services, accounts receivable, collections, banking, consumer finance, legal collections, payment operations, compliance, and operational leadership. Throughout her career, she has built financial controls, standardized operations, created executive reporting, developed policies and procedures, trained teams, and improved organizational performance across highly regulated industries.",
      "Working directly in healthcare, banking, finance, and legal collections has given her firsthand insight into the operational, financial, and compliance challenges organizations face every day. Those experiences shape Advisacor's development, ensuring every solution solves practical business problems — not theoretical ones.",
    ],
    focusAreas: [
      "Executive Leadership",
      "Operations Management",
      "Corporate Governance",
      "Healthcare Revenue Cycle (RCM)",
      "Patient Financial Services",
      "Accounts Receivable & Collections",
      "Banking & Consumer Finance",
      "Legal Collections",
      "Regulatory Compliance",
      "Client Success & Onboarding",
      "Business Strategy",
      "AI Business Operations",
    ],
    promise:
      "We build technology around the professionals who use it. Every solution is designed to solve real operational challenges, deliver transparent and trustworthy results, and empower organizations to work smarter, make better decisions, and achieve meaningful outcomes.",
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
    <main className="min-h-screen bg-[#F7F6F2] text-[#28251D]">
      <SiteNav />
      {/* SECTION 1 — Hero */}
      <section className="relative overflow-hidden bg-[#111112] pb-24 pt-[240px] md:pt-[260px] lg:pt-[280px]">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C9A961]/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="mb-6 text-xs font-semibold tracking-[0.2em] text-[#C9A961]">WISEMAN FINANCIAL TECHNOLOGIES, LLC</p>
          <p className="mb-8 text-sm tracking-wide text-[#C9A961] md:text-base">
            ADVISACOR™ · Powerful Intelligence. Simplified. · Insight. Accuracy. Confidence.
          </p>
          <h1 className="text-5xl font-bold leading-tight text-[#ECEBE7] md:text-6xl lg:text-7xl">
            About Wiseman Financial Technologies
          </h1>
          <p className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-[#ECEBE7] md:text-xl">
            Enterprise SaaS that turns complex financial and operational work into powerful intelligence — designed to
            enhance the systems organizations already trust, not replace them.
          </p>
          <div className="mt-12 inline-flex items-center gap-3 text-sm text-[#7A7974]">
            <span className="h-px w-12 bg-[#C9A961]/40" />
            <span className="tracking-wider">CLIFTON FORGE · VIRGINIA</span>
            <span className="h-px w-12 bg-[#C9A961]/40" />
          </div>
        </div>
      </section>

      {/* SECTION 2 — Who We Are */}
      <section className="bg-[#111112] px-6 py-24 text-[#ECEBE7]">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Who We Are</p>
          <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] md:text-4xl ${headingFont}`}>
            Powerful technology should simplify work — not complicate it.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-8 text-[#ECEBE7]">
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

      {/* SECTION 3 — Meet the Founders */}
      <section className="bg-[#F7F6F2] px-6 pt-24 pb-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Meet the Founders</p>
          <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] text-[#28251D] md:text-4xl ${headingFont}`}>
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
                <h3 className={`mt-6 text-2xl font-black text-[#F9F8F5] ${headingFont}`}>{founder.name}</h3>
                <p className="mt-2 text-sm font-semibold text-[#C9A961]">{founder.title}</p>
                <p className="mt-1 text-sm italic text-[#A29E93]">{founder.subtitle}</p>
                {"bioParagraphs" in founder && founder.bioParagraphs ? (
                  <div className="mt-5 space-y-4 text-sm leading-7 text-[#ECEBE7]">
                    {founder.bioParagraphs.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-7 text-[#ECEBE7]">{founder.body}</p>
                )}
                {"focusAreas" in founder && founder.focusAreas ? (
                  <div className="mt-6">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C9A961]">Areas of Focus</p>
                    <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm leading-6 text-[#ECEBE7] sm:grid-cols-2">
                      {founder.focusAreas.map((area) => (
                        <li key={area} className="flex items-start gap-2">
                          <span aria-hidden className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[#C9A961]" />
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {"promise" in founder && founder.promise ? (
                  <div className="mt-6 rounded-2xl border border-[#C9A961]/30 bg-[#C9A961]/5 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C9A961]">Our Promise</p>
                    <p className="mt-2 text-sm leading-7 text-[#ECEBE7]">{founder.promise}</p>
                  </div>
                ) : null}
                <a
                  href={founder.linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-5 inline-flex text-sm font-semibold text-[#ECEBE7] transition hover:text-[#C9A961] ${focusRing("rounded")}`}
                >
                  Connect on LinkedIn →
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — A Shared Vision */}
      <section className="bg-[#111112] px-6 py-24 text-[#ECEBE7]">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">A Shared Vision</p>
          <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] md:text-4xl ${headingFont}`}>
            Powerful on the inside. Simple on the outside.
          </h2>
          <p className="mt-8 text-base leading-8 text-[#ECEBE7]">
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

      {/* SECTION 5 — What Makes Advisacor Different */}
      <section className="bg-[#F7F6F2] px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">What Makes Advisacor™ Different</p>
          <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] text-[#28251D] md:text-4xl ${headingFont}`}>
            Built to enhance — not replace — the systems you already trust.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-8 text-[#28251D]">
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

      {/* SECTION 6 — Client Experience Philosophy */}
      <section className="bg-[#111112] px-6 py-24 text-[#ECEBE7]">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Our Client Experience Philosophy</p>
          <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] md:text-4xl ${headingFont}`}>
            Every screen. Every workflow. Every interaction.
          </h2>
          <div className="mt-8 space-y-3 text-base leading-8 text-[#ECEBE7]">
            <p>Every screen. Every workflow. Every agreement. Every policy. Every recommendation. Every interaction with Pulse.</p>
            <p>Everything is guided by one principle:</p>
          </div>
          <p className={`mx-auto mt-10 max-w-2xl text-center text-xl font-black text-[#C9A961] md:text-2xl ${headingFont}`}>
            Powerful technology should create a simple experience.
          </p>
          <p className="mt-10 text-center text-base leading-8 text-[#A29E93]">
            Our responsibility is to make every interaction intuitive, transparent, educational, and trustworthy.
          </p>
        </div>
      </section>

      {/* SECTION 7 — Looking Forward */}
      <section className="bg-[#F7F6F2] px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Looking Forward</p>
          <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] text-[#28251D] md:text-4xl ${headingFont}`}>
            Built for the long term.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-8 text-[#28251D]">
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

      {/* SECTION 8 — CTA Strip */}
      <section className="bg-[#111112] px-6 py-20 text-center text-[#ECEBE7]">
        <div className="mx-auto max-w-2xl">
          <h2 className={`text-3xl font-black tracking-[-0.04em] md:text-4xl ${headingFont}`}>
            Ready to see what powerful intelligence looks like?
          </h2>
          <p className="mt-4 text-lg text-[#A29E93]">Request early access and we&apos;ll be in touch.</p>
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
