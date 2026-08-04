/**
 * Block 3 smoke — round-trip a single transition through the SSOT.
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
import { recordTransition } from "@/lib/pilot-lifecycle";

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

describe("Block 3 SSOT smoke", () => {
  it("records a transition and returns chainSeq + rowHash", async () => {
    const { url, serviceRole } = resolveSupabaseEnv();
    if (!url || !serviceRole) {
      // Soft-skip when credentials unavailable (CI without secrets).
      return;
    }

    const supabase = createClient(url, serviceRole, {
      auth: { persistSession: false },
    });
    // Adapt to real constructor (no options) — do not change InMemoryAuditLogWriter.
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
    // Block 2 stores `sha256:` + 64 hex (not bare hex).
    expect(rec.rowHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(rec.eventKind).toBe("pilot.lifecycle.transition");

    // Audit writer received one mirror entry.
    const state = auditWriter.state();
    expect(state.totalEntries).toBe(1);
  });

  it("rejects malformed input (missing companyId AND firmId)", async () => {
    const { url, serviceRole } = resolveSupabaseEnv();
    // Zod validation does not need DB — use placeholders if env missing.
    const supabase = createClient(
      url || "https://example.supabase.co",
      // Avoid sb_secret_ / eyJ prefixes — GitHub push protection treats those as secrets.
      serviceRole || "validation-only-placeholder-key",
      { auth: { persistSession: false } },
    );
    const auditWriter = new InMemoryAuditLogWriter();

    await expect(
      recordTransition(
        {
          subject: { pilotSlotId: "00000000-0000-0000-0000-000000000000" } as any,
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
});
