"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PlatformIntegrityMethodology } from "@/lib/platform-integrity/types";
import { platformIntegrityCopy } from "@/lib/platform-integrity/copy";
import { platformIntegrityMarkdownComponents } from "@/lib/platform-integrity/markdown-components";
import { focusRing, headingFont } from "@/components/site-ui";

/**
 * Renders the research report inline via react-markdown + remark-gfm (B.4).
 * Static MD fetched from /research/schema_drift_assertion_mapping_research.md.
 */
export function MethodologyDrawer({
  open,
  onClose,
  methodology,
}: {
  open: boolean;
  onClose: () => void;
  methodology: PlatformIntegrityMethodology;
}) {
  const [report, setReport] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const copy = platformIntegrityCopy.methodology;

  React.useEffect(() => {
    if (!open) return;
    if (report !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          "/research/schema_drift_assertion_mapping_research.md",
          { credentials: "same-origin" },
        );
        if (!res.ok) {
          if (!cancelled)
            setError(`Failed to load methodology (${res.status}).`);
          return;
        }
        const text = await res.text();
        if (!cancelled) setReport(text);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Unknown error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, report]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.drawerTitle}
      className="fixed inset-0 z-[1000] flex justify-end bg-black/60"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[720px] flex-col overflow-hidden border-l border-[#C9A961]/25 bg-[#111112]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-[#C9A961]/20 px-5 py-4">
          <div>
            <div
              className={`${headingFont} text-lg font-semibold text-[#ECEBE7]`}
            >
              {methodology.headline || copy.drawerTitle}
            </div>
            <div className="mt-1 max-w-[560px] text-xs text-[#7A7974]">
              {methodology.subtitle || copy.drawerSubtitle}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`${focusRing()} rounded-md border border-[#C9A961]/25 bg-[#1A1A1C]/50 px-3 py-1.5 text-[13px] text-[#ECEBE7] hover:border-[#C9A961]/40`}
          >
            {copy.closeLabel}
          </button>
        </header>

        <section className="border-b border-[#C9A961]/15 px-5 py-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#7A7974]">
            {copy.primarySourcesEyebrow}
          </div>
          <ul className="m-0 list-disc space-y-1 pl-5 text-[13px] text-[#ECEBE7]">
            {methodology.primary_sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${focusRing()} text-[#C9A961] underline underline-offset-[3px] hover:text-[#DFC084]`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex-1 overflow-auto px-5 py-4">
          {error ? (
            <div className="text-red-400">{error}</div>
          ) : report === null ? (
            <div className="text-[#7A7974]">{copy.loadingLabel}</div>
          ) : (
            <article className="platform-integrity-methodology max-w-none text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={platformIntegrityMarkdownComponents}
              >
                {report}
              </ReactMarkdown>
            </article>
          )}
        </div>

        <footer className="border-t border-[#C9A961]/20 bg-[#1A1A1C] px-5 py-3 text-[11px] text-[#7A7974]">
          {methodology.disclosure || platformIntegrityCopy.page.disclosure}
        </footer>
      </aside>
    </div>
  );
}
