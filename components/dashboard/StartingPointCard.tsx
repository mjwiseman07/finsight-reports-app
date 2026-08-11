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

const PERSONA_CHIPS = [
  { id: "owner", label: "Owner" },
  { id: "bookkeeper", label: "Bookkeeper" },
  { id: "controller", label: "Controller" },
  { id: "fractional-cfo", label: "Fractional CFO" },
];

function isFirmPersona(persona: string) {
  return FIRM_PERSONAS.has((persona || "").toLowerCase());
}

type StartingPointCardProps = {
  persona: string | null | undefined;
  onSetPersona?: (personaId: string) => Promise<void>;
};

export default function StartingPointCard({ persona, onSetPersona }: StartingPointCardProps) {
  const [dismissed, setDismissed] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "true");
  }, []);

  if (!persona) {
    return (
      <div className="rounded-[2rem] border border-[#3A3A3D] bg-[#111113] p-6">
        <p className={`${headingFont} text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A961]`}>
          Your starting point
        </p>
        <p className={`${headingFont} mt-2 text-lg font-semibold text-[#ECEBE7]`}>
          Which best describes you?
        </p>
        <p className="mt-1 text-sm text-[#ECEBE7]/60">
          Advisacor tailors your dashboard tiles based on your role.
        </p>
        <div
          role="group"
          aria-label="Choose your persona"
          className="mt-4 flex flex-wrap gap-2"
        >
          {PERSONA_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              disabled={saving}
              onClick={async () => {
                if (!onSetPersona || saving) return;
                setSaving(true);
                try {
                  await onSetPersona(chip.id);
                } finally {
                  setSaving(false);
                }
              }}
              className={focusRing(
                "rounded-full border-2 border-[#3A3A3D] bg-[#1B1B1D] px-4 py-2 text-sm font-semibold text-[#ECEBE7] transition-colors hover:border-[#C9A961] hover:text-[#C9A961] disabled:opacity-60"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

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
              "block rounded-xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-4 transition-colors hover:border-[#C9A961]/60 hover:bg-[#1A1A1C]/70",
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
            "block rounded-xl border border-dashed border-[#C9A961]/25 bg-transparent p-4 text-left transition-colors hover:border-[#C9A961]/50",
          )}
        >
          <p className={`${headingFont} font-semibold text-[#ECEBE7]`}>Explore Dashboard</p>
          <p className="mt-1 text-sm text-[#ECEBE7]/70">Dismiss and browse on my own.</p>
        </button>
      </div>
    </section>
  );
}
