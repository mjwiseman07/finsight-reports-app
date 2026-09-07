import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const PKG = path.join(ROOT, "supabase/migrations-draft/executable-squash-candidate");
const MANIFEST = path.join(PKG, "MANIFEST.json");
const BUILDER = path.join(ROOT, "scripts/migration-remediation/build-executable-squash-candidate.js");

function sha256File(p: string) {
  return createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

describe("executable squash candidate package (authoring only)", () => {
  it("does not modify active supabase/migrations", () => {
    const active = fs.readdirSync(path.join(ROOT, "supabase/migrations"));
    expect(active.some((f) => f.startsWith("202609070100"))).toBe(false);
  });

  it("manifest has 8 ordered modules with git blobs and hashes", () => {
    const m = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    expect(m.productionMutationReadiness ?? m.bound.productionMutationReadiness).toBe(false);
    expect(m.entries).toHaveLength(8);
    expect(m.entries.map((e: { version: string }) => e.version)).toEqual([
      "20260907010000",
      "20260907010010",
      "20260907010020",
      "20260907010030",
      "20260907010040",
      "20260907010050",
      "20260907010060",
      "20260907010070",
    ]);
    for (const e of m.entries) {
      expect(e.gitBlobId).toMatch(/^[0-9a-f]{40}$/);
      expect(e.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(e.utf8LfBytes).toBeGreaterThan(0);
      const abs = path.join(ROOT, e.path);
      expect(sha256File(abs)).toBe(e.sha256);
      const text = fs.readFileSync(abs, "utf8");
      expect(text.includes("\r")).toBe(false);
    }
  });

  it("omits tcp1 complimentary pilot_slots INSERT seed", () => {
    const guarded = fs.readFileSync(
      path.join(PKG, "modules/20260907010060_esc_guarded_dataless_safe_initialization.sql"),
      "utf8",
    );
    expect(guarded).toMatch(/Seed — OMITTED|Seed - OMITTED/);
    expect(guarded).not.toMatch(/INSERT INTO public\.pilot_slots \([\s\S]*00000000-0000-0000-0000-000000000001/);
  });

  it("forward tail is only digest-qualify migration", () => {
    const m = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    const fwd = m.entries.find((e: { order: number }) => e.order === 8);
    expect(fwd.sourceProvenance).toEqual([
      "supabase/migrations/20260906184500_publish_ledger_event_extensions_digest_qualify.sql",
    ]);
  });

  it("builder is deterministic for package seal", () => {
    execFileSync(process.execPath, [BUILDER], { cwd: ROOT, stdio: "pipe" });
    const once = JSON.parse(fs.readFileSync(MANIFEST, "utf8")).packageSha256OfConcatenatedEntryHashes;
    execFileSync(process.execPath, [BUILDER], { cwd: ROOT, stdio: "pipe" });
    const twice = JSON.parse(fs.readFileSync(MANIFEST, "utf8")).packageSha256OfConcatenatedEntryHashes;
    expect(twice).toBe(once);
  });

  it("secret scan passes", () => {
    execFileSync(process.execPath, [path.join(ROOT, "scripts/migration-remediation/audit-secret-scan.js")], {
      cwd: ROOT,
      stdio: "pipe",
    });
  });

  it("option D manifest pin remains intact", () => {
    const buf = fs.readFileSync(path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json"));
    expect(createHash("sha256").update(buf).digest("hex")).toBe(
      "9dc080cfd5a5600e33f1319d2079d250d7f16c866db16a60d6c24f61c61a6359",
    );
  });
});
