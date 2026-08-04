"use client";

import { headingFont } from "@/components/site-ui";

export type LifecycleEvent = {
  id: string;
  event_kind: string;
  event_at: string;
  schema_version: string;
  chain_seq: number;
  pilot_slot_id: string;
  from_status: string | null;
  to_status: string | null;
  classification_hint: string | null;
  company_id: string | null;
  firm_id: string | null;
  actor_kind: string;
  actor_user_id: string | null;
  actor_via: string;
  assertions_covered: string[] | null;
  evidence_refs: unknown;
  reason_code: string;
  reason_text: string | null;
  payload: Record<string, unknown>;
  prev_hash: string | null;
  row_hash: string;
};

export function LifecycleEvidenceDrawer({
  event,
  onClose,
}: {
  event: LifecycleEvent;
  onClose: () => void;
}) {
  const evidenceUri =
    (typeof event.payload?.evidence_uri === "string" &&
      event.payload.evidence_uri) ||
    null;
  const stripeEventId =
    (typeof event.payload?.stripe_event_id === "string" &&
      event.payload.stripe_event_id) ||
    null;
  const sha256 =
    (typeof event.payload?.sha256 === "string" && event.payload.sha256) || null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-xl overflow-y-auto border-l border-[#C9A961]/30 bg-[#111112] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className={`${headingFont} text-lg font-semibold text-[#ECEBE7]`}>
            Event #{event.chain_seq}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#C9A961]/30 bg-[#1A1A1C] px-2 py-1 text-xs text-[#ECEBE7] hover:bg-[#1A1A1C]/80"
          >
            Close
          </button>
        </div>

        <dl className="mt-4 space-y-3 text-sm text-[#ECEBE7]">
          <div>
            <dt className="text-[#A29E93]">Kind</dt>
            <dd className="font-mono">{event.event_kind}</dd>
          </div>
          <div>
            <dt className="text-[#A29E93]">At (UTC)</dt>
            <dd className="font-mono">{event.event_at}</dd>
          </div>
          <div>
            <dt className="text-[#A29E93]">Transition</dt>
            <dd className="font-mono">
              {event.from_status ?? "∅"} → {event.to_status ?? "∅"}
            </dd>
          </div>
          <div>
            <dt className="text-[#A29E93]">Actor</dt>
            <dd className="font-mono">
              {event.actor_kind} via {event.actor_via}
              {event.actor_user_id
                ? ` (${event.actor_user_id.slice(0, 8)}…)`
                : ""}
            </dd>
          </div>
          <div>
            <dt className="text-[#A29E93]">Schema version</dt>
            <dd className="font-mono">{event.schema_version}</dd>
          </div>
          <div>
            <dt className="text-[#A29E93]">Chain</dt>
            <dd className="break-all font-mono text-xs">
              row_hash: {event.row_hash}
              <br />
              prev_hash: {event.prev_hash ?? "(none — first row)"}
            </dd>
          </div>
          {stripeEventId ? (
            <div>
              <dt className="text-[#A29E93]">Stripe event id</dt>
              <dd className="font-mono">{stripeEventId}</dd>
            </div>
          ) : null}
          {sha256 ? (
            <div>
              <dt className="text-[#A29E93]">Evidence SHA-256</dt>
              <dd className="break-all font-mono text-xs">{sha256}</dd>
            </div>
          ) : null}
          {evidenceUri ? (
            <div>
              <dt className="text-[#A29E93]">Evidence URI</dt>
              <dd className="break-all font-mono text-xs">{evidenceUri}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-[#A29E93]">Payload (raw)</h3>
          <pre className="mt-2 max-h-96 overflow-auto rounded-md border border-[#C9A961]/20 bg-black/40 p-3 font-mono text-xs text-[#ECEBE7]">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
