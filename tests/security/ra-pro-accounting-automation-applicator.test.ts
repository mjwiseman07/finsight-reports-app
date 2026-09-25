/**
 * Disposable + unit coverage for RA Pro accounting-automation dual-migration applicator.
 * Synthetic Docker Postgres only â€” never production.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DUAL_EXECUTABLE, DUAL_PUBLICATION } from "./helpers/ra-pro-accounting-automation-dual-immutable-pins";
// @ts-expect-error pg types optional in this repo
import { Client } from "pg";
import {
  ADVISORY_LOCK,
  APPLY_AUTHORIZATION_TOKEN,
  DATABASE_URL_ENV,
  FEATURE_FLAG_ENV,
  loadSealedMigrations,
  runApplicator,
  resolveDatabaseUrlFromEnv,
  classifyDatabaseUrl,
  assertAuthorizationPublished,
  assertBundleAuthority,
  sanitizeValue,
} from "../../scripts/security/ra-pro-accounting-automation-apply-core.js";
import {
  ARTIFACT_COMMIT,
  EXPECTED_PROJECT_REF,
  MIGRATIONS,
  POST_HISTORY_COUNT,
  PRIOR_HISTORY_COUNT,
  STANDALONE_BUNDLE_BYTES,
  STANDALONE_BUNDLE_OID,
  STANDALONE_BUNDLE_PATH,
  STANDALONE_BUNDLE_SHA256,
} from "../../scripts/security/ra-pro-accounting-automation-apply-constants.js";
import { loadAndVerifyGitBlob } from "../../scripts/security/git-blob-authority.js";
import {
  commitPublicationTree,
  createDisposablePublicationCommit,
  describeApplyArtifactMap,
  preflightApplyAuthorization,
  recheckApplyAuthorizationPin,
  assertNotCircularPin,
} from "../../scripts/security/ra-pro-accounting-automation-apply-authorization.js";
import { verifyPostCommit, captureSentinelCounts } from "../../scripts/security/ra-pro-accounting-automation-schema-probes.js";

type PgClient = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
  connect: () => Promise<void>;
  end: () => Promise<void>;
};

const dockerOk =
  spawnSync("docker", ["info"], { encoding: "utf8", windowsHide: true, timeout: 15_000 }).status ===
  0;

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function sha256(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

const INSIDE_EVIDENCE_WINDOW = "2026-09-21T12:00:00Z";

type MutableAuth = {
  project_ref?: string;
  extra_field?: string;
  production_apply_authorization: {
    attempt_id?: string;
    authorized_executable_commit?: string;
    pre_apply_live_evidence: { sha256: string; oid: string; bytes: number };
    prior_dry_run_evidence: { sha256: string; oid: string; bytes: number };
    migrations: Array<{ oid: string; sha256: string }>;
    bundle: { sha256: string; oid: string };
    tls_trust_root?: { der_sha256: string };
  };
};

function gitTip() {
  const tip = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "safe.directory",
      GIT_CONFIG_VALUE_0: process.cwd().replace(/\\/g, "/"),
    },
  });
  return (tip.stdout || "").trim();
}

/**
 * Disposable publication must start from an UNPUBLISHED executable tip.
 * When HEAD is a later AUTHORIZED publication (consumed apply), use its parent.
 */
function unpublishedExecutableTip() {
  return DUAL_EXECUTABLE;
}

function gitText(args: string[]) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "safe.directory",
      GIT_CONFIG_VALUE_0: process.cwd().replace(/\\/g, "/"),
    },
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "git failed");
  return (result.stdout || "").trim();
}

function loadAuthAt(commit: string) {
  return JSON.parse(gitText(["cat-file", "-p", `${commit}:docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json`]));
}

function gitInput(args: string[], input: string) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    input,
    windowsHide: true,
    env: {
      ...process.env,
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "safe.directory",
      GIT_CONFIG_VALUE_0: process.cwd().replace(/\\/g, "/"),
      GIT_AUTHOR_NAME: "ra-acct-disposable",
      GIT_AUTHOR_EMAIL: "ra-acct-disposable@invalid",
      GIT_COMMITTER_NAME: "ra-acct-disposable",
      GIT_COMMITTER_EMAIL: "ra-acct-disposable@invalid",
    },
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "git failed");
  return (result.stdout || "").trim();
}

function replaceTreePath(tree: string, parts: string[], blob: string): string {
  const lines = gitText(["ls-tree", tree]).split(/\n/).filter(Boolean);
  const name = parts[0];
  let found = false;
  const next = lines.map((line) => {
    const tab = line.indexOf("\t");
    if (line.slice(tab + 1) !== name) return line;
    found = true;
    if (parts.length === 1) return `100644 blob ${blob}\t${name}`;
    const old = line.slice(0, tab).split(" ")[2];
    return `040000 tree ${replaceTreePath(old, parts.slice(1), blob)}\t${name}`;
  });
  if (!found) throw new Error(parts.join("/"));
  return gitInput(["mktree"], `${next.join("\n")}\n`);
}

describe("RA Pro accounting-automation applicator (unit)", () => {
  it("HEAD publication against dual executable fails allowlist", () => {
    expect(() => describeApplyArtifactMap({ cwd: process.cwd() })).toThrow(/APPLY_AUTHORIZATION_ALLOWLIST/);
    try {
      describeApplyArtifactMap({ cwd: process.cwd() });
    } catch (err) {
      expect(String((err as Error).message || err)).toMatch(/corrective/);
    }
  });

  it("refuses published pre-apply evidence before any database contact", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-pub-"));
    expect(() =>
      assertAuthorizationPublished({
        now: INSIDE_EVIDENCE_WINDOW,
        markerDir: dir,
        publicationCommit: unpublishedExecutableTip(),
        allowDisposablePublicationCommit: true,
      }),
    ).toThrow(/APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS/);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it("fails closed on circular pins, ancestry, seals, worktree JSON, and a repeated marker", () => {
    const cwd = process.cwd();
    const executable = unpublishedExecutableTip();
    const headBefore = gitTip();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-auth-"));
    const unpublished = describeApplyArtifactMap({
      cwd,
      authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      publicationCommit: executable,
      allowDisposablePublicationCommit: true,
    });
    expect(unpublished.blocked).toBe("APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS");
    expect(unpublished.apply_authorized).toBe(false);
    expect(fs.readdirSync(dir)).toEqual([]);

    const realRead = fs.readFileSync;
    fs.readFileSync = ((file: fs.PathOrFileDescriptor, ...args: unknown[]) => {
      if (String(file).includes("TOOLING_AUTHORIZATION")) throw new Error("WORKTREE_READ");
      return realRead(file, ...(args as []));
    }) as typeof fs.readFileSync;
    try {
      expect(
        describeApplyArtifactMap({
          cwd,
          publicationCommit: executable,
          allowDisposablePublicationCommit: true,
        }).blocked,
      ).toBe("APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS");
    } finally {
      fs.readFileSync = realRead;
    }
    expect(() =>
      describeApplyArtifactMap({
        cwd,
        auth: { production_apply_authorization: { status: "AUTHORIZED", apply_authorized: true } },
      }),
    ).toThrow(/APPLY_AUTHORIZATION_WORKTREE_SUBSTITUTE/);
    expect(() =>
      describeApplyArtifactMap({
        cwd,
        env: { RA_PRO_ACCOUNTING_AUTOMATION_PUBLICATION_COMMIT: "a".repeat(40) },
      }),
    ).toThrow(/APPLY_AUTHORIZATION_ENV_OVERRIDE_FORBIDDEN/);
    expect(() =>
      describeApplyArtifactMap({
        cwd,
        tip: executable,
        allowDisposablePublicationCommit: true,
      }),
    ).toThrow(/APPLY_AUTHORIZATION_REF_OVERRIDE_FORBIDDEN/);
    expect(() =>
      describeApplyArtifactMap({
        cwd,
        allowDisposablePublicationCommit: true,
        publicationCommit: "a".repeat(40),
        authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    ).toThrow(/GIT_BLOB_LOAD_FAILED|fatal:/);
    expect(() =>
      assertAuthorizationPublished({
        now: "2026-09-22T12:00:00Z",
        markerDir: dir,
        publicationCommit: executable,
        allowDisposablePublicationCommit: true,
      }),
    ).toThrow(/PRE_APPLY_LIVE_EXPIRED/);
    expect(fs.readdirSync(dir)).toEqual([]);

    const attempt = `apply-${executable.slice(0, 12)}-${randomBytes(16).toString("hex")}`;
    const published = createDisposablePublicationCommit({
      cwd,
      executableCommit: executable,
      attemptId: attempt,
    });
    expect(published.headUnchanged).toBe(true);
    expect(gitTip()).toBe(headBefore);
    expect(published.publicationCommit).not.toBe(executable);
    const blob = gitText([
      "cat-file",
      "-p",
      `${published.publicationCommit}:docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json`,
    ]);
    expect(blob.includes(published.publicationCommit)).toBe(false);
    const map = describeApplyArtifactMap({
      cwd,
      allowDisposablePublicationCommit: true,
      publicationCommit: published.publicationCommit,
      authorizationToken: APPLY_AUTHORIZATION_TOKEN,
    });
    expect(map.blocked).toBeNull();
    expect(map.apply_authorized).toBe(false);
    expect(map.authorized_executable_commit).toBe(executable);
    expect(map.bundle_oid).toMatch(/^[0-9a-f]{40}$/);

    expect(() =>
      assertAuthorizationPublished({
        now: INSIDE_EVIDENCE_WINDOW,
        markerDir: dir,
        allowDisposablePublicationCommit: true,
        publicationCommit: published.publicationCommit,
        authorizationToken: "wrong-token",
      }),
    ).toThrow(/APPLY_AUTHORIZATION_TOKEN_MISMATCH/);
    expect(fs.readdirSync(dir)).toEqual([]);

    const auth = loadAuthAt(published.publicationCommit);
    auth.production_apply_authorization.authorized_executable_commit = "b".repeat(40);
    const wrongAncestry = commitPublicationTree(cwd, executable, auth);
    expect(() =>
      describeApplyArtifactMap({
        cwd,
        allowDisposablePublicationCommit: true,
        publicationCommit: wrongAncestry,
        authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    ).toThrow(/APPLY_AUTHORIZATION_ANCESTRY|APPLY_AUTHORIZATION_CIRCULAR_TIP/);

    const extraBlob = gitInput(["hash-object", "-w", "--stdin"], "changed-after-freeze\n");
    const extraTree = replaceTreePath(
      gitText(["rev-parse", `${published.publicationCommit}^{tree}`]),
      ["docs", "security", "ra-pro-accounting-automation-apply", "APPLY_RUNBOOK.md"],
      extraBlob,
    );
    const changedExecutable = gitInput(
      ["commit-tree", extraTree, "-p", published.publicationCommit, "-m", "changed executable after freeze"],
      "",
    );
    expect(() =>
      describeApplyArtifactMap({
        cwd,
        allowDisposablePublicationCommit: true,
        publicationCommit: changedExecutable,
        authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    ).toThrow(/APPLY_AUTHORIZATION_ALLOWLIST/);

    const missing = loadAuthAt(published.publicationCommit);
    missing.production_apply_authorization.bundle = null;
    missing.production_apply_authorization.migrations = null;
    missing.production_apply_authorization.prior_dry_run_evidence = null;
    missing.production_apply_authorization.pre_apply_live_evidence = null;
    const unsealed = commitPublicationTree(cwd, executable, missing);
    expect(() =>
      describeApplyArtifactMap({
        cwd,
        allowDisposablePublicationCommit: true,
        publicationCommit: unsealed,
        authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    ).toThrow(/APPLY_AUTHORIZATION_SEAL_MISSING/);

    const swapped = loadAuthAt(published.publicationCommit);
    swapped.production_apply_authorization.bundle.oid = "c".repeat(40);
    const substituted = commitPublicationTree(cwd, executable, swapped);
    expect(() =>
      describeApplyArtifactMap({
        cwd,
        allowDisposablePublicationCommit: true,
        publicationCommit: substituted,
        authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    ).toThrow(/APPLY_AUTHORIZATION_BUNDLE_MISMATCH/);

    const badAttempt = loadAuthAt(published.publicationCommit);
    badAttempt.production_apply_authorization.attempt_id = `attempt-${executable.slice(0, 12)}-${"d".repeat(32)}`;
    const wrongAttempt = commitPublicationTree(cwd, executable, badAttempt);
    expect(() =>
      describeApplyArtifactMap({
        cwd,
        allowDisposablePublicationCommit: true,
        publicationCommit: wrongAttempt,
        authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    ).toThrow(/APPLY_ATTEMPT_ID_INVALID/);

    expect(() => assertNotCircularPin(executable, executable, "pin")).toThrow(/APPLY_AUTHORIZATION_CIRCULAR_TIP/);
    expect(() =>
      assertNotCircularPin(published.publicationCommit, executable, `${blob}\n${published.publicationCommit}`),
    ).toThrow(/APPLY_AUTHORIZATION_CIRCULAR_TIP/);
    const selfNamed = loadAuthAt(published.publicationCommit);
    selfNamed.production_apply_authorization.authorized_executable_commit = published.publicationCommit;
    const broadened = commitPublicationTree(cwd, published.publicationCommit, selfNamed);
    expect(() =>
      describeApplyArtifactMap({
        cwd,
        allowDisposablePublicationCommit: true,
        publicationCommit: broadened,
        authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    ).toThrow(/APPLY_AUTHORIZATION_ALLOWLIST|APPLY_AUTHORIZATION_CIRCULAR_TIP/);

    const opened = assertAuthorizationPublished({
      now: INSIDE_EVIDENCE_WINDOW,
      markerDir: dir,
      allowDisposablePublicationCommit: true,
      publicationCommit: published.publicationCommit,
      authorizationToken: APPLY_AUTHORIZATION_TOKEN,
    }) as { marker: string; attemptId: string; apply_authorized: boolean; authorized_executable_commit: string };
    expect(opened.apply_authorized).toBe(false);
    expect(opened.attemptId).toBe(attempt);
    expect(opened.authorized_executable_commit).toBe(executable);
    expect(fs.readFileSync(opened.marker, "utf8")).toBe(`apply\n${executable}\n${attempt}\n`);
    expect(() =>
      assertAuthorizationPublished({
        now: INSIDE_EVIDENCE_WINDOW,
        markerDir: dir,
        allowDisposablePublicationCommit: true,
        publicationCommit: published.publicationCommit,
        authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    ).toThrow(/APPLY_ATTEMPT_CONSUMED/);
    expect(gitTip()).toBe(headBefore);
  });

  it("rejects cutover/FRLS/containment/generic credential channels", () => {
    expect(() => resolveDatabaseUrlFromEnv({ DATABASE_URL: "postgres://x@127.0.0.1/db" })).toThrow(
      /PROHIBITED_CREDENTIAL_CHANNEL/,
    );
    expect(() =>
      resolveDatabaseUrlFromEnv({
        RA_PRO_CUTOVER_APPLY_DATABASE_URL: "postgres://x@127.0.0.1/db",
      }),
    ).toThrow(/PROHIBITED_CREDENTIAL_CHANNEL/);
    expect(() =>
      resolveDatabaseUrlFromEnv({
        CONTAINMENT_APPLY_DATABASE_URL: "postgres://x@127.0.0.1/db",
      }),
    ).toThrow(/PROHIBITED_CREDENTIAL_CHANNEL/);
    expect(() =>
      resolveDatabaseUrlFromEnv({
        FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL: "postgres://x@127.0.0.1/db",
      }),
    ).toThrow(/PROHIBITED_CREDENTIAL_CHANNEL/);
    expect(() =>
      resolveDatabaseUrlFromEnv({
        [DATABASE_URL_ENV]: "postgres://x@127.0.0.1/db",
        [FEATURE_FLAG_ENV]: "true",
      }),
    ).toThrow(/ENABLE_RA_PRO_ACCOUNTING_AUTOMATION=true is forbidden/);
    expect(() =>
      resolveDatabaseUrlFromEnv({
        [DATABASE_URL_ENV]: "postgres://x@127.0.0.1/db",
      }),
    ).toThrow(/DATABASE_PROJECT_REF_MISMATCH/);
    expect(() =>
      resolveDatabaseUrlFromEnv({
        [DATABASE_URL_ENV]: "postgres://x@db.otherproject.supabase.co/postgres",
      }),
    ).toThrow(/DATABASE_PROJECT_REF_MISMATCH/);
    const projectOk = resolveDatabaseUrlFromEnv({
      [DATABASE_URL_ENV]: `postgres://x@db.${EXPECTED_PROJECT_REF}.supabase.co:5432/postgres?sslmode=require`,
    });
    expect(projectOk.uri_diagnostics.host_class).toBe("direct");
    expect(projectOk.uri_diagnostics.matches_expected_project_ref).toBe(true);
    expect(projectOk.uri_diagnostics).not.toHaveProperty("host");
    expect(projectOk.uri_diagnostics).not.toHaveProperty("username");
  });

  it("binds Supabase session and transaction poolers without retaining the URL", () => {
    const ref = EXPECTED_PROJECT_REF;
    const session = `postgres://postgres.${ref}:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`;
    const transaction = `postgres://postgres.${ref}:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=verify-full`;
    const sessionOk = resolveDatabaseUrlFromEnv({ [DATABASE_URL_ENV]: session });
    const transactionOk = resolveDatabaseUrlFromEnv({ [DATABASE_URL_ENV]: transaction });
    expect(sessionOk.uri_diagnostics.host_class).toBe("session_pooler");
    expect(sessionOk.uri_diagnostics.username_class).toBe("project_bound");
    expect(transactionOk.uri_diagnostics.host_class).toBe("transaction_pooler");
    expect(transactionOk.uri_diagnostics.username_class).toBe("project_bound");
    for (const diagnostics of [sessionOk.uri_diagnostics, transactionOk.uri_diagnostics]) {
      const text = JSON.stringify(diagnostics);
      expect(text).not.toMatch(/secret|postgres:\/\/|aws-0-|pooler\.supabase\.com/);
      expect(diagnostics).not.toHaveProperty("host");
      expect(diagnostics).not.toHaveProperty("username");
    }

    const rejected = [
      `postgres://postgres.otherprojectref00000000:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`,
      `postgres://postgres:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`,
      `postgres://postgres.${ref}.extra:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`,
      `postgres://postgres.${ref}:secret@aws-0-us-east-1.pooler.supabase.com.evil.example:5432/postgres?sslmode=require`,
      `postgres://postgres.${ref}:secret@evil.example:5432/postgres?sslmode=require`,
      `postgres://postgres.${ref}:secret@db.${ref}.supabase.co.evil.example:5432/postgres?sslmode=require`,
      `postgres://x:secret@db.${ref}.supabase.co:5433/postgres?sslmode=require`,
      `postgres://x:secret@db.${ref}.supabase.co:5432/template1?sslmode=require`,
      `postgres://x:secret@db.${ref}.supabase.co:5432/postgres?sslmode=disable`,
      `postgres://x:secret@db.${ref}.supabase.co:5432/postgres`,
      "not-a-url",
      `postgres://postgres.${ref}:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=allow`,
    ];
    for (const url of rejected) {
      expect(() => resolveDatabaseUrlFromEnv({ [DATABASE_URL_ENV]: url })).toThrow(
        /DATABASE_PROJECT_REF_MISMATCH|MALFORMED_DATABASE_URL/,
      );
    }

    const wrongUser = classifyDatabaseUrl(
      `postgres://postgres:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`,
    );
    expect(wrongUser.matches_expected_project_ref).toBe(false);
    expect(wrongUser.username_class).toBe("mismatched");
    expect(wrongUser.host_class).toBe("session_pooler");

    const lookalike = classifyDatabaseUrl(
      `postgres://postgres.${ref}:secret@pooler.supabase.com.evil.example:5432/postgres?sslmode=require`,
    );
    expect(lookalike.host_class).toBe("mismatched");
    expect(lookalike.matches_expected_project_ref).toBe(false);

    const arbitrary = classifyDatabaseUrl(
      `postgres://postgres.${ref}:secret@evil.example:5432/postgres?sslmode=require`,
    );
    expect(arbitrary.matches_expected_project_ref).toBe(false);
    expect(arbitrary.username_class).toBe("mismatched");
    expect(JSON.stringify(arbitrary)).not.toMatch(/evil\.example|secret/);

    expect(() =>
      resolveDatabaseUrlFromEnv({
        [DATABASE_URL_ENV]: "postgres://postgres:secret@[::1]:5432/postgres?sslmode=require",
      }),
    ).toThrow(/DATABASE_PROJECT_REF_MISMATCH/);
    const ipv6 = resolveDatabaseUrlFromEnv(
      { [DATABASE_URL_ENV]: "postgres://postgres:secret@[::1]:5432/postgres" },
      { allowLocalhostForHarness: true },
    );
    expect(ipv6.uri_diagnostics.host_class).toBe("loopback");
    expect(ipv6.uri_diagnostics.is_local).toBe(true);
  });

  it("redacts database URLs from evidence", () => {
    const s = sanitizeValue({
      message: `fail ${DATABASE_URL_ENV}=postgres://user:secret@127.0.0.1/db`,
    }) as { message: string };
    expect(s.message).not.toMatch(/secret/);
  });

  it("apply ceremony entry refuses unpublished prior/pre-apply pins without credentials", () => {
    const headAuth = loadAuthAt(gitTip());
    if (String(headAuth?.production_apply_authorization?.status || "") === "AUTHORIZED") {
      // Consumed AUTHORIZED publication tip: ceremony entry is out of scope for this tip state.
      // Disposable unpublished-executable rehearsals cover the blocked-before-credentials path.
      return;
    }
    const tipSha = unpublishedExecutableTip();
    const authRaw = spawnSync(
      "git",
      ["show", `${tipSha}:docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json`],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        windowsHide: true,
        env: {
          ...process.env,
          GIT_CONFIG_COUNT: "1",
          GIT_CONFIG_KEY_0: "safe.directory",
          GIT_CONFIG_VALUE_0: process.cwd().replace(/\\/g, "/"),
        },
      },
    );
    const auth = JSON.parse(authRaw.stdout || "{}") as {
      bootstrap_source_commit?: string;
      visible_ceremony_bootstrap?: {
        path?: string;
        oid?: string;
        sha256?: string;
        bytes?: number;
      };
    };
    const bootSrc = String(auth.bootstrap_source_commit || "");
    const seal = auth.visible_ceremony_bootstrap;
    const blob = spawnSync("git", ["cat-file", "blob", `${bootSrc}:${seal?.path}`], {
      cwd: process.cwd(),
      windowsHide: true,
      env: {
        ...process.env,
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "safe.directory",
        GIT_CONFIG_VALUE_0: process.cwd().replace(/\\/g, "/"),
      },
    });
    const bytes = Buffer.isBuffer(blob.stdout) ? blob.stdout : Buffer.from(blob.stdout || "");
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-apply-pin-"));
    const matDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-apply-mat-"));
    const bootFile = path.join(matDir, "bootstrap.ps1");
    fs.writeFileSync(bootFile, bytes);
    const run = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        bootFile,
        "-Mode",
        "apply",
        "-PrHead",
        tipSha,
        "-RepoRoot",
        process.cwd(),
        "-EvidenceOutDir",
        outDir,
        "-SealedMaterialInvocation",
      ],
      { cwd: process.cwd(), encoding: "utf8", windowsHide: true },
    );
    try {
      fs.rmSync(matDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    expect(run.status).toBe(1);
    const combined = `${run.stdout || ""}${run.stderr || ""}`;
    expect(combined).not.toMatch(/postgres:\/\/[^*\s]+@|password=[^*]/i);
    const lines = combined.trim().split(/\r?\n/).filter(Boolean);
    let payload: Record<string, unknown> = {};
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      try {
        payload = JSON.parse(lines[i]);
        break;
      } catch {
        // continue
      }
    }
    if (Object.keys(payload).length > 0) {
      const reason = String(
        payload.reason || payload.result_code || payload.error_code || payload.blocked || "",
      );
      if (reason) {
        expect(reason).toMatch(
          /APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS|PRE_APPLY_LIVE_EXPIRED|APPLY_AUTHORIZATION|BLOCKED|CEREMONY|PIN|REF_OVERRIDE|APPLY_ROLLED_BACK|MISSING_INPUT|BUNDLE_/,
        );
      }
      expect(payload.productionContact === false || payload.productionContact == null).toBe(true);
    }
    expect(fs.existsSync(outDir) ? fs.readdirSync(outDir).filter((n) => n.endsWith(".marker")) : []).toEqual(
      [],
    );
  });

  it("dry-run accepts published precondition without prior/apply pins (fails closed only on missing URL)", async () => {
    const result = await runApplicator({
      mode: "dry-run",
      now: "2026-09-21T12:00:00Z",
      env: {}, // no database URL
    });
    expect(result.verdict).toBe("DRY_RUN_BLOCKED");
    expect(String(result.error_code || result.result_code || "")).toMatch(/MISSING_INPUT|MALFORMED_DATABASE_URL/);
    expect(String(result.error_code || "")).not.toMatch(/AUTHORIZATION_PINS_UNPUBLISHED/);
    expect(result.authorization_scope).toBe("dry_run_precondition_only");
    expect(result.precondition_evidence?.sha256).toBe(
      "149db26f0fed83d2d1cd1fd03a756fa999e8748f52bd7c5a71336dd43f0e2851",
    );
    expect(result.databaseConnectionAttempts ?? 0).toBe(0);
    expect(result.sqlApplicationAttempts ?? 0).toBe(0);
    expect(result.migration_sql_attempts ?? 0).toBe(0);
  });

  it("apply still rejects published pre-apply evidence before credentials", async () => {
    const result = await runApplicator({
      mode: "apply",
      now: "2026-09-21T12:00:00Z",
      authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      allowDisposablePublicationCommit: true,
      publicationCommit: unpublishedExecutableTip(),
      env: { [DATABASE_URL_ENV]: "postgres://x@127.0.0.1/db" },
    });
    expect(result.verdict).toBe("APPLY_BLOCKED");
    expect(String(result.error_code || result.result_code || "")).toMatch(
      /APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS|PRE_APPLY_LIVE_EXPIRED/,
    );
    expect(result.databaseConnectionAttempts ?? 0).toBe(0);
    expect(result.sqlApplicationAttempts ?? 0).toBe(0);
  });

  it("standalone bundle executes under Node and fails closed without packaging errors", () => {
    const check = spawnSync(process.execPath, ["--check", STANDALONE_BUNDLE_PATH], {
      cwd: process.cwd(),
      encoding: "utf8",
      windowsHide: true,
    });
    expect(check.status, check.stderr).toBe(0);

    const run = spawnSync(process.execPath, [STANDALONE_BUNDLE_PATH], {
      cwd: process.cwd(),
      encoding: "utf8",
      windowsHide: true,
      env: { ...process.env },
    });
    const out = `${run.stdout || ""}${run.stderr || ""}`;
    expect(out).not.toMatch(/SyntaxError|Cannot find module|Identifier 'module'/);
    expect(run.status).not.toBe(0);
    const payload = JSON.parse(out.trim().split(/\r?\n/).filter(Boolean).pop() || "{}");
    expect(
      String(payload.reason || payload.result_code || payload.error_code || payload.error || ""),
    ).toMatch(/MISSING_INPUT|MALFORMED_DATABASE_URL|BUNDLE_|PRECONDITION_EVIDENCE_EXPIRED/);
    expect(String(payload.error_code || payload.result_code || "")).not.toMatch(
      /AUTHORIZATION_PINS_UNPUBLISHED/,
    );
    expect(payload.databaseConnectionAttempts ?? 0).toBe(0);
    expect(payload.sqlApplicationAttempts ?? 0).toBe(0);
  });

  it("enforces committed bundle OID/SHA/bytes before credentials", () => {
    const ok = assertBundleAuthority({});
    expect(ok.oid).toBe(STANDALONE_BUNDLE_OID);
    expect(ok.sha256).toBe(STANDALONE_BUNDLE_SHA256);
    expect(ok.bytes).toBe(STANDALONE_BUNDLE_BYTES);
    expect(ok.path).toBe(STANDALONE_BUNDLE_PATH);

    expect(() =>
      assertBundleAuthority({
        bundleSealsOverride: {
          path: STANDALONE_BUNDLE_PATH,
          oid: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          sha256: STANDALONE_BUNDLE_SHA256,
          bytes: STANDALONE_BUNDLE_BYTES,
        },
      }),
    ).toThrow(/BLOCKED_PIN_MISMATCH|BUNDLE_AUTHORITY_MISMATCH|OID/);

    expect(() =>
      assertBundleAuthority({
        bundleSealsOverride: {
          path: STANDALONE_BUNDLE_PATH,
          oid: STANDALONE_BUNDLE_OID,
          sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          bytes: STANDALONE_BUNDLE_BYTES,
        },
      }),
    ).toThrow(/BLOCKED_PIN_MISMATCH|BUNDLE_AUTHORITY_MISMATCH|SHA-256/);

    expect(() =>
      assertBundleAuthority({
        bundleSealsOverride: {
          path: STANDALONE_BUNDLE_PATH,
          oid: STANDALONE_BUNDLE_OID,
          sha256: STANDALONE_BUNDLE_SHA256,
          bytes: STANDALONE_BUNDLE_BYTES + 1,
        },
      }),
    ).toThrow(/BLOCKED_PIN_MISMATCH|BUNDLE_AUTHORITY_MISMATCH|byte/);

    expect(() =>
      assertBundleAuthority({
        bundleSealsOverride: {
          path: STANDALONE_BUNDLE_PATH,
          oid: "PENDING_BUNDLE_OID_PLACEHOLDER_000000000000",
          sha256: STANDALONE_BUNDLE_SHA256,
          bytes: STANDALONE_BUNDLE_BYTES,
        },
      }),
    ).toThrow(/BUNDLE_AUTHORITY_UNPUBLISHED/);
  });

  it("refuses harness activation via env or argv; CLI dry-run never bypasses missing URL", () => {
    expect(() =>
      assertBundleAuthority({
        env: { RA_PRO_ACCOUNTING_AUTOMATION_ALLOW_HARNESS: "1" },
      }),
    ).toThrow(/HARNESS_VIA_ENV_FORBIDDEN/);
    expect(() =>
      assertBundleAuthority({
        argv: ["node", "apply.js", "--allow-unpublished-harness"],
      }),
    ).toThrow(/HARNESS_VIA_ARGV_FORBIDDEN/);

    const cli = spawnSync(
      process.execPath,
      ["scripts/security/apply-ra-pro-accounting-automation.js", "--dry-run"],
      { cwd: process.cwd(), encoding: "utf8", windowsHide: true, env: { ...process.env } },
    );
    expect(cli.status).toBe(1);
    const payload = JSON.parse(`${cli.stdout || ""}${cli.stderr || ""}`.trim().split(/\r?\n/).pop() || "{}");
    expect(String(payload.reason || payload.result_code || payload.error_code || "")).toMatch(
      /MISSING_INPUT|MALFORMED_DATABASE_URL|BUNDLE_|PRECONDITION_EVIDENCE_EXPIRED/,
    );
    expect(String(payload.error_code || payload.result_code || "")).not.toMatch(
      /AUTHORIZATION_PINS_UNPUBLISHED/,
    );
    expect(payload.databaseConnectionAttempts ?? 0).toBe(0);
  });
});

describe("preflight rejects a bad publication before credentials", () => {
  const syntheticUrl = "postgres://user:pass@127.0.0.1:5432/postgres";

  function mutated(mutate: (auth: MutableAuth) => void) {
    const cwd = process.cwd();
    const executable = unpublishedExecutableTip();
    const attempt = `apply-${executable.slice(0, 12)}-${randomBytes(16).toString("hex")}`;
    const published = createDisposablePublicationCommit({
      cwd,
      executableCommit: executable,
      attemptId: attempt,
    });
    const auth = loadAuthAt(published.publicationCommit) as MutableAuth;
    mutate(auth);
    return {
      cwd,
      executable,
      publicationCommit: commitPublicationTree(cwd, executable, auth),
    };
  }

  async function expectRejected(publicationCommit: string, code: RegExp) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-preflight-"));
    const decision = preflightApplyAuthorization({
      cwd: process.cwd(),
      allowDisposablePublicationCommit: true,
      publicationCommit,
      now: INSIDE_EVIDENCE_WINDOW,
    });
    expect(String(decision.blocked || "")).toMatch(code);
    expect(fs.readdirSync(dir).filter((name) => name.endsWith(".marker"))).toEqual([]);
    const result = await runApplicator({
      mode: "apply",
      allowDisposablePublicationCommit: true,
      publicationCommit,
      authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      now: INSIDE_EVIDENCE_WINDOW,
      markerDir: dir,
      env: { [DATABASE_URL_ENV]: syntheticUrl },
    });
    expect(result.databaseConnectionAttempts ?? 0).toBe(0);
    expect(result.sqlApplicationAttempts ?? 0).toBe(0);
    expect(result.migration_sql_attempts ?? 0).toBe(0);
    expect(String(result.error_code || result.result_code || "")).toMatch(code);
    expect(fs.readdirSync(dir).filter((name) => name.endsWith(".marker"))).toEqual([]);
  }

  it("accepts one exact authorization object only up to the credential-free boundary", async () => {
    const cwd = process.cwd();
    const executable = unpublishedExecutableTip();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-preflight-ok-"));
    const attempt = `apply-${executable.slice(0, 12)}-${randomBytes(16).toString("hex")}`;
    const published = createDisposablePublicationCommit({
      cwd,
      executableCommit: executable,
      attemptId: attempt,
    });
    const decision = preflightApplyAuthorization({
      cwd,
      allowDisposablePublicationCommit: true,
      publicationCommit: published.publicationCommit,
      now: INSIDE_EVIDENCE_WINDOW,
    });
    expect(decision.blocked).toBeNull();
    expect(decision.authorized_executable_commit).toBe(executable);
    expect(decision.publication_commit).toBe(published.publicationCommit);
    expect(fs.readdirSync(dir)).toEqual([]);
    const cli = spawnSync(
      process.execPath,
      [
        "scripts/security/apply-ra-pro-accounting-automation.js",
        "--preflight",
        "--credential-free-probe",
        "--publication-commit",
        published.publicationCommit,
        "--as-of",
        INSIDE_EVIDENCE_WINDOW,
      ],
      {
        cwd,
        encoding: "utf8",
        windowsHide: true,
        env: { ...process.env, RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
      },
    );
    expect(cli.status, `${cli.stdout}\n${cli.stderr}`).toBe(0);
    const body = JSON.parse((cli.stdout || "").trim());
    expect(body.blocked).toBeNull();
    expect(body.publication_commit).toBe(decision.publication_commit);
    expect(body.authorization_blob_oid).toBe(decision.authorization_blob_oid);
    expect(`${cli.stdout}${cli.stderr}`).not.toMatch(/SecureString|postgres:\/\//i);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it("fails every invalid publication before a prompt, marker, or database client", async () => {
    const cases: Array<{ code: RegExp; mutate: (auth: MutableAuth) => void }> = [
      { code: /APPLY_AUTHORIZATION_ALLOWLIST/, mutate: (auth) => { auth.extra_field = "not-allowed"; } },
      { code: /PRE_APPLY_LIVE_PROJECT_MISMATCH/, mutate: (auth) => { auth.project_ref = "not-the-project"; } },
      {
        code: /APPLY_AUTHORIZATION_SEAL_MISSING/,
        mutate: (auth) => { auth.production_apply_authorization.pre_apply_live_evidence.sha256 = "a".repeat(64); },
      },
      {
        code: /APPLY_AUTHORIZATION_SEAL_MISSING/,
        mutate: (auth) => { auth.production_apply_authorization.pre_apply_live_evidence.oid = "b".repeat(40); },
      },
      {
        code: /APPLY_AUTHORIZATION_SEAL_MISSING/,
        mutate: (auth) => { auth.production_apply_authorization.pre_apply_live_evidence.bytes = 1; },
      },
      {
        code: /APPLY_AUTHORIZATION_SEAL_MISSING/,
        mutate: (auth) => { auth.production_apply_authorization.prior_dry_run_evidence.sha256 = "c".repeat(64); },
      },
      {
        code: /APPLY_AUTHORIZATION_SEAL_MISSING/,
        mutate: (auth) => { auth.production_apply_authorization.prior_dry_run_evidence.oid = "d".repeat(40); },
      },
      {
        code: /APPLY_AUTHORIZATION_SEAL_MISSING/,
        mutate: (auth) => { auth.production_apply_authorization.prior_dry_run_evidence.bytes = 2; },
      },
      {
        code: /APPLY_AUTHORIZATION_MIGRATION_MISMATCH/,
        mutate: (auth) => { auth.production_apply_authorization.migrations[0].oid = "e".repeat(40); },
      },
      {
        code: /APPLY_AUTHORIZATION_BUNDLE_MISMATCH/,
        mutate: (auth) => { auth.production_apply_authorization.bundle.sha256 = "f".repeat(64); },
      },
      {
        code: /APPLY_AUTHORIZATION_CA_MISMATCH/,
        mutate: (auth) => { auth.production_apply_authorization.tls_trust_root.der_sha256 = "1".repeat(64); },
      },
      {
        code: /APPLY_AUTHORIZATION_SEAL_MISSING/,
        mutate: (auth) => { delete auth.production_apply_authorization.attempt_id; },
      },
      {
        code: /APPLY_AUTHORIZATION_ANCESTRY|APPLY_AUTHORIZATION_CIRCULAR_TIP/,
        mutate: (auth) => { auth.production_apply_authorization.authorized_executable_commit = "2".repeat(40); },
      },
      {
        code: /APPLY_ATTEMPT_ID_INVALID/,
        mutate: (auth) => { auth.production_apply_authorization.attempt_id = `attempt-${"3".repeat(12)}-${"4".repeat(32)}`; },
      },
    ];
    for (const item of cases) {
      const commit = mutated(item.mutate).publicationCommit;
      await expectRejected(commit, item.code);
    }

    const cwd = process.cwd();
    const executable = unpublishedExecutableTip();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-pin-swap-"));
    const attempt = `apply-${executable.slice(0, 12)}-${randomBytes(16).toString("hex")}`;
    const published = createDisposablePublicationCommit({
      cwd,
      executableCommit: executable,
      attemptId: attempt,
    });
    const accepted = preflightApplyAuthorization({
      cwd,
      allowDisposablePublicationCommit: true,
      publicationCommit: published.publicationCommit,
      now: INSIDE_EVIDENCE_WINDOW,
    });
    expect(accepted.blocked).toBeNull();
    expect(() =>
      recheckApplyAuthorizationPin({
        cwd,
        expectCommit: accepted.publication_commit,
        expectBlobOid: "a".repeat(40),
        now: INSIDE_EVIDENCE_WINDOW,
      }),
    ).toThrow(/APPLY_AUTHORIZATION_PIN_MISMATCH/);
    const swapped = await runApplicator({
      mode: "apply",
      authorizationPin: `${accepted.publication_commit}:${"a".repeat(40)}`,
      authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      now: INSIDE_EVIDENCE_WINDOW,
      markerDir: dir,
      env: { [DATABASE_URL_ENV]: syntheticUrl },
    });
    expect(String(swapped.error_code || swapped.result_code || "")).toMatch(/APPLY_AUTHORIZATION_PIN_MISMATCH/);
    expect(swapped.databaseConnectionAttempts ?? 0).toBe(0);
    expect(swapped.sqlApplicationAttempts ?? 0).toBe(0);
    expect(fs.readdirSync(dir).filter((name) => name.endsWith(".marker"))).toEqual([]);
    const cliSwap = spawnSync(
      process.execPath,
      [
        "scripts/security/apply-ra-pro-accounting-automation.js",
        "--preflight",
        "--recheck",
        "--expect-commit",
        String(accepted.publication_commit),
        "--expect-blob-oid",
        "a".repeat(40),
      ],
      { cwd, encoding: "utf8", windowsHide: true, env: { ...process.env } },
    );
    expect(cliSwap.status).toBe(1);
    expect(JSON.parse((cliSwap.stdout || "").trim()).blocked).toBe("APPLY_AUTHORIZATION_PIN_MISMATCH");

    const realRead = fs.readFileSync;
    fs.readFileSync = ((file: fs.PathOrFileDescriptor, ...args: unknown[]) => {
      if (String(file).includes("TOOLING_AUTHORIZATION")) throw new Error("WORKTREE_READ");
      return realRead(file, ...(args as []));
    }) as typeof fs.readFileSync;
    try {
      expect(
        preflightApplyAuthorization({
          cwd,
          now: INSIDE_EVIDENCE_WINDOW,
          publicationCommit: unpublishedExecutableTip(),
          allowDisposablePublicationCommit: true,
        }).blocked,
      ).toBe("APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS");
      expect(
        preflightApplyAuthorization({
          cwd,
          now: INSIDE_EVIDENCE_WINDOW,
          publicationCommit: unpublishedExecutableTip(),
          allowDisposablePublicationCommit: true,
          auth: { production_apply_authorization: { status: "AUTHORIZED", apply_authorized: true } },
        }).blocked,
      ).toBe("APPLY_AUTHORIZATION_WORKTREE_SUBSTITUTE");
    } finally {
      fs.readFileSync = realRead;
    }
  });
});

describe.skipIf(!dockerOk)("RA Pro accounting-automation applicator (disposable Postgres)", () => {
  let container = "";
  let url = "";

  function docker(args: string[], input?: string | Buffer) {
    const result = spawnSync("docker", args, {
      input,
      encoding: "utf8",
      windowsHide: true,
      timeout: 180_000,
      maxBuffer: 20 * 1024 * 1024,
    });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
    return result.stdout;
  }

  async function client(role = "postgres", userId?: string) {
    const db = new Client({ connectionString: url }) as PgClient;
    await db.connect();
    if (role !== "postgres") await db.query(`SET ROLE ${role}`);
    if (userId) await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId]);
    return db;
  }

  let consumedApply: Record<string, unknown> | null = null;

  function gitTipLocal() {
    return unpublishedExecutableTip();
  }

  function applyInputs(overrides: Record<string, unknown> = {}) {
    const executable = gitTipLocal();
    const attempt = `apply-${executable.slice(0, 12)}-${randomBytes(16).toString("hex")}`;
    const markerDir =
      (overrides.markerDir as string) || fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-apply-"));
    const publicationCommit =
      (overrides.publicationCommit as string) ||
      createDisposablePublicationCommit({
        cwd: process.cwd(),
        executableCommit: executable,
        attemptId: attempt,
      }).publicationCommit;
    return {
      mode: "apply" as const,
      allowDisposablePublicationCommit: true,
      allowLocalhostForHarness: true,
      authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      now: INSIDE_EVIDENCE_WINDOW,
      markerDir,
      publicationCommit,
      env: { [DATABASE_URL_ENV]: url },
      ...overrides,
      markerDir,
      publicationCommit,
    };
  }

  beforeAll(async () => {
    container = `ra-acct-apply-${randomBytes(4).toString("hex")}`;
    const port = 57_000 + Math.floor(Math.random() * 900);
    url = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
    docker([
      "run",
      "-d",
      "--rm",
      "--name",
      container,
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-p",
      `${port}:5432`,
      "postgres:16-alpine",
    ]);
    const deadline = Date.now() + 90_000;
    let ready = false;
    while (Date.now() < deadline) {
      const probe = spawnSync("docker", ["exec", container, "pg_isready", "-U", "postgres"], {
        windowsHide: true,
      });
      if (probe.status === 0) {
        ready = true;
        break;
      }
      sleep(400);
    }
    if (!ready) throw new Error("postgres readiness timeout");
    sleep(1000);

    const boot = `
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE SCHEMA supabase_migrations;
      CREATE TABLE supabase_migrations.schema_migrations (
        version text PRIMARY KEY,
        name text,
        statements text[]
      );
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      CREATE TABLE public.firms (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.firm_memberships (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        firm_id uuid NOT NULL REFERENCES public.firms(id),
        user_id uuid NOT NULL,
        status text NOT NULL
      );
      CREATE TABLE public.companies (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.firm_clients (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        firm_id uuid NOT NULL REFERENCES public.firms(id),
        company_id uuid REFERENCES public.companies(id)
      );
      CREATE TABLE public.accounting_connections (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.accounting_syncs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        connection_id uuid NOT NULL REFERENCES public.accounting_connections(id)
      );
      CREATE TABLE public.provider_write_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.bills (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.journal_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
      GRANT SELECT ON public.firm_memberships TO authenticated;
      GRANT SELECT ON public.provider_write_attempts, public.invoices, public.bills,
        public.payments, public.journal_entries TO service_role;
    `;
    docker(["exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"], boot);

    // Seed exactly PRIOR_HISTORY_COUNT synthetic history rows (188) via pg client.
    const seeder = new Client({ connectionString: url }) as PgClient;
    await seeder.connect();
    try {
      for (let i = 0; i < PRIOR_HISTORY_COUNT; i += 1) {
        const version = String(20000000000000 + i);
        await seeder.query(
          `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
           VALUES ($1, $2, ARRAY[$3]::text[])`,
          [version, `seed_${i}`, `-- seed ${i}`],
        );
      }
      const check = await seeder.query(
        `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`,
      );
      if (check.rows[0].c !== PRIOR_HISTORY_COUNT) {
        throw new Error(`seed history count ${check.rows[0].c} != ${PRIOR_HISTORY_COUNT}`);
      }
    } finally {
      await seeder.end();
    }
  }, 180_000);

  afterAll(() => {
    if (container) spawnSync("docker", ["rm", "-f", container], { windowsHide: true });
  });

  async function assertSentinelsUnchanged(db: PgClient) {
    const counts = await db.query(`
      SELECT
        (SELECT count(*)::int FROM provider_write_attempts) provider_writes,
        (SELECT count(*)::int FROM invoices) invoices,
        (SELECT count(*)::int FROM bills) bills,
        (SELECT count(*)::int FROM payments) payments,
        (SELECT count(*)::int FROM journal_entries) journal_entries
    `);
    expect(counts.rows[0]).toEqual({
      provider_writes: 0,
      invoices: 0,
      bills: 0,
      payments: 0,
      journal_entries: 0,
    });
  }

  it("dry-run is ready with zero SQL attempts when history is 188", async () => {
    const result = await runApplicator({
      mode: "dry-run",
      now: "2026-09-21T12:00:00Z",
      allowLocalhostForHarness: true,
      env: { [DATABASE_URL_ENV]: url },
    });
    expect(result, JSON.stringify(result)).toMatchObject({
      verdict: "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION",
      sqlApplicationAttempts: 0,
      migration_sql_attempts: 0,
      databaseConnectionAttempts: 1,
      authorization_scope: "dry_run_precondition_only",
      prior_history_count: PRIOR_HISTORY_COUNT,
    });
    expect(result.versions_absent).toEqual(MIGRATIONS.map((m) => m.version));
    expect(result.advisory_lock_acquired).toBe(true);
    expect(result.read_only).toBe(true);
    expect(result.transaction_mutation).toBe(false);
    expect(result.schema_probes).toMatchObject({
      read_only: true,
      history_count: PRIOR_HISTORY_COUNT,
      history_contract: { prior: PRIOR_HISTORY_COUNT, post: POST_HISTORY_COUNT },
      target_versions_absent: true,
      target_tables_absent: true,
      target_functions_absent: true,
      prerequisites_present: true,
      schema_drift_detected: false,
      failed_checks: [],
    });
    expect(JSON.stringify(result.schema_probes)).not.toMatch(/postgres:\/\/|password|SELECT |INSERT /);
    expect(result.uri_diagnostics?.host_class).toBe("loopback");
    expect(result.uri_diagnostics).not.toHaveProperty("host");
  });

  it("applies both sealed migrations atomically and stores exact LF blobs", async () => {
    const inputs = applyInputs();
    consumedApply = inputs;
    const result = await runApplicator(inputs);
    expect(result, JSON.stringify(result)).toMatchObject({
      verdict: "APPLY_COMMITTED",
      sqlApplicationAttempts: 2,
      retry_attempted: false,
    });
    expect(result.post_commit_verification).toMatchObject({
      ok: true,
      history_count: POST_HISTORY_COUNT,
      tables_present: true,
      functions_present: true,
      rls_enabled: true,
      policies_present: true,
      grants_match: true,
      service_role_execute_ok: true,
      service_role_rpc_ok: true,
      idempotent_reuse: true,
      session_role_model: "set_role_not_jwt",
      sentinel_unchanged: true,
      automation_enabled: false,
      verification_rows_rolled_back: true,
      failed_checks: [],
    });
    expect(result.post_commit_verification.version_counts).toEqual({
      [MIGRATIONS[0].version]: 1,
      [MIGRATIONS[1].version]: 1,
    });

    const db = await client();
    try {
      const hist = await db.query(
        `SELECT count(*)::int c FROM supabase_migrations.schema_migrations`,
      );
      expect(hist.rows[0].c).toBe(POST_HISTORY_COUNT);

      for (const migration of MIGRATIONS) {
        const packed = loadAndVerifyGitBlob({
          commit: ARTIFACT_COMMIT,
          path: migration.path,
          expectedOid: migration.oid,
          expectedSha256: migration.sha256,
          expectedBytes: migration.bytes,
        });
        const { rows } = await db.query(
          `SELECT count(*)::int c, statements FROM supabase_migrations.schema_migrations WHERE version=$1 GROUP BY statements`,
          [migration.version],
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].c).toBe(1);
        const stmts = rows[0].statements as string[];
        expect(stmts).toHaveLength(1);
        expect(sha256(stmts[0])).toBe(migration.sha256);
        expect(Buffer.byteLength(stmts[0], "utf8")).toBe(migration.bytes);
        expect(stmts[0]).toBe(packed.buffer.toString("utf8"));
      }

      const objects = await db.query(`
        SELECT
          (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' AND c.relname='ra_pro_weekly_completeness_runs') weekly_rls,
          (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' AND c.relname='ra_pro_month_end_review_packages') month_rls,
          (SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
            WHERE n.nspname='public' AND p.proname='persist_ra_pro_weekly_completeness') weekly_secdef,
          (SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
            WHERE n.nspname='public' AND p.proname='persist_ra_pro_month_end_review_package') month_secdef,
          (SELECT array_to_string(p.proconfig, ',') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
            WHERE n.nspname='public' AND p.proname='persist_ra_pro_weekly_completeness') weekly_config,
          (SELECT array_to_string(p.proconfig, ',') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
            WHERE n.nspname='public' AND p.proname='persist_ra_pro_month_end_review_package') month_config
      `);
      expect(objects.rows[0].weekly_rls).toBe(true);
      expect(objects.rows[0].month_rls).toBe(true);
      expect(objects.rows[0].weekly_secdef).toBe(false);
      expect(objects.rows[0].month_secdef).toBe(false);
      expect(String(objects.rows[0].weekly_config)).toMatch(/search_path/);
      expect(String(objects.rows[0].month_config)).toMatch(/search_path/);
      await assertSentinelsUnchanged(db);
    } finally {
      await db.end();
    }
  });

  it("refuses a consumed synthetic attempt before any database contact", async () => {
    const prior = consumedApply as {
      markerDir: string;
      publicationCommit: string;
    };
    expect(prior).toBeTruthy();
    const result = await runApplicator(
      applyInputs({
        markerDir: prior.markerDir,
        publicationCommit: prior.publicationCommit,
      }),
    );
    expect(result.verdict).not.toBe("APPLY_COMMITTED");
    expect(result.error_code).toBe("APPLY_ATTEMPT_CONSUMED");
    expect(result.databaseConnectionAttempts ?? 0).toBe(0);
    expect(result.sqlApplicationAttempts ?? 0).toBe(0);
    expect(result.retry_attempted).not.toBe(true);
  });

  it("refuses repeat apply when versions already present", async () => {
    const result = await runApplicator(applyInputs());
    expect(result.verdict).toBe("APPLY_ROLLED_BACK");
    expect(result.error_code).toBe("VERSION_ALREADY_PRESENT");
  });

  it("authenticated is read-only; service_role persists; idempotent + concurrent reuse", async () => {
    const owner = await client();
    const firmId = randomUUID();
    const clientId = randomUUID();
    const companyId = randomUUID();
    const connectionId = randomUUID();
    const syncId = randomUUID();
    const memberId = randomUUID();
    try {
      await owner.query("INSERT INTO firms(id) VALUES ($1)", [firmId]);
      await owner.query("INSERT INTO companies(id) VALUES ($1)", [companyId]);
      await owner.query("INSERT INTO firm_clients(id, firm_id, company_id) VALUES ($1,$2,$3)", [
        clientId,
        firmId,
        companyId,
      ]);
      await owner.query("INSERT INTO accounting_connections(id) VALUES ($1)", [connectionId]);
      await owner.query("INSERT INTO accounting_syncs(id, connection_id) VALUES ($1,$2)", [
        syncId,
        connectionId,
      ]);
      await owner.query(
        "INSERT INTO firm_memberships(firm_id,user_id,status) VALUES ($1,$2,'active')",
        [firmId, memberId],
      );
    } finally {
      await owner.end();
    }

    const weeklyPayload = {
      firm_id: firmId,
      firm_client_id: clientId,
      company_id: companyId,
      accounting_sync_id: syncId,
      provider: "quickbooks",
      week_ending: "2026-09-20",
      status: "clear",
      finding_count: 0,
      summary: { review_only: true, provider_writes: false },
      idempotency_key: "a".repeat(64),
      completed_at: "2026-09-17T18:00:00Z",
    };
    const monthPayload = {
      firm_id: firmId,
      firm_client_id: clientId,
      company_id: companyId,
      accounting_sync_id: syncId,
      provider: "xero",
      period_end: "2026-08-31",
      status: "ready",
      review_package: { review_only: true, provider_writes: false, status: "ready" },
      idempotency_key: "b".repeat(64),
      completed_at: "2026-09-17T18:00:00Z",
    };

    const service = await client("service_role");
    try {
      const first = await service.query(
        "SELECT * FROM persist_ra_pro_weekly_completeness($1::jsonb,$2::jsonb)",
        [JSON.stringify(weeklyPayload), JSON.stringify([])],
      );
      const second = await service.query(
        "SELECT * FROM persist_ra_pro_weekly_completeness($1::jsonb,$2::jsonb)",
        [JSON.stringify(weeklyPayload), JSON.stringify([])],
      );
      expect(first.rows[0].reused).toBe(false);
      expect(second.rows[0]).toMatchObject({ run_id: first.rows[0].run_id, reused: true });

      const args = [JSON.stringify(monthPayload)];
      const dbs = await Promise.all(Array.from({ length: 8 }, () => client("service_role")));
      try {
        const settled = await Promise.all(
          dbs.map((db) =>
            db.query("SELECT * FROM persist_ra_pro_month_end_review_package($1::jsonb)", args),
          ),
        );
        expect(new Set(settled.map((r) => r.rows[0].package_id)).size).toBe(1);
      } finally {
        await Promise.all(dbs.map((db) => db.end()));
      }
      await assertSentinelsUnchanged(service);
    } finally {
      await service.end();
    }

    const member = await client("authenticated", memberId);
    try {
      expect(
        (await member.query("SELECT count(*)::int n FROM ra_pro_weekly_completeness_runs")).rows[0]
          .n,
      ).toBe(1);
      expect(
        (await member.query("SELECT count(*)::int n FROM ra_pro_month_end_review_packages")).rows[0]
          .n,
      ).toBe(1);
      await expect(
        member.query("SELECT * FROM persist_ra_pro_weekly_completeness('{}'::jsonb,'[]'::jsonb)"),
      ).rejects.toThrow(/permission denied/i);
      await expect(
        member.query("SELECT * FROM persist_ra_pro_month_end_review_package('{}'::jsonb)"),
      ).rejects.toThrow(/permission denied/i);
      await expect(member.query("DELETE FROM ra_pro_weekly_completeness_runs")).rejects.toThrow(
        /permission denied/i,
      );
      await expect(member.query("DELETE FROM ra_pro_month_end_review_packages")).rejects.toThrow(
        /permission denied/i,
      );
    } finally {
      await member.end();
    }
  });

  it("rolls back when injected failure occurs before history insert", async () => {
    const name = `ra-acct-rollback-${randomBytes(3).toString("hex")}`;
    const port = 58_800 + Math.floor(Math.random() * 100);
    const localUrl = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
    docker([
      "run",
      "-d",
      "--rm",
      "--name",
      name,
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-p",
      `${port}:5432`,
      "postgres:16-alpine",
    ]);
    try {
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        const probe = spawnSync("docker", ["exec", name, "pg_isready", "-U", "postgres"], {
          windowsHide: true,
        });
        if (probe.status === 0) break;
        sleep(400);
      }
      sleep(400);
      const boot = `
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
        CREATE SCHEMA supabase_migrations;
        CREATE TABLE supabase_migrations.schema_migrations (
          version text PRIMARY KEY, name text, statements text[]
        );
        CREATE TABLE public.firms (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
        CREATE TABLE public.companies (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
        CREATE TABLE public.firm_clients (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          firm_id uuid NOT NULL REFERENCES public.firms(id),
          company_id uuid REFERENCES public.companies(id)
        );
        CREATE TABLE public.accounting_connections (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
        CREATE TABLE public.accounting_syncs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          connection_id uuid NOT NULL REFERENCES public.accounting_connections(id)
        );
        CREATE TABLE public.firm_memberships (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          firm_id uuid NOT NULL REFERENCES public.firms(id),
          user_id uuid NOT NULL,
          status text NOT NULL
        );
        CREATE ROLE anon NOLOGIN;
        CREATE ROLE authenticated NOLOGIN;
        CREATE ROLE service_role NOLOGIN BYPASSRLS;
        CREATE SCHEMA auth;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
          SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
        $$;
        GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
        GRANT SELECT ON public.firm_memberships TO authenticated;
      `;
      docker(["exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"], boot);
      const seeder = new Client({ connectionString: localUrl }) as PgClient;
      await seeder.connect();
      try {
        for (let i = 0; i < PRIOR_HISTORY_COUNT; i += 1) {
          await seeder.query(
            `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
             VALUES ($1,$2,ARRAY[$3]::text[])`,
            [String(20000000000000 + i), `seed_${i}`, "-- seed"],
          );
        }
      } finally {
        await seeder.end();
      }

      const rolled = await runApplicator(
        applyInputs({ injectFailure: "before_history", env: { [DATABASE_URL_ENV]: localUrl } }),
      );
      expect(rolled.verdict).toBe("APPLY_ROLLED_BACK");
      const db = new Client({ connectionString: localUrl }) as PgClient;
      await db.connect();
      try {
        const hist = await db.query(
          `SELECT count(*)::int c FROM supabase_migrations.schema_migrations`,
        );
        expect(hist.rows[0].c).toBe(PRIOR_HISTORY_COUNT);
        for (const migration of MIGRATIONS) {
          const present = await db.query(
            `SELECT count(*)::int c FROM supabase_migrations.schema_migrations WHERE version=$1`,
            [migration.version],
          );
          expect(present.rows[0].c).toBe(0);
        }
      } finally {
        await db.end();
      }
    } finally {
      spawnSync("docker", ["rm", "-f", name], { windowsHide: true });
    }
  });

  it("refuses when only the first migration version is already present", async () => {
    const name = `ra-acct-onever-${randomBytes(3).toString("hex")}`;
    const port = 58_900 + Math.floor(Math.random() * 80);
    const localUrl = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
    docker([
      "run",
      "-d",
      "--rm",
      "--name",
      name,
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-p",
      `${port}:5432`,
      "postgres:16-alpine",
    ]);
    try {
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        const probe = spawnSync("docker", ["exec", name, "pg_isready", "-U", "postgres"], {
          windowsHide: true,
        });
        if (probe.status === 0) break;
        sleep(400);
      }
      sleep(400);
      docker(
        ["exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"],
        `
        CREATE SCHEMA supabase_migrations;
        CREATE TABLE supabase_migrations.schema_migrations (
          version text PRIMARY KEY, name text, statements text[]
        );
      `,
      );
      const seeder = new Client({ connectionString: localUrl }) as PgClient;
      await seeder.connect();
      try {
        for (let i = 0; i < PRIOR_HISTORY_COUNT; i += 1) {
          await seeder.query(
            `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
             VALUES ($1,$2,ARRAY[$3]::text[])`,
            [String(20000000000000 + i), `seed_${i}`, "-- seed"],
          );
        }
        const packed = loadAndVerifyGitBlob({
          commit: ARTIFACT_COMMIT,
          path: MIGRATIONS[0].path,
          expectedOid: MIGRATIONS[0].oid,
          expectedSha256: MIGRATIONS[0].sha256,
          expectedBytes: MIGRATIONS[0].bytes,
        });
        await seeder.query(
          `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
           VALUES ($1,$2,ARRAY[$3]::text[])`,
          [MIGRATIONS[0].version, MIGRATIONS[0].name, packed.buffer.toString("utf8")],
        );
      } finally {
        await seeder.end();
      }
      const result = await runApplicator(
        applyInputs({ env: { [DATABASE_URL_ENV]: localUrl } }),
      );
      expect(result.verdict).toBe("APPLY_ROLLED_BACK");
      expect(result.error_code).toBe("VERSION_ALREADY_PRESENT");
    } finally {
      spawnSync("docker", ["rm", "-f", name], { windowsHide: true });
    }
  });

  it("refuses wrong history count", async () => {
    const name = `ra-acct-histdrift-${randomBytes(3).toString("hex")}`;
    const port = 58_960 + Math.floor(Math.random() * 30);
    const localUrl = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
    docker([
      "run",
      "-d",
      "--rm",
      "--name",
      name,
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-p",
      `${port}:5432`,
      "postgres:16-alpine",
    ]);
    try {
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        const probe = spawnSync("docker", ["exec", name, "pg_isready", "-U", "postgres"], {
          windowsHide: true,
        });
        if (probe.status === 0) break;
        sleep(400);
      }
      sleep(400);
      docker(
        ["exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"],
        `
        CREATE SCHEMA supabase_migrations;
        CREATE TABLE supabase_migrations.schema_migrations (
          version text PRIMARY KEY, name text, statements text[]
        );
      `,
      );
      const seeder = new Client({ connectionString: localUrl }) as PgClient;
      await seeder.connect();
      try {
        for (let i = 0; i < PRIOR_HISTORY_COUNT + 1; i += 1) {
          await seeder.query(
            `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
             VALUES ($1,$2,ARRAY[$3]::text[])`,
            [String(20000000000000 + i), `seed_${i}`, "-- seed"],
          );
        }
      } finally {
        await seeder.end();
      }
      const result = await runApplicator(
        applyInputs({ env: { [DATABASE_URL_ENV]: localUrl } }),
      );
      expect(result.verdict).toBe("APPLY_ROLLED_BACK");
      expect(result.error_code).toBe("HISTORY_COUNT_MISMATCH");
    } finally {
      spawnSync("docker", ["rm", "-f", name], { windowsHide: true });
    }
  });

  it("refuses tampered migration blob pins", async () => {
    const blocked = await runApplicator(
      applyInputs({ artifactCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }),
    );
    expect(blocked.verdict).toBe("APPLY_BLOCKED");
    expect(String(blocked.error_code || blocked.result_code)).toMatch(
      /GIT_BLOB_LOAD_FAILED|BLOCKED_PIN_MISMATCH|APPLY_BLOCKED|APPLY_AUTHORIZATION_REF_OVERRIDE_FORBIDDEN|OID|SHA256/,
    );
  });

  it("reports lock contention when advisory lock is held", async () => {
    const holder = await client();
    await holder.query("BEGIN");
    await holder.query("SELECT pg_advisory_xact_lock($1::int,$2::int)", [
      ADVISORY_LOCK.key1,
      ADVISORY_LOCK.key2,
    ]);
    try {
      const result = await runApplicator(applyInputs({ lockTimeoutMs: 0, mode: "dry-run" }));
      expect(result.verdict).toBe("DRY_RUN_BLOCKED");
      expect(result.error_code).toBe("ADVISORY_LOCK_CONTENTION");
    } finally {
      await holder.query("ROLLBACK");
      await holder.end();
    }
  });

  it("classifies indeterminate outcomes when commit injection fires on a clean DB path", async () => {
    // Spin a sibling disposable world with history 188 and no target versions.
    const name = `ra-acct-indet-${randomBytes(3).toString("hex")}`;
    const port = 58_000 + Math.floor(Math.random() * 800);
    const localUrl = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
    docker([
      "run",
      "-d",
      "--rm",
      "--name",
      name,
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-p",
      `${port}:5432`,
      "postgres:16-alpine",
    ]);
    try {
      const deadline = Date.now() + 90_000;
      let ready = false;
      while (Date.now() < deadline) {
        const probe = spawnSync("docker", ["exec", name, "pg_isready", "-U", "postgres"], {
          windowsHide: true,
        });
        if (probe.status === 0) {
          ready = true;
          break;
        }
        sleep(400);
      }
      if (!ready) throw new Error("sibling postgres readiness timeout");
      sleep(500);
      const boot = `
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
        CREATE SCHEMA supabase_migrations;
        CREATE TABLE supabase_migrations.schema_migrations (
          version text PRIMARY KEY, name text, statements text[]
        );
        CREATE TABLE public.firms (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
        CREATE TABLE public.companies (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
        CREATE TABLE public.firm_clients (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          firm_id uuid NOT NULL REFERENCES public.firms(id),
          company_id uuid REFERENCES public.companies(id)
        );
        CREATE TABLE public.accounting_connections (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
        CREATE TABLE public.accounting_syncs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          connection_id uuid NOT NULL REFERENCES public.accounting_connections(id)
        );
        CREATE TABLE public.firm_memberships (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          firm_id uuid NOT NULL REFERENCES public.firms(id),
          user_id uuid NOT NULL,
          status text NOT NULL
        );
        CREATE ROLE anon NOLOGIN;
        CREATE ROLE authenticated NOLOGIN;
        CREATE ROLE service_role NOLOGIN BYPASSRLS;
        CREATE SCHEMA auth;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
          SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
        $$;
        GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
        GRANT SELECT ON public.firm_memberships TO authenticated;
      `;
      docker(["exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"], boot);
      const seeder = new Client({ connectionString: localUrl }) as PgClient;
      await seeder.connect();
      try {
        for (let i = 0; i < PRIOR_HISTORY_COUNT; i += 1) {
          await seeder.query(
            `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
             VALUES ($1, $2, ARRAY[$3]::text[])`,
            [String(20000000000000 + i), `seed_${i}`, "-- seed"],
          );
        }
      } finally {
        await seeder.end();
      }

      // Wait briefly so postgres accepts concurrent applicator connections.
      sleep(500);

      const during = await runApplicator({
        ...applyInputs({ injectFailure: "during_commit", env: { [DATABASE_URL_ENV]: localUrl } }),
      });
      expect(during, JSON.stringify(during)).toMatchObject({
        verdict: "INDETERMINATE_OUTCOME",
      });
      expect(during.verdict).not.toBe("APPLY_COMMITTED");
      expect(String(during.reconciliation?.outcome || "")).toMatch(
        /NOT_APPLIED_CONFIRMED|APPLIED_CONFIRMED_AFTER_RECONCILIATION|INDETERMINATE/,
      );

      const committed = await runApplicator({
        ...applyInputs({ env: { [DATABASE_URL_ENV]: localUrl } }),
      });
      expect(committed, JSON.stringify(committed)).toMatchObject({ verdict: "APPLY_COMMITTED" });

      const afterAck = await runApplicator({
        ...applyInputs({
          injectFailure: "after_commit_ack",
          env: { [DATABASE_URL_ENV]: localUrl },
        }),
      });
      expect(["APPLY_ROLLED_BACK", "INDETERMINATE_OUTCOME"]).toContain(afterAck.verdict);
      expect(afterAck.verdict).not.toBe("APPLY_COMMITTED");
    } finally {
      spawnSync("docker", ["rm", "-f", name], { windowsHide: true });
    }
  });

  const prereqBoot = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE SCHEMA supabase_migrations;
    CREATE TABLE supabase_migrations.schema_migrations (
      version text PRIMARY KEY, name text, statements text[]
    );
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE TABLE public.firms (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    CREATE TABLE public.companies (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    CREATE TABLE public.firm_clients (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      firm_id uuid NOT NULL REFERENCES public.firms(id),
      company_id uuid REFERENCES public.companies(id)
    );
    CREATE TABLE public.accounting_connections (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    CREATE TABLE public.accounting_syncs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      connection_id uuid NOT NULL REFERENCES public.accounting_connections(id)
    );
    CREATE TABLE public.firm_memberships (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      firm_id uuid NOT NULL REFERENCES public.firms(id),
      user_id uuid NOT NULL,
      status text NOT NULL
    );
    CREATE TABLE public.provider_write_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    CREATE TABLE public.invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    CREATE TABLE public.bills (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    CREATE TABLE public.payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    CREATE TABLE public.journal_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
    INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
    SELECT (20000000000000 + g)::text, 'seed', ARRAY['-- seed']::text[]
    FROM generate_series(0, 187) AS g;
  `;

  async function startDisposable(label, bootSql) {
    let lastError = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const name = `ra-acct-${label}-${randomBytes(3).toString("hex")}`;
      const port = 59_200 + Math.floor(Math.random() * 600);
      const localUrl = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
      try {
        docker([
          "run", "-d", "--rm", "--name", name,
          "-e", "POSTGRES_PASSWORD=postgres",
          "-p", `${port}:5432`,
          "postgres:16-alpine",
        ]);
        const deadline = Date.now() + 90_000;
        let ready = false;
        while (Date.now() < deadline) {
          const probe = spawnSync("docker", ["exec", name, "pg_isready", "-U", "postgres"], {
            windowsHide: true,
          });
          if (probe.status === 0) {
            ready = true;
            break;
          }
          sleep(400);
        }
        if (!ready) throw new Error(`${label} postgres readiness timeout`);
        sleep(400);
        docker(["exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"], bootSql);
        return {
          name,
          localUrl,
          stop() {
            spawnSync("docker", ["rm", "-f", name], { windowsHide: true });
          },
        };
      } catch (err) {
        spawnSync("docker", ["rm", "-f", name], { windowsHide: true });
        lastError = err;
        if (!/ports are not available|bind:|address already in use/i.test(String(err && err.message))) {
          throw err;
        }
      }
    }
    throw lastError || new Error("no free docker port");
  }

  it("dry-run blocks when prerequisite shape is missing", async () => {
    const world = await startDisposable(
      "noprereq",
      `
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE SCHEMA supabase_migrations;
      CREATE TABLE supabase_migrations.schema_migrations (
        version text PRIMARY KEY, name text, statements text[]
      );
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
      SELECT (20000000000000 + g)::text, 'seed', ARRAY['-- seed']::text[]
      FROM generate_series(0, 187) AS g;
      `,
    );
    try {
      const result = await runApplicator({
        mode: "dry-run",
        now: "2026-09-21T12:00:00Z",
        allowLocalhostForHarness: true,
        env: { [DATABASE_URL_ENV]: world.localUrl },
      });
      expect(result.verdict).toBe("DRY_RUN_BLOCKED");
      expect(result.error_code).toBe("SCHEMA_PROBE_FAILED");
      expect(result.schema_probes.prerequisites_present).toBe(false);
      expect(result.schema_probes.failed_checks).toContain("firms_id_uuid_key");
      expect(result.sqlApplicationAttempts).toBe(0);
    } finally {
      world.stop();
    }
  });

  it("dry-run blocks on target-object drift", async () => {
    const world = await startDisposable(
      "drift",
      `${prereqBoot}
       CREATE TABLE public.ra_pro_weekly_completeness_runs (id uuid PRIMARY KEY);`,
    );
    try {
      const result = await runApplicator({
        mode: "dry-run",
        now: "2026-09-21T12:00:00Z",
        allowLocalhostForHarness: true,
        env: { [DATABASE_URL_ENV]: world.localUrl },
      });
      expect(result.verdict).toBe("DRY_RUN_BLOCKED");
      expect(result.error_code).toBe("SCHEMA_PROBE_FAILED");
      expect(result.schema_probes.target_tables_absent).toBe(false);
      expect(result.schema_probes.schema_drift_detected).toBe(true);
      expect(result.schema_probes.checks.weekly_runs_absent).toBe(false);
    } finally {
      world.stop();
    }
  });

  it("dry-run blocks on partial migration state", async () => {
    const world = await startDisposable(
      "partial",
      `${prereqBoot}
       CREATE TABLE public.ra_pro_weekly_completeness_runs (id uuid PRIMARY KEY);
       INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
       VALUES ('${MIGRATIONS[0].version}', 'partial', ARRAY['-- partial']::text[]);`,
    );
    try {
      const result = await runApplicator({
        mode: "dry-run",
        now: "2026-09-21T12:00:00Z",
        allowLocalhostForHarness: true,
        env: { [DATABASE_URL_ENV]: world.localUrl },
      });
      expect(result.verdict).toBe("DRY_RUN_BLOCKED");
      expect(result.error_code).toBe("VERSION_ALREADY_PRESENT");
      expect(result.schema_probes.checks.weekly_runs_absent).toBe(false);
      expect(result.schema_probes.target_versions_absent).toBe(false);
      expect(result.sqlApplicationAttempts).toBe(0);
    } finally {
      world.stop();
    }
  });

  it("post-commit verification fails closed on RLS and RPC sabotage without retrying", async () => {
    const world = await startDisposable("verify", prereqBoot);
    try {
      const applied = await runApplicator(
        applyInputs({ env: { [DATABASE_URL_ENV]: world.localUrl } }),
      );
      expect(applied.verdict, JSON.stringify(applied.post_commit_verification)).toBe(
        "APPLY_COMMITTED",
      );
      const db = new Client({ connectionString: world.localUrl }) as PgClient;
      await db.connect();
      try {
        await db.query(
          "DROP POLICY ra_pro_weekly_runs_firm_member_select ON public.ra_pro_weekly_completeness_runs",
        );
        await db.query(
          "REVOKE EXECUTE ON FUNCTION public.persist_ra_pro_weekly_completeness(jsonb, jsonb) FROM service_role",
        );
        const packed = loadSealedMigrations({ artifactCommit: ARTIFACT_COMMIT });
        const verification = await verifyPostCommit(db, {
          packed,
          sentinelBefore: await captureSentinelCounts(db),
          env: {},
        });
        expect(verification.ok).toBe(false);
        expect(verification.view.policies_present).toBe(false);
        expect(verification.view.service_role_execute_ok).toBe(false);
        expect(verification.view.service_role_rpc_ok).toBe(false);
        expect(verification.view.session_role_model).toBe("set_role_not_jwt");
        expect(verification.view.service_role_rpc_sqlstate).toBe("42501");
        expect(verification.view.failed_checks).toEqual(
          expect.arrayContaining([
            "policies_present",
            "service_role_execute",
            "service_role_rpc",
            "rpc_sqlstate:42501",
          ]),
        );
      } finally {
        await db.end();
      }
      const again = await runApplicator(
        applyInputs({ env: { [DATABASE_URL_ENV]: world.localUrl } }),
      );
      expect(again.verdict).not.toBe("APPLY_COMMITTED");
      expect(again.retry_attempted ?? false).toBe(false);
    } finally {
      world.stop();
    }
  });

  it("verification timeout after commit is not APPLY_COMMITTED and does not reapply", async () => {
    const world = await startDisposable("timeout", prereqBoot);
    try {
      const timed = await runApplicator(
        applyInputs({
          injectFailure: "verification_timeout",
          env: { [DATABASE_URL_ENV]: world.localUrl },
        }),
      );
      expect(timed.verdict).toBe("POST_COMMIT_VERIFICATION_FAILED");
      expect(timed.error_code).toBe("VERIFICATION_TIMEOUT");
      expect(timed.retry_attempted).toBe(false);
      const db = new Client({ connectionString: world.localUrl }) as PgClient;
      await db.connect();
      try {
        const hist = await db.query(
          `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`,
        );
        expect(hist.rows[0].c).toBe(POST_HISTORY_COUNT);
      } finally {
        await db.end();
      }
      const again = await runApplicator(
        applyInputs({ env: { [DATABASE_URL_ENV]: world.localUrl } }),
      );
      expect(again.verdict).toBe("APPLY_ROLLED_BACK");
      expect(again.error_code).toBe("VERSION_ALREADY_PRESENT");
    } finally {
      world.stop();
    }
  });
});
