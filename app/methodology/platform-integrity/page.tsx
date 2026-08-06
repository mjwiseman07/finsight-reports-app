import type { Metadata } from "next";
import fs from "node:fs/promises";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import {
  COPY_VERSION,
  platformIntegrityCopy,
} from "@/lib/platform-integrity/copy";
import { platformIntegrityMarkdownComponents } from "@/lib/platform-integrity/markdown-components";
import { headingFont } from "@/components/site-ui";

// PUBLIC PAGE — no auth. Renders the assertion-mapping research file as
// Advisacor's methodology paper. Shareable URL for prospects, auditors, CX.

export const metadata: Metadata = {
  title: `${platformIntegrityCopy.methodology.publicPageTitle} · Advisacor`,
  description: platformIntegrityCopy.methodology.publicPageMetaDescription,
  openGraph: {
    title: platformIntegrityCopy.methodology.publicPageTitle,
    description: platformIntegrityCopy.methodology.publicPageMetaDescription,
    type: "article",
    url: "https://www.advisacor.com/methodology/platform-integrity",
  },
  twitter: {
    card: "summary_large_image",
    title: platformIntegrityCopy.methodology.publicPageTitle,
    description: platformIntegrityCopy.methodology.publicPageMetaDescription,
  },
  alternates: {
    canonical: "https://www.advisacor.com/methodology/platform-integrity",
  },
};

async function loadResearchMd(): Promise<string> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "research",
    "schema_drift_assertion_mapping_research.md",
  );
  return fs.readFile(filePath, "utf8");
}

export default async function PlatformIntegrityMethodologyPage() {
  const markdown = await loadResearchMd();
  const copy = platformIntegrityCopy.methodology;

  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />
      <section className="mx-auto max-w-[880px] px-6 pb-[120px] pt-20">
        <header className="mb-10">
          <p
            className={`${headingFont} mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#DFC084]`}
          >
            Methodology
          </p>
          <h1
            className={`${headingFont} mb-4 text-4xl font-semibold leading-tight text-[#ECEBE7]`}
          >
            {copy.publicPageTitle}
          </h1>
          <p className="text-base leading-relaxed text-[#A29E93]">
            {copy.publicPageSubtitle}
          </p>
        </header>

        <article className="platform-integrity-methodology-public text-sm">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={platformIntegrityMarkdownComponents}
          >
            {markdown}
          </ReactMarkdown>
        </article>

        <footer className="mt-20 border-t border-[#C9A961]/20 pt-8 text-[13px] text-[#A29E93]">
          <p>
            This methodology paper is versioned alongside the Platform
            Integrity surface. {copy.researchDocLastUpdatedLabel}: copy v
            {COPY_VERSION}.
          </p>
        </footer>
      </section>
      <SiteFooter />
    </main>
  );
}
