import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  identityFromNameAndArgs,
  parseAlterFunction,
  parseCreateFunction,
  parseGrantRevokeFunction,
} from "../../scripts/migration-remediation/option-d-function-identity.js";
import {
  buildDependencyGraph,
  computeOptionDDependencyOrder,
} from "../../scripts/migration-remediation/option-d-dependency-order.js";
import { classifyUnresolvedOccurrences } from "../../scripts/migration-remediation/option-d-unresolved-classifier.js";

const ROOT = path.resolve(__dirname, "../..");
const ASSEMBLE = path.join(ROOT, "scripts/migration-remediation/assemble-option-d-replay.js");
const AUDIT = path.join(ROOT, "scripts/migration-remediation/audit-option-d-function-deps.js");
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const CLASS_JSON = path.join(
  ROOT,
  "docs/migration-remediation/option-d-unresolved-classification.json",
);
const AUDIT_JSON = path.join(
  ROOT,
  "docs/migration-remediation/option-d-function-dependency-audit.json",
);
const RECOVERED = path.join(ROOT, "supabase/migrations-draft/recovered-production-history");
const ASSEMBLED = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/assembled",
);

const CANONICAL =
  "public.pilot_lifecycle_events_canonical_payload(text,timestamptz,text,uuid,text,text,text,uuid,uuid,text,uuid,text,text[],jsonb,text,text,jsonb)";
const VERIFY = "public.pilot_lifecycle_events_verify_chain(uuid,uuid)";
const BEFORE = "public.pilot_lifecycle_events_before_insert()";
const REJECT = "public.pilot_lifecycle_events_reject_mutations()";
const ANCHOR = "public.sp_write_anchor_batch(int8,int8,int4,text,jsonb,jsonb)";

const RECOVERED_FNS = [
  {
    file: "20260804213819_pilot_lifecycle_events_hash_chain_trigger.sql",
    md5: "5ede7d6c22fe4b9ba15e9b038e5379dc",
    len: 7738,
  },
  {
    file: "20260804213934_pilot_lifecycle_events_hash_digest_bytea_fix.sql",
    md5: "804e70213d39474337ad6a0526df4120",
    len: 3968,
  },
  {
    file: "20260804214151_pilot_lifecycle_events_hash_extensions_search_path.sql",
    md5: "7a5489dd8dd316cf26eb02a413339f71",
    len: 4004,
  },
  {
    file: "20260804220220_pilot_lifecycle_events_chain_seq_hardening.sql",
    md5: "0dfe89813e31c0cf5341d8fd65ab4c18",
    len: 17126,
  },
  {
    file: "20260805005320_pilot_lifecycle_anchors.sql",
    md5: "74f838e87f887acae7cfee3bc65a00cc",
    len: 5905,
  },
];

function bodyAfterHeader(sql: string) {
  const marker = "-- SUBSTITUTION: none — original statements[1] preserved in order.\n\n";
  const i = sql.indexOf(marker);
  if (i < 0) throw new Error("provenance header missing");
  return sql.slice(i + marker.length);
}

describe("Option D function identity parser", () => {
  it("normalizes timestamp with time zone and integer aliases; overloads stay distinct", () => {
    expect(
      identityFromNameAndArgs(
        "public.pilot_lifecycle_events_canonical_payload",
        "text, timestamp with time zone, text, uuid, text, text, text, uuid, uuid, text, uuid, text, text[], jsonb, text, text, jsonb",
      ),
    ).toBe(CANONICAL);
    expect(
      identityFromNameAndArgs("public.sp_write_anchor_batch", "bigint, bigint, integer, text, jsonb, jsonb"),
    ).toBe(ANCHOR);
    expect(identityFromNameAndArgs("public.pilot_lifecycle_events_verify_chain", "uuid, uuid")).toBe(
      VERIFY,
    );
    expect(
      identityFromNameAndArgs("public.pilot_lifecycle_events_verify_chain", "p_company_id uuid DEFAULT NULL, p_firm_id uuid DEFAULT NULL"),
    ).toBe(VERIFY);
    const a = identityFromNameAndArgs("public.foo", "uuid");
    const b = identityFromNameAndArgs("public.foo", "uuid, text");
    expect(a).not.toBe(b);
  });

  it("parses ALTER / GRANT / REVOKE ALL ON FUNCTION", () => {
    const alter = parseAlterFunction(
      "ALTER FUNCTION public.pilot_lifecycle_events_reject_mutations() SET search_path = ''",
    );
    expect(alter?.identity).toBe(REJECT);
    const rev = parseGrantRevokeFunction(
      "REVOKE ALL ON FUNCTION public.pilot_lifecycle_events_before_insert() FROM PUBLIC",
    );
    expect(rev?.identity).toBe(BEFORE);
    const grant = parseGrantRevokeFunction(
      "GRANT EXECUTE ON FUNCTION public.sp_write_anchor_batch(bigint, bigint, integer, text, jsonb, jsonb) TO service_role",
    );
    expect(grant?.identity).toBe(ANCHOR);
    const created = parseCreateFunction(
      "CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_before_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$",
    );
    expect(created?.identity).toBe(BEFORE);
  });
});

describe("Option D recovered function originals", () => {
  it("preserves production body MD5/length with no substitution", () => {
    for (const spec of RECOVERED_FNS) {
      const sql = fs.readFileSync(path.join(RECOVERED, spec.file), "utf8");
      expect(sql).toMatch(/SUBSTITUTION: none/);
      const body = bodyAfterHeader(sql);
      expect(body.length).toBe(spec.len);
      expect(crypto.createHash("md5").update(body, "utf8").digest("hex")).toBe(spec.md5);
      expect(body.endsWith("\n")).toBe(false);
    }
  });
});

describe("Option D function dependency order", () => {
  it("places recovered creators before major_1 and keeps lockdown statements", () => {
    execFileSync(process.execPath, [ASSEMBLE], { cwd: ROOT, stdio: "pipe" });
    execFileSync(process.execPath, [AUDIT], { cwd: ROOT, stdio: "pipe" });
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    expect(manifest.counts.totalAssembled).toBe(148);
    expect(manifest.counts.recoveredRequiredOriginals).toBe(8);

    const orderOf = (name: string) =>
      manifest.entries.find((e: { assembledFilename: string }) => e.assembledFilename === name)
        ?.order;
    const major1 = orderOf("20260805041500_major_1_rpc_lockdown.sql");
    expect(orderOf("20260804213819_pilot_lifecycle_events_hash_chain_trigger.sql")).toBeLessThan(
      major1,
    );
    expect(orderOf("20260804220220_pilot_lifecycle_events_chain_seq_hardening.sql")).toBeLessThan(
      major1,
    );
    expect(orderOf("20260805005320_pilot_lifecycle_anchors.sql")).toBeLessThan(major1);
    expect(orderOf("20260804213003_pilot_lifecycle_events.sql")).toBeLessThan(
      orderOf("20260804213819_pilot_lifecycle_events_hash_chain_trigger.sql"),
    );

    const lockdown = fs.readFileSync(
      path.join(ASSEMBLED, "20260805041500_major_1_rpc_lockdown.sql"),
      "utf8",
    );
    expect(lockdown).toMatch(/REVOKE EXECUTE ON FUNCTION public\.pilot_lifecycle_events_before_insert\(\)/);
    expect(lockdown).toMatch(/ALTER FUNCTION public\.pilot_lifecycle_events_canonical_payload\(/);
    expect(lockdown).toMatch(/GRANT EXECUTE ON FUNCTION public\.sp_write_anchor_batch\(/);

    const classified = JSON.parse(fs.readFileSync(CLASS_JSON, "utf8"));
    expect(classified.requiredCount).toBe(0);
    expect(classified.requiredDependenciesResolved).toBe(true);
    expect(
      classified.classifications.filter(
        (c: { kind?: string; classification: string }) =>
          c.kind === "function" && c.classification === "required_missing_create",
      ),
    ).toHaveLength(0);

    const audit = JSON.parse(fs.readFileSync(AUDIT_JSON, "utf8"));
    expect(audit.requiredMissingCount).toBe(0);
    expect(audit.misorderedCount).toBe(0);
    const majorIds = new Set(
      audit.major1Consumes.map((r: { identity: string }) => r.identity),
    );
    for (const id of [CANONICAL, VERIFY, BEFORE, REJECT, ANCHOR]) {
      expect(majorIds.has(id)).toBe(true);
    }
  });

  it("fails required when a consumer precedes a missing exact-signature creator", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "option-d-fn-"));
    try {
      const consumer = "20260102_revoke.sql";
      fs.writeFileSync(
        path.join(dir, consumer),
        "REVOKE EXECUTE ON FUNCTION public.ghost_rpc(uuid) FROM PUBLIC;\n",
      );
      const candidates = [{ filename: consumer, absPath: path.join(dir, consumer) }];
      const graph = buildDependencyGraph(candidates, {
        explicitDependsOn: {},
        optionalExternalTables: [],
        platformProvidedTables: [],
      });
      const classified = classifyUnresolvedOccurrences({
        unresolved: graph.unresolved,
        candidates,
        graph,
        knownProvidedTables: new Set(),
        knownProvidedFunctions: new Set(),
      });
      expect(classified.requiredCount).toBe(1);
      expect(classified.classifications[0].identity).toBe("public.ghost_rpc(uuid)");
      expect(classified.classifications[0].classification).toBe("required_missing_create");
      expect(classified.requiredDependenciesResolved).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("orders CREATE FUNCTION before a later REVOKE of the same identity", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "option-d-fn-ord-"));
    try {
      const a = "20260101_create_fn.sql";
      const b = "20260102_revoke_fn.sql";
      fs.writeFileSync(
        path.join(dir, a),
        "CREATE OR REPLACE FUNCTION public.ordered_rpc(uuid) RETURNS void LANGUAGE sql AS $$ SELECT 1; $$;\n",
      );
      fs.writeFileSync(
        path.join(dir, b),
        "REVOKE EXECUTE ON FUNCTION public.ordered_rpc(uuid) FROM PUBLIC;\n",
      );
      const result = computeOptionDDependencyOrder(
        [
          { filename: a, absPath: path.join(dir, a) },
          { filename: b, absPath: path.join(dir, b) },
        ],
        { explicitDependsOn: {}, optionalExternalTables: [], platformProvidedTables: [] },
      );
      expect(result.ok).toBe(true);
      expect(result.order.indexOf(a)).toBeLessThan(result.order.indexOf(b));
      expect(result.unresolved.some((u) => /ordered_rpc/.test(u.missing))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
