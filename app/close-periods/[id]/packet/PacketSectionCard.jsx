"use client";

import { useState } from "react";
import { headingFont } from "@/components/site-ui";
import { SECTION_TITLES } from "@/lib/close-packet/section-titles";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function money(n) {
  if (n === null || typeof n === "undefined" || Number.isNaN(Number(n))) return "—";
  return usd.format(Number(n));
}

function pct(n) {
  if (n === null || typeof n === "undefined" || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function statusMeta(status) {
  if (status === "error") return { label: "Error", cls: "bg-red-500/20 text-red-300 ring-red-500/40" };
  if (status === "ok" || status === "rendered" || !status)
    return { label: "OK", cls: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40" };
  return { label: "Pending", cls: "bg-white/10 text-white/60 ring-white/20" };
}

function Raw({ data }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-white/70">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function FinancialTable({ content }) {
  const rows = content?.rows || content?.line_items || [];
  return (
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/50">
          <th className="py-2 pr-4">Account</th>
          <th className="py-2 pr-4 text-right">Current</th>
          <th className="py-2 pr-4 text-right">Prior</th>
          <th className="py-2 pr-4 text-right">Δ$</th>
          <th className="py-2 text-right">Δ%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const change = typeof r.change === "number" ? r.change : (r.current ?? 0) - (r.prior ?? 0);
          return (
            <tr
              key={`${r.account_name}-${i}`}
              className={`border-b border-white/5 ${r.is_subtotal ? "font-semibold text-white" : "text-white/80"}`}
            >
              <td className="py-1.5 pr-4" style={{ paddingLeft: `${(r.indent_level || 0) * 12}px` }}>
                {r.account_name}
              </td>
              <td className="py-1.5 pr-4 text-right">{money(r.current)}</td>
              <td className="py-1.5 pr-4 text-right">{money(r.prior)}</td>
              <td className="py-1.5 pr-4 text-right">{money(change)}</td>
              <td className="py-1.5 text-right">{pct(r.pct_change)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function VarianceSeverityDot({ pctChange }) {
  const abs = Math.abs(Number(pctChange) || 0);
  const color = abs >= 50 ? "bg-red-400" : abs >= 10 ? "bg-amber-400" : "bg-white/40";
  return <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

function JeLog({ content }) {
  const [showAll, setShowAll] = useState(false);
  const entries = content?.entries || [];
  const shown = showAll ? entries : entries.slice(0, 25);
  const accts = (lines, type) =>
    (lines || [])
      .filter((l) => (type === "debit" ? l.debit : l.credit))
      .map((l) => l.account)
      .join(", ");
  return (
    <div>
      {(content?.warnings || []).map((w, i) => (
        <p key={i} className="mb-2 text-xs text-amber-300">
          {w}
        </p>
      ))}
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/50">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">JE #</th>
              <th className="py-2 pr-4">Memo</th>
              <th className="py-2 pr-4">Debit</th>
              <th className="py-2 pr-4">Credit</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e, i) => (
              <tr key={`${e.je_number}-${i}`} className="border-b border-white/5 text-white/80">
                <td className="py-1.5 pr-4 whitespace-nowrap">{e.date}</td>
                <td className="py-1.5 pr-4 whitespace-nowrap">{e.je_number}</td>
                <td className="py-1.5 pr-4">{e.memo}</td>
                <td className="py-1.5 pr-4 text-white/60">{accts(e.lines, "debit")}</td>
                <td className="py-1.5 pr-4 text-white/60">{accts(e.lines, "credit")}</td>
                <td className="py-1.5 text-right">{money(e.total_debit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {content?.truncation_note && (
        <p className="mt-2 text-xs text-white/50">{content.truncation_note}</p>
      )}
      {entries.length > 25 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-sm text-[#C9A961] hover:underline"
        >
          {showAll ? "Show fewer" : `Show all ${entries.length}`}
        </button>
      )}
    </div>
  );
}

function SectionBody({ sectionKey, content }) {
  try {
    switch (sectionKey) {
      case "cover":
        return (
          <dl className="space-y-2 text-sm text-white/80">
            <div>
              <dt className="text-white/50">Client</dt>
              <dd>{content.client_name}</dd>
            </div>
            <div>
              <dt className="text-white/50">Period</dt>
              <dd>{content.period_label}</dd>
            </div>
            <div>
              <dt className="text-white/50">Prepared by</dt>
              <dd>
                {content.prepared_by}
                {content.prepared_by_role ? ` · ${content.prepared_by_role}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-white/50">Generated</dt>
              <dd>
                {content.packet_date}
                {content.packet_version ? ` · v${content.packet_version}` : ""}
              </dd>
            </div>
          </dl>
        );

      case "exec_summary": {
        const md = content.narrative_md || "";
        const paras = md.split("\n\n").filter(Boolean);
        return (
          <div className="space-y-3 text-sm leading-relaxed text-white/85">
            {paras.length ? (
              paras.map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <p className="text-white/50">No narrative generated.</p>
            )}
            {Array.isArray(content.sources) && content.sources.length > 0 && (
              <p className="pt-2 text-xs text-white/40">Sources: {content.sources.join(", ")}</p>
            )}
          </div>
        );
      }

      case "pnl":
      case "bs":
      case "cf":
        return <FinancialTable content={content} />;

      case "variance": {
        const items = content.flagged_items || [];
        if (!items.length) return <p className="text-sm text-white/60">No variances exceeded thresholds.</p>;
        return (
          <ul className="space-y-3">
            {items.map((it, i) => (
              <li key={`${it.account}-${i}`} className="flex gap-2 text-sm">
                <VarianceSeverityDot pctChange={it.pct_change} />
                <div>
                  <span className="font-medium text-white">{it.account}</span>
                  <span className="text-white/70">
                    {" "}
                    — was {money(it.prior)}, now {money(it.current)} ({pct(it.pct_change)})
                  </span>
                  {it.commentary && <p className="mt-0.5 text-white/60">{it.commentary}</p>}
                </div>
              </li>
            ))}
          </ul>
        );
      }

      case "anomalies": {
        const flags = content.flags || [];
        if (!flags.length) return <p className="text-sm text-white/60">No anomalies detected.</p>;
        const sevCls = {
          high: "bg-red-500/20 text-red-300 ring-red-500/40",
          med: "bg-amber-500/20 text-amber-300 ring-amber-500/40",
          low: "bg-white/10 text-white/60 ring-white/20",
        };
        return (
          <ul className="space-y-4">
            {flags.map((f, i) => (
              <li key={i} className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ring-1 ${
                      sevCls[f.severity] || sevCls.low
                    }`}
                  >
                    {f.severity}
                  </span>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-white/60">{f.category}</span>
                </div>
                <p className="mt-1 text-white/85">{f.description}</p>
                {f.evidence && Object.keys(f.evidence).length > 0 && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-[#C9A961]">Evidence</summary>
                    <pre className="mt-1 overflow-x-auto rounded bg-black/40 p-2 text-xs text-white/60">
                      {JSON.stringify(f.evidence, null, 2)}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        );
      }

      case "je_log":
        return <JeLog content={content} />;

      case "recon": {
        const accounts = content.accounts || [];
        if (!accounts.length) return <p className="text-sm text-white/60">No reconciliation items.</p>;
        return (
          <ul className="space-y-2 text-sm">
            {accounts.map((a, i) => (
              <li key={i} className="flex justify-between border-b border-white/5 py-1.5">
                <span className="text-white/85">{a.account_name}</span>
                <span className="text-white/50">{a.status}</span>
              </li>
            ))}
          </ul>
        );
      }

      case "checklist": {
        const items = content.items || [];
        const done = new Set(["passed", "manual_confirmed", "waived", "done"]);
        const completed = items.filter((it) => done.has(it.status)).length;
        const outstanding = items.filter((it) => !done.has(it.status));
        return (
          <div className="text-sm">
            <p className="text-white/70">
              {completed} of {items.length} complete
              {content.run_status ? ` · run ${content.run_status}` : ""}
            </p>
            {outstanding.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {outstanding.map((it, i) => (
                  <li key={i} className="flex justify-between border-b border-white/5 py-1.5">
                    <span className="text-white/85">{it.label}</span>
                    <span className="text-amber-300">{it.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }

      case "disclaimer":
        return (
          <p className="text-sm leading-relaxed text-white/70">
            {content.disclaimer_text || content.text || "No disclaimer text."}
          </p>
        );

      default:
        return <Raw data={content} />;
    }
  } catch {
    return <Raw data={content} />;
  }
}

export default function PacketSectionCard({ section, packetLocked, onEditClick }) {
  const content = section.content_json || {};
  const status = content.status;
  const meta = statusMeta(status);
  const title = SECTION_TITLES[section.section_key] || section.section_key;

  return (
    <section className="section-card rounded-2xl border border-white/10 bg-[#111112] p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className={`${headingFont} text-xl text-white`}>{title}</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${meta.cls}`}>{meta.label}</span>
        {section.manually_edited && (
          <span className="rounded-full px-2 py-0.5 text-xs font-medium text-[#C9A961] ring-1 ring-[#C9A961]/40">
            Edited
          </span>
        )}
        {!packetLocked && (
          <button
            type="button"
            onClick={onEditClick}
            className="no-print ml-auto rounded-lg border border-white/10 px-3 py-1 text-xs text-white/70 transition-colors hover:bg-white/5"
          >
            Edit
          </button>
        )}
      </div>

      {status === "error" ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {content.error_message || "This section failed to render."}
        </div>
      ) : (
        <SectionBody sectionKey={section.section_key} content={content} />
      )}
    </section>
  );
}
