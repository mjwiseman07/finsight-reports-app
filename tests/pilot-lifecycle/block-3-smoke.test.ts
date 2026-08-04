/**
 * Block 3 / 3.5 smoke — SSOT round-trips through the real DB event kinds.
 * Uses the same overnight test firm from Block 2/2.5 smokes.
 *
 * Note: do not pre-inject NODE_ENV=test (or a stripped env) into the Vitest
 * process — that breaks suite collection (`describe` → reading `config`).
 * Load Supabase credentials from .env* inside the test when unset.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { InMemoryAuditLogWriter } from "@/lib/intelligence/synthetic/standards/audit";
import {
  recordAssertionEvidence,
  recordCreation,
  recordTransition,
} from "@/lib/pilot-lifecycle";

const OVERNIGHT_FIRM_ID = "f9194761-2200-4352-b4bc-750f5b7723ff";

function loadDotEnvKey(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  for (const file of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      if (!line.startsWith(`${key}=`)) continue;
      let val = line.slice(key.length + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (val && val !== "[SENSITIVE]") {
        process.env[key] = val;
        return val;
      }
    }
  }
  return undefined;
}

function resolveSupabaseEnv(): { url: string | undefined; serviceRole: string | undefined } {
  const url =
    loadDotEnvKey("SUPABASE_URL") || loadDotEnvKey("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = loadDotEnvKey("SUPABASE_SERVICE_ROLE_KEY");
  return { url, serviceRole };
}

describe("Block 3 / 3.5 SSOT smoke", () => {
  it("records a transition and returns chainSeq + rowHash", async () => {
    const { url, serviceRole } = resolveSupabaseEnv();
    if (!url || !serviceRole) {
      return;
    }

    const supabase = createClient(url, serviceRole, {
      auth: { persistSession: false },
    });
    const auditWriter = new InMemoryAuditLogWriter();

    const { data: slot } = await supabase
      .from("pilot_slots")
      .select("id")
      .eq("firm_id", OVERNIGHT_FIRM_ID)
      .limit(1)
      .single();

    expect(slot?.id).toBeTruthy();

    const rec = await recordTransition(
      {
        subject: { pilotSlotId: slot!.id, firmId: OVERNIGHT_FIRM_ID },
        actor: { kind: "system", userId: null, via: "admin-script" },
        fromStatus: "active",
        toStatus: "active",
        reasonCode: "smoke.block3.roundtrip",
        reasonText: "Block 3 SSOT smoke — no-op transition",
        assertionsCovered: ["existence"],
        classificationHint: null,
        evidenceRefs: [
          {
            kind: "admin_note",
            uri: "note://block3-smoke",
            sha256:
              "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          },
        ],
        payload: { source: "block-3-smoke" },
      },
      { supabase, auditWriter },
    );

    expect(rec.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(rec.chainSeq).toBeGreaterThan(0);
    expect(rec.rowHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(rec.eventKind).toBe("pilot.lifecycle.transition");

    const state = auditWriter.state();
    expect(state.totalEntries).toBe(1);
  });

  it("rejects malformed input (missing companyId AND firmId)", async () => {
    const { url, serviceRole } = resolveSupabaseEnv();
    const supabase = createClient(
      url || "https://example.supabase.co",
      serviceRole || "validation-only-placeholder-key",
      { auth: { persistSession: false } },
    );
    const auditWriter = new InMemoryAuditLogWriter();

    await expect(
      recordTransition(
        {
          // Intentionally omit companyId/firmId so Zod refine rejects.
          subject: { pilotSlotId: "00000000-0000-4000-8000-000000000000" },
          actor: { kind: "system", userId: null, via: "admin-script" },
          fromStatus: "active",
          toStatus: "cancelled",
          reasonCode: "smoke.block3.malformed",
          reasonText: null,
          assertionsCovered: [],
          classificationHint: null,
          evidenceRefs: [],
          payload: {},
        },
        { supabase, auditWriter },
      ),
    ).rejects.toThrow(/exactly one of companyId or firmId/);
  });

  it("recordCreation writes event_kind='pilot.lifecycle.created' with no shim marker", async () => {
    const { url, serviceRole } = resolveSupabaseEnv();
    if (!url || !serviceRole) {
      return;
    }

    const supabase = createClient(url, serviceRole, {
      auth: { persistSession: false },
    });
    const auditWriter = new InMemoryAuditLogWriter();

    const { data: slot } = await supabase
      .from("pilot_slots")
      .select("id")
      .eq("firm_id", OVERNIGHT_FIRM_ID)
      .limit(1)
      .single();

    expect(slot?.id).toBeTruthy();

    const rec = await recordCreation(
      {
        subject: { pilotSlotId: slot!.id, firmId: OVERNIGHT_FIRM_ID },
        actor: { kind: "system", userId: null, via: "admin-script" },
        initialStatus: "active",
        reasonCode: "smoke.block3_5.creation",
        reasonText: "Block 3.5 SSOT flip",
        assertionsCovered: ["existence"],
        classificationHint: null,
        evidenceRefs: [],
        payload: {},
      },
      { supabase, auditWriter },
    );
    expect(rec.eventKind).toBe("pilot.lifecycle.created");

    const { data: dbRow } = await supabase
      .from("pilot_lifecycle_events")
      .select("event_kind, payload")
      .eq("id", rec.id)
      .single();
    expect(dbRow?.event_kind).toBe("pilot.lifecycle.created");
    expect(
      (dbRow?.payload as Record<string, unknown> | null)?.ssot_event_kind,
    ).toBeUndefined();
  });

  it("recordAssertionEvidence writes to_status IS NULL", async () => {
    const { url, serviceRole } = resolveSupabaseEnv();
    if (!url || !serviceRole) {
      return;
    }

    const supabase = createClient(url, serviceRole, {
      auth: { persistSession: false },
    });
    const auditWriter = new InMemoryAuditLogWriter();

    const { data: slot } = await supabase
      .from("pilot_slots")
      .select("id")
      .eq("firm_id", OVERNIGHT_FIRM_ID)
      .limit(1)
      .single();

    expect(slot?.id).toBeTruthy();

    const rec = await recordAssertionEvidence(
      {
        subject: { pilotSlotId: slot!.id, firmId: OVERNIGHT_FIRM_ID },
        actor: { kind: "system", userId: null, via: "admin-script" },
        assertionsCovered: ["existence", "completeness"],
        classificationHint: null,
        evidenceRefs: [
          {
            kind: "admin_note",
            uri: "note://block3_5-smoke",
            sha256:
              "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          },
        ],
        reasonCode: "smoke.block3_5.evidence",
        reasonText: null,
        payload: {},
      },
      { supabase, auditWriter },
    );
    expect(rec.eventKind).toBe("pilot.lifecycle.assertion.evidence-attached");

    const { data: dbRow } = await supabase
      .from("pilot_lifecycle_events")
      .select("event_kind, to_status, payload")
      .eq("id", rec.id)
      .single();
    expect(dbRow?.event_kind).toBe("pilot.lifecycle.assertion.evidence-attached");
    expect(dbRow?.to_status).toBeNull();
    expect(
      (dbRow?.payload as Record<string, unknown> | null)?.ssot_event_kind,
    ).toBeUndefined();
  });
});
