"use client";

import { useState } from "react";
import { headingFont } from "@/components/site-ui";
import PacketSectionCard from "./PacketSectionCard";
import SectionEditorDrawer from "./SectionEditorDrawer";
import RegenerateButton from "./RegenerateButton";
import LockButton from "./LockButton";

export default function PacketPageClient({
  closePeriodId,
  packet,
  clientName,
  firmName,
  periodLabel,
  sections,
}) {
  const [drawerSection, setDrawerSection] = useState(null);

  const packetLocked = packet?.status === "locked";
  const sectionStatuses = sections.map((s) => s.content_json?.status ?? "ok");

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="no-print mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className={`${headingFont} text-2xl text-white`}>{clientName}</h1>
          <p className="mt-1 text-sm text-white/60">
            {firmName ? `${firmName} · ` : ""}
            {periodLabel}
            {typeof packet?.version === "number" ? ` · v${packet.version}` : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            packetLocked
              ? "bg-[#C9A961]/20 text-[#C9A961] ring-1 ring-[#C9A961]/40"
              : "bg-white/10 text-white/70"
          }`}
        >
          {packetLocked ? "Locked" : "Draft"}
        </span>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row">
        <main className="flex-1 space-y-6">
          {sections.map((section) => (
            <PacketSectionCard
              key={section.id}
              section={section}
              packetLocked={packetLocked}
              onEditClick={() => setDrawerSection(section)}
            />
          ))}
        </main>

        <aside className="no-print w-full shrink-0 lg:w-64">
          <div className="sticky top-6 space-y-3 rounded-2xl border border-white/10 bg-[#111112] p-4">
            {!packetLocked && (
              <RegenerateButton closePeriodId={closePeriodId} packetLocked={packetLocked} />
            )}
            <LockButton packetId={packet.id} packetLocked={packetLocked} sectionStatuses={sectionStatuses} />
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/40"
              title="PDF export ships in C4"
            >
              Download PDF (C4)
            </button>
          </div>
        </aside>
      </div>

      <SectionEditorDrawer
        packetId={packet.id}
        section={drawerSection}
        open={Boolean(drawerSection)}
        onClose={() => setDrawerSection(null)}
      />
    </div>
  );
}
