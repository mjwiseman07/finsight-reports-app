/**
 * FRLS apply ceremony disposable-Postgres rehearsal (synthetic harness only).
 * Operator apply ceremony → native entry → bootstrap → sealed bundle.
 * No production credentials.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  MIGRATION_BYTES,
  MIGRATION_SHA256,
  MIGRATION_VERSION,
  PRIOR_HISTORY_COUNT,
} from "../../scripts/security/free-review-lead-session-apply-constants.js";

const ROOT = process.cwd();
const APPLY_CEREMONY =
  "scripts/security/operator-free-review-lead-session-production-apply-ceremony.ps1";
const AUTH_PATH = path.join(
  ROOT,
  "docs/security/free-review-lead-session-apply/TOOLING_AUTHORIZATION.json",
);
const PRIOR_FIXTURE = path.join(
  ROOT,
  "tests/security/helpers/fixtures/frls-prior-production-dry-run-evidence.json",
);
const PIN =
  "b27e927b98efc8be40d74940cf1e547a968687dfcfccff4b7d0c85c416141209";

function systemPowerShell(): string {
  return path.join(
    process.env.SystemRoot || "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
}

function readAuth(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
}

function authFreeze(): string {
  const a = readAuth() as { authorized_pr_head: string };
  if (!/^[0-9a-f]{40}$/i.test(a.authorized_pr_head)) {
    throw new Error("authorized_pr_head not sealed");
  }
  return a.authorized_pr_head;
}

const dockerOk = (() => {
  try {
    const r = spawnSync("docker", ["version"], {
      encoding: "utf8",
      timeout: 15000,
      windowsHide: true,
    });
    return r.status === 0;
  } catch {
    return false;
  }
})();

function runApplyCeremony(opts: {
  outDir: string;
  priorPath: string;
  synthUrl?: string;
}): ReturnType<typeof spawnSync> {
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(ROOT, APPLY_CEREMONY),
    "-PrHead",
    authFreeze(),
    "-RepoRoot",
    ROOT,
    "-EvidenceOutDir",
    opts.outDir,
    "-PriorDryRunEvidencePath",
    opts.priorPath,
  ];
  if (opts.synthUrl) {
    args.push("-TestSyntheticDatabaseUrl", opts.synthUrl);
  }
  return spawnSync(systemPowerShell(), args, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    timeout: 300000,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      USERPROFILE: process.env.USERPROFILE,
      FRLS_CEREMONY_ALLOW_SYNTHETIC_URL: "1",
    },
  });
}

describe("FRLS prior-evidence tip blob is byte-authoritative CRLF", () => {
  it("tip git cat-file fixture SHA/bytes equal the production pin", () => {
    const { execFileSync } = require("node:child_process");
    const tip = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const blob = execFileSync("git", [
      "cat-file",
      "blob",
      `${tip}:tests/security/helpers/fixtures/frls-prior-production-dry-run-evidence.json`,
    ]);
    const sha = createHash("sha256").update(blob).digest("hex");
    expect(sha).toBe(PIN);
    expect(blob.length).toBe(110391);
    expect(blob.includes(13)).toBe(true);
    expect(createHash("sha256").update(fs.readFileSync(PRIOR_FIXTURE)).digest("hex")).toBe(
      PIN,
    );
    const auth = readAuth() as {
      required_prior_dry_run_evidence_sha256: string;
      required_prior_dry_run_bundle_source: string;
    };
    expect(auth.required_prior_dry_run_evidence_sha256).toBe(PIN);
    expect(auth.required_prior_dry_run_bundle_source).toBe(
      "823b466445599b6095e03a376f57ffc86fe0bf1d",
    );
  });
});

describe.skipIf(!dockerOk)(
  "FRLS apply ceremony disposable Postgres rehearsal (synthetic only)",
  () => {
    let pg: { name: string; url: string; stop: () => Promise<void> };

    beforeAll(async () => {
      const {
        startDisposablePg,
        seedApplicatorWorld,
      } = require("./helpers/frls-applicator-sim.js");
      pg = await startDisposablePg();
      const { Client } = require("pg");
      const client = new Client({ connectionString: pg.url });
      await client.connect();
      await seedApplicatorWorld(client);
      await client.end();
    }, 120000);

    afterAll(async () => {
      if (pg) await pg.stop();
    });

    it("exact apply via ceremony → APPLY_COMMITTED; history 186→187; repeat refused", async () => {
      const { Client } = require("pg");
      const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-cer-pg-"));
      const r = runApplyCeremony({
        outDir,
        priorPath: PRIOR_FIXTURE,
        synthUrl: pg.url,
      });
      const summary = JSON.parse(
        fs.readFileSync(path.join(outDir, "PRODUCTION_APPLY_SUMMARY.json"), "utf8"),
      );
      const evidence = JSON.parse(
        fs.readFileSync(path.join(outDir, "PRODUCTION_APPLY_EVIDENCE.json"), "utf8"),
      );
      expect(summary.result_code, JSON.stringify(summary)).toBe("APPLY_COMMITTED");
      expect(
        evidence.evidence_source === "sealed_applicator" ||
          evidence.applicator?.evidence_source === "sealed_applicator",
      ).toBe(true);
      expect(summary.sqlApplicationAttempts).toBe(1);
      expect(summary.databaseConnectionAttempts).toBe(1);
      expect(evidence.mode).toBe("apply");
      expect(evidence.prior_dry_run_evidence_sha256).toBe(PIN);
      expect(evidence.cleanup?.credential_cleared).toBe(true);

      const client = new Client({ connectionString: pg.url });
      await client.connect();
      const { rows: countRows } = await client.query(
        `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`,
      );
      expect(countRows[0].c).toBe(PRIOR_HISTORY_COUNT + 1);
      const { rows } = await client.query(
        `SELECT version, statements FROM supabase_migrations.schema_migrations WHERE version = $1`,
        [MIGRATION_VERSION],
      );
      expect(rows).toHaveLength(1);
      const stored = rows[0].statements[0];
      expect(createHash("sha256").update(stored, "utf8").digest("hex")).toBe(
        MIGRATION_SHA256,
      );
      expect(Buffer.byteLength(stored, "utf8")).toBe(MIGRATION_BYTES);
      await client.end();

      const outDir2 = fs.mkdtempSync(path.join(os.tmpdir(), "frls-cer-pg2-"));
      const r2 = runApplyCeremony({
        outDir: outDir2,
        priorPath: PRIOR_FIXTURE,
        synthUrl: pg.url,
      });
      const summary2 = JSON.parse(
        fs.readFileSync(
          path.join(outDir2, "PRODUCTION_APPLY_SUMMARY.json"),
          "utf8",
        ),
      );
      expect(summary2.result_code).not.toBe("APPLY_COMMITTED");
      expect(String(summary2.result_code)).toMatch(
        /APPLY_ROLLED_BACK|APPLY_BLOCKED|VERSION|ALREADY/,
      );

      const blob = JSON.stringify({
        summary,
        evidence,
        stdout: r.stdout,
        stderr: r.stderr,
        summary2,
        stdout2: r2.stdout,
      });
      expect(blob).not.toMatch(/postgres:postgres/i);
      expect(blob).not.toMatch(
        /FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL=[^*\s"']{8,}/,
      );

      fs.rmSync(outDir, { recursive: true, force: true });
      fs.rmSync(outDir2, { recursive: true, force: true });
      void r2;
    }, 300000);
  },
);
