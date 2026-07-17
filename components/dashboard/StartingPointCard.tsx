"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { focusRing, headingFont } from "../site-ui";

const DISMISS_KEY = "advisacor_dashboard_starting_point_dismissed_v1";

type Tile = {
  key: string;
  title: string;
  description: string;
  href: string;
};

const OWNER_TILES: Tile[] = [
  {
    key: "executive-package",
    title: "Executive Financial Package",
    description: "Generate your board-ready executive package.",
    href: "/dashboard?startingPoint=executive-package",
  },
  {
    key: "financial-health-score",
    title: "Financial Health Score",
    description: "See your overall financial health at a glance.",
    href: "/dashboard?startingPoint=financial-health-score",
  },
  {
    key: "ask-pulse",
    title: "Ask Pulse",
    description: "Ask a question about your financials in plain English.",
    href: "/dashboard?startingPoint=ask-pulse",
  },
];

const FIRM_TILES: Tile[] = [
  {
    key: "reconciliation-audit",
    title: "Prior-Month Reconciliation Audit",
    description: "Review pending reconciliation items across clients.",
    href: "/reviewer/queue?status=pending",
  },
  {
    key: "miscoded-review",
    title: "Missed / Miscoded Transaction Review",
    description: "Investigate blocked and miscoded transactions.",
    href: "/reviewer/queue?status=blocked",
  },
  {
    key: "client-executive-package",
    title: "Client Executive Package",
    description: "Assemble an executive package for a client.",
    href: "/dashboard?startingPoint=executive-package",
  },
];

const FIRM_PERSONAS = new Set([
  "bookkeeper",
  "controller",
  "fractional-cfo",
  "accounting_firm",
  "accounting-firm",
  "firm",
]);

function isFirmPersona(persona: string) {
  return FIRM_PERSONAS.has((persona || "").toLowerCase());
}

export default function StartingPointCard({ persona }: { persona: string }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "true");
  }, []);

  if (dismissed) return null;

  const tiles = isFirmPersona(persona) ? FIRM_TILES : OWNER_TILES;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  return (
    <section className="relative rounded-2xl border-2 border-[#C9A961] bg-[#111112] p-6 text-[#ECEBE7] shadow-lg">
      <button
        type="button"
        aria-label="Dismiss starting point"
        onClick={dismiss}
        className={focusRing(
          "absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[#ECEBE7]/70 hover:text-[#ECEBE7]",
        )}
      >
        ✕
      </button>
      <h2 className={`${headingFont} text-xl font-semibold text-[#ECEBE7]`}>Your starting point</h2>
      <p className="mt-1 text-sm text-[#ECEBE7]/70">Pick where you&apos;d like to begin.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Link
            key={tile.key}
            href={tile.href}
            className={focusRing(
              "block rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-[#C9A961]/60 hover:bg-white/10",
            )}
          >
            <p className={`${headingFont} font-semibold text-[#ECEBE7]`}>{tile.title}</p>
            <p className="mt-1 text-sm text-[#ECEBE7]/70">{tile.description}</p>
          </Link>
        ))}
        <button
          type="button"
          onClick={dismiss}
          className={focusRing(
            "block rounded-xl border border-dashed border-white/15 bg-transparent p-4 text-left transition-colors hover:border-white/30",
          )}
        >
          <p className={`${headingFont} font-semibold text-[#ECEBE7]`}>Explore Dashboard</p>
          <p className="mt-1 text-sm text-[#ECEBE7]/70">Dismiss and browse on my own.</p>
        </button>
      </div>
    </section>
  );
}
