"use client";

import { useId, useState } from "react";

type HelpContent = {
  title: string;
  explanation: string;
  why: string;
  example: string;
  impact: string;
};

export function HelpTip({ content }: { content?: HelpContent | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();

  if (!content) return null;

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`Help: ${content.title}`}
        aria-describedby={tooltipId}
        aria-expanded={isOpen}
        onClick={(event) => {
          event.preventDefault();
          setIsOpen((current) => !current);
        }}
        onBlur={() => setIsOpen(false)}
        className="peer inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] text-[11px] font-black text-slate-200 outline-none transition hover:border-[#FFB36F]/70 hover:text-[#FFB36F] focus:border-[#FFB36F]/70 focus:ring-2 focus:ring-[#FFB36F]/30"
      >
        ?
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 top-7 z-50 w-[min(20rem,calc(100vw-3rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#111827] p-4 text-left text-xs leading-5 text-slate-300 opacity-0 shadow-2xl shadow-black/40 transition peer-hover:opacity-100 peer-focus:opacity-100 sm:left-auto sm:right-0 sm:translate-x-0 ${
          isOpen ? "opacity-100" : ""
        }`}
      >
        <span className="block text-sm font-black text-white">{content.title}</span>
        <span className="mt-2 block">
          <span className="font-black text-[#FFB36F]">What it means: </span>
          {content.explanation}
        </span>
        <span className="mt-2 block">
          <span className="font-black text-[#FFB36F]">Why Advisacor needs it: </span>
          {content.why}
        </span>
        <span className="mt-2 block">
          <span className="font-black text-[#FFB36F]">Example: </span>
          {content.example}
        </span>
        <span className="mt-2 block">
          <span className="font-black text-[#FFB36F]">Impact: </span>
          {content.impact}
        </span>
      </span>
    </span>
  );
}
