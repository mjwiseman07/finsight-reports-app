import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  compareSignatures,
  evaluateViewSignatureOrdering,
  extractViewEvents,
  parseSelectListColumns,
} from "../../scripts/migration-remediation/audit-option-d-view-signatures.js";
import {
  evaluateManifestAuthorization,
  evaluateManifestUnchangedSinceAuthorization,
  sha256Buffer,
} from "../../scripts/migration-remediation/option-d-manifest-authorization.js";

const ROOT = path.resolve(__dirname, "../..");
const ASSEMBLE = path.join(ROOT, "scripts/migration-remediation/assemble-option-d-replay.js");
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const SUBST = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/substitutions/20260720170000_ar_tieout2_runs_and_variances.sql",
);
const GIT_ORIG = path.join(
  ROOT,
  "supabase/migrations/20260720170000_ar_tieout2_runs_and_variances.sql",
);
const TIEOUT1 = path.join(
  ROOT,
  "supabase/migrations/20260720160000_ar_tieout1_policy_and_kind.sql",
);
const INVENTORY = path.join(
  ROOT,
  "docs/migration-remediation/option-d-view-signature-inventory.json",
);

const VIEW = "audit_ready_tie_out_summary";

describe("Option D view signature — order-89 regression", () => {
  it("git CREATE OR REPLACE inserts columns before tie_out_state (incompatible)", () => {
    const prior = extractViewEvents(fs.readFileSync(TIEOUT1, "utf8"), "tieout1");
    const git = extractViewEvents(fs.readFileSync(GIT_ORIG, "utf8"), "tieout2-git");
    const priorView = prior.find((e) => e.kind === "create_or_replace_view" && e.view === VIEW);
    const gitView = git.find((e) => e.kind === "create_or_replace_view" && e.view === VIEW);
    expect(priorView).toBeDefined();
    expect(gitView).toBeDefined();
    const idx = priorView!.columns.indexOf("tie_out_state");
    expect(idx).toBeGreaterThan(0);
    expect(gitView!.columns.indexOf("tie_out_state")).toBeGreaterThan(idx);
    expect(gitView!.columns).toContain("last_tie_out_run_id");
    const cmp = compareSignatures(priorView!.columns, gitView!.columns);
    expect(cmp.ok).toBe(false);
    expect(cmp.failures.some((f) => f.rule === "view_column_rename_or_reorder")).toBe(true);
  });

  it("production substitution drops without CASCADE then creates with security_invoker", () => {
    const sql = fs.readFileSync(SUBST, "utf8");
    expect(/drop\s+view\s+if\s+exists\s+public\.audit_ready_tie_out_summary\s*;/i.test(sql)).toBe(
      true,
    );
    expect(/drop\s+view[\s\S]{0,80}cascade/i.test(sql)).toBe(false);
    expect(/create\s+or\s+replace\s+view/i.test(sql)).toBe(false);
    expect(/create\s+view\s+public\.audit_ready_tie_out_summary/i.test(sql)).toBe(true);
    expect(/security_invoker\s*=\s*true/i.test(sql)).toBe(true);
    const inv = JSON.parse(fs.readFileSync(INVENTORY, "utf8"));
    expect(inv.substitution.sha256).toBe(
      "1a17fa2e86d5b08e85132d8d22ca3dc83e9dd6d04938fc1b4a93df228d8c35af",
    );
    expect(inv.substitution.matchesProductionStatements).toBe(true);
  });

  it("ordered evaluator rejects git replace but accepts drop+create recreation", () => {
    const priorSql = fs.readFileSync(TIEOUT1, "utf8");
    const gitSql = fs.readFileSync(GIT_ORIG, "utf8");
    const prodSql = fs.readFileSync(SUBST, "utf8");
    const bad = evaluateViewSignatureOrdering([
      { filename: "a.sql", order: 1, sql: priorSql },
      { filename: "b.sql", order: 2, sql: gitSql },
    ]);
    expect(bad.ok).toBe(false);

    const good = evaluateViewSignatureOrdering([
      { filename: "a.sql", order: 1, sql: priorSql },
      { filename: "b.sql", order: 2, sql: prodSql },
    ]);
    expect(good.ok).toBe(true);
  });
});

describe("Option D view signature — negative gates", () => {
  it("compatible append-only replacement passes", () => {
    const cmp = compareSignatures(["a", "b"], ["a", "b", "c"]);
    expect(cmp.ok).toBe(true);
    expect(cmp.appendOnly).toBe(true);
  });

  it("renamed / reordered / type-proxy name changes are rejected", () => {
    expect(compareSignatures(["a", "b"], ["a", "c"]).ok).toBe(false);
    expect(compareSignatures(["a", "b"], ["b", "a"]).ok).toBe(false);
  });

  it("missing intermediate view definition leaves replace without prior (ok) but order-89 style insert fails when prior exists", () => {
    const onlyReplace = evaluateViewSignatureOrdering([
      {
        filename: "only.sql",
        order: 1,
        sql: "CREATE OR REPLACE VIEW public.v AS SELECT 1 AS a, 2 AS b;",
      },
    ]);
    expect(onlyReplace.ok).toBe(true);

    const missingIntermediate = evaluateViewSignatureOrdering([
      {
        filename: "first.sql",
        order: 1,
        sql: "CREATE OR REPLACE VIEW public.v AS SELECT 1 AS a;",
      },
      {
        filename: "third.sql",
        order: 2,
        sql: "CREATE OR REPLACE VIEW public.v AS SELECT 1 AS a, 2 AS inserted, 3 AS b;",
      },
    ]);
    // first ends with [a]; third has [a, inserted, b] — append-only OK actually!
    // Better: first [a,b], third inserts middle
    const insertMiddle = evaluateViewSignatureOrdering([
      {
        filename: "first.sql",
        order: 1,
        sql: "CREATE OR REPLACE VIEW public.v AS SELECT 1 AS a, 2 AS b;",
      },
      {
        filename: "third.sql",
        order: 2,
        sql: "CREATE OR REPLACE VIEW public.v AS SELECT 1 AS a, 9 AS mid, 2 AS b;",
      },
    ]);
    expect(insertMiddle.ok).toBe(false);
    expect(missingIntermediate).toBeDefined();
  });

  it("security_invoker weakening is rejected", () => {
    const result = evaluateViewSignatureOrdering([
      {
        filename: "a.sql",
        order: 1,
        sql: "CREATE VIEW public.v AS SELECT 1 AS a; ALTER VIEW public.v SET (security_invoker = true);",
      },
      {
        filename: "b.sql",
        order: 2,
        sql: "ALTER VIEW public.v SET (security_invoker = false);",
      },
    ]);
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "security_invoker_weakened")).toBe(true);
  });

  it("unsafe DROP VIEW CASCADE is rejected", () => {
    const result = evaluateViewSignatureOrdering([
      {
        filename: "a.sql",
        order: 1,
        sql: "DROP VIEW public.v CASCADE; CREATE VIEW public.v AS SELECT 1 AS a;",
      },
    ]);
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "unsafe_drop_view_cascade")).toBe(true);
  });

  it("authoritative safe recreation (DROP IF EXISTS + CREATE) is accepted", () => {
    const result = evaluateViewSignatureOrdering([
      {
        filename: "a.sql",
        order: 1,
        sql: "CREATE OR REPLACE VIEW public.v AS SELECT 1 AS a, 2 AS b;",
      },
      {
        filename: "b.sql",
        order: 2,
        sql: "DROP VIEW IF EXISTS public.v; CREATE VIEW public.v AS SELECT 1 AS x, 2 AS y; ALTER VIEW public.v SET (security_invoker = true);",
      },
    ]);
    expect(result.ok).toBe(true);
  });

  it("parseSelectListColumns handles AS aliases", () => {
    expect(parseSelectListColumns("r.id AS pbc_request_id, r.engagement_id, r.status AS pbc_status")).toEqual([
      "pbc_request_id",
      "engagement_id",
      "pbc_status",
    ]);
  });
});

describe("Option D view signature — assemble + auth", () => {
  it("assemble substitutes production tieout2 body and static gate passes", () => {
    execFileSync(process.execPath, [ASSEMBLE], { cwd: ROOT, encoding: "utf8" });
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    const entry = manifest.entries.find(
      (e: { assembledFilename: string }) =>
        e.assembledFilename === "20260720170000_ar_tieout2_runs_and_variances.sql",
    );
    expect(entry).toBeDefined();
    expect(String(entry.action)).toMatch(/substitute/);
    expect(entry.replacementSha256).toBe(
      "1a17fa2e86d5b08e85132d8d22ca3dc83e9dd6d04938fc1b4a93df228d8c35af",
    );
    expect(manifest.counts.substitutions).toBe(7);

    const assembled = fs.readFileSync(
      path.join(
        ROOT,
        "supabase/migrations-draft/option-d-isolated-replay/assembled/20260720170000_ar_tieout2_runs_and_variances.sql",
      ),
      "utf8",
    );
    expect(/create\s+or\s+replace\s+view/i.test(assembled)).toBe(false);
    expect(/drop\s+view\s+if\s+exists/i.test(assembled)).toBe(true);
  });

  it("manifest regeneration / changed bytes requires new runtime authorization", () => {
    const bytes = fs.readFileSync(MANIFEST);
    const hash = sha256Buffer(bytes);
    const auth = evaluateManifestAuthorization({
      expectedSha256: "0".repeat(64),
      authorizedCommit: "a".repeat(40),
      currentHead: "a".repeat(40),
      manifestPath: MANIFEST,
      requireCommitBinding: true,
    });
    expect(auth.ok).toBe(false);
    expect(auth.failures.some((f: { rule: string }) => f.rule === "manifest_sha256_mismatch")).toBe(
      true,
    );
    const regenerated = evaluateManifestUnchangedSinceAuthorization({
      authorizedObservedSha256: hash,
      manifestBytes: Buffer.from('{"generatedAt":"changed-after-auth"}'),
    });
    expect(regenerated.ok).toBe(false);
    expect(
      regenerated.failures.some(
        (f: { rule: string }) => f.rule === "manifest_regenerated_after_authorization",
      ),
    ).toBe(true);
  });
});
