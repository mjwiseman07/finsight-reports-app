"use client";

import { useEffect, useMemo, useState } from "react";
import { headingFont } from "@/components/site-ui";
import type { LifecycleEvent } from "./LifecycleEvidenceDrawer";
import { LifecycleEvidenceDrawer } from "./LifecycleEvidenceDrawer";
import { LifecycleEventRow } from "./LifecycleEventRow";
import {
  verifyChain,
  type ChainRow,
  type ChainVerification,
} from "@/lib/pilot-lifecycle/client-verifier";

type ApiResponse = {
  engagement: { id: string; company_id: string | null; firm_id: string | null };
  events: LifecycleEvent[];
  server_verify: { ok: boolean; breaks?: unknown[]; error?: string };
  max_rows: number;
  truncated: boolean;
};

function toChainRow(e: LifecycleEvent): ChainRow {
  return {
    id: e.id,
    chain_seq: e.chain_seq,
    event_at: e.event_at,
    event_kind: e.event_kind,
    schema_version: e.schema_version,
    to_status: e.to_status,
    from_status: e.from_status,
    classification_hint: e.classification_hint,
    firm_id: e.firm_id,
    company_id: e.company_id,
    actor_kind: e.actor_kind,
    actor_user_id: e.actor_user_id,
    actor_via: e.actor_via,
    assertions_covered: e.assertions_covered,
    evidence_refs: e.evidence_refs,
    reason_code: e.reason_code,
    reason_text: e.reason_text,
    pilot_slot_id: e.pilot_slot_id,
    payload: e.payload ?? {},
    prev_hash: e.prev_hash,
    row_hash: e.row_hash,
  };
}

export function LifecycleTimeline({ engagementId }: { engagementId: string }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; data: ApiResponse; verify: ChainVerification }
  >({ status: "loading" });
  const [openEvent, setOpenEvent] = useState<LifecycleEvent | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/audit-ready/${engagementId}/lifecycle`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          const detail = await res.text();
          if (!cancelled) {
            setState({
              status: "error",
              message: `HTTP ${res.status}: ${detail}`,
            });
          }
          return;
        }
        const data = (await res.json()) as ApiResponse;
        const rows: ChainRow[] = data.events.map(toChainRow);
        const verify = await verifyChain(rows);
        if (!cancelled) setState({ status: "ready", data, verify });
      } catch (e) {
        if (!cancelled) {
          setState({
            status: "error",
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [engagementId]);

  const verifyByRowId = useMemo(() => {
    if (state.status !== "ready") {
      return new Map<string, { ok: boolean; reason?: string }>();
    }
    return new Map(
      state.verify.rows.map((r) => [r.id, { ok: r.ok, reason: r.reason }]),
    );
  }, [state]);

  if (state.status === "loading") {
    return <div className="text-[#A29E93]">Loading lifecycle chain…</div>;
  }
  if (state.status === "error") {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
        Failed to load lifecycle: {state.message}
      </div>
    );
  }

  const { data, verify } = state;
  const clientOk = verify.ok;
  const serverOk = data.server_verify.ok;
  const bothOk = clientOk && serverOk;

  return (
    <div className="space-y-4">
      <div
        className={`flex flex-wrap items-center gap-4 rounded-md border p-4 text-sm ${
          bothOk
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
            : "border-red-500/50 bg-red-500/10 text-red-200"
        }`}
      >
        <div className={`${headingFont} font-semibold`}>
          {bothOk ? "Chain intact" : "Chain integrity failure detected"}
        </div>
        <div className="font-mono text-xs">
          server verify_chain: {serverOk ? "PASS" : "FAIL"} · client re-verify:{" "}
          {clientOk
            ? "PASS"
            : `FAIL (first break at #${verify.first_failure_index})`}
        </div>
        {data.truncated ? (
          <div className="rounded border border-[#C9A961]/40 px-2 py-0.5 font-mono text-xs text-[#C9A961]">
            showing latest {data.max_rows} events
          </div>
        ) : null}
      </div>

      {data.events.length === 0 ? (
        <div className="rounded-md border border-[#C9A961]/20 bg-[#1A1A1C] p-6 text-center text-[#A29E93]">
          No lifecycle events yet for this engagement.
        </div>
      ) : (
        <div className="space-y-2">
          {data.events.map((ev) => {
            const v = verifyByRowId.get(ev.id);
            return (
              <LifecycleEventRow
                key={ev.id}
                event={ev}
                verified={v?.ok ?? false}
                reason={v?.reason}
                onOpen={() => setOpenEvent(ev)}
              />
            );
          })}
        </div>
      )}

      {openEvent ? (
        <LifecycleEvidenceDrawer
          event={openEvent}
          onClose={() => setOpenEvent(null)}
        />
      ) : null}
    </div>
  );
}
