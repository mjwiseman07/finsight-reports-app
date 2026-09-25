/**
 * Corrective production_executable_authority — non-circular AUTH-only publication.
 * Expected tip trust comes only from outer-launch binding or in-process harness flags.
 */
import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  TOOLING_AUTHORIZATION_PATH,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-constants.js";
import {
  BLOCKED_UNPUBLISHED,
  EXPECTED_EXECUTABLE_REQUIRED,
  HISTORICAL_REJECTED,
  IMMUTABLE_MISMATCH,
  PROTOCOL,
  PROTOCOL_MISSING,
  RECORD_KEY,
  assertExecutableAuthorityBeforeCredentials,
  createDisposableExecutableAuthorityPublicationCommit,
  describeExecutableAuthorityMap,
  loadAuthFromGit,
  recheckExecutableAuthorityPin,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-executable-authority.js";
import { createDisposableOuterLaunchBindingCommit } from "../../scripts/security/ra-pro-accounting-automation-corrective-outer-launch-binding.js";
import {
  BLOCKED_UNPUBLISHED as DRY_RUN_BLOCKED,
  describeDryRunArtifactMap,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-dry-run-authorization.js";
import { assertCorrectiveApplyAuthorized } from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-authorization.js";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS harness helper
const { resolveCorrectiveCleanExecutable } = require("./ra-pro-accounting-automation-corrective-clean-executable-harness.js");

const ROOT = process.cwd();
/** Future publication parent — clean remedial executable generation. */
const CLEAN_EXECUTABLE = resolveCorrectiveCleanExecutable(ROOT);
const HISTORICAL = "9f31c3552a2a06fc3b851bd722aad9311dde40f8";
/** Known non-clean tips used as poison record executables (never outer expected). */
const TEST_ONLY_TIP = "fe2abe2435bf7730b60af82945d0da74cd11e6f4";
const TOOLING_TIP = "d131b8888516e44924d21bc32ad63b28590b758e";
const OLD_CLEAN = "e1b79128bdcd2518bc609c1038b25b0aa062cf37";
const IMMUTABLE = CLEAN_EXECUTABLE;
const AUTH_REL = TOOLING_AUTHORIZATION_PATH;

/** In-process harness expected tip (unit tests only — not production argv/env trust). */
function harnessExpected(extra: Record<string, unknown> = {}) {
  return {
    expectedExecutableCommit: CLEAN_EXECUTABLE,
    testOnlyHarnessContext: true,
    allowInProcessExpectedExecutable: true,
    ...extra,
  };
}

function git(args: string[], input?: string) {
  const r = spawnSync("git", ["-c", `safe.directory=${ROOT.replace(/\\/g, "/")}`, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    input,
  });
  if (r.status !== 0) throw new Error(String(r.stderr || r.stdout || args.join(" ")));
  return (r.stdout || "").trim();
}

function expectCode(fn: () => unknown, re: RegExp) {
  try {
    fn();
    throw new Error("expected throw");
  } catch (err) {
    const code = String((err as { code?: string }).code || (err as Error).message || err);
    expect(code).toMatch(re);
  }
}

function mktree(lines: string[]) {
  const input = lines.length ? `${lines.join("\n")}\n` : "";
  return git(["mktree"], input);
}

function replacePathInTree(tree: string, parts: string[], blob: string): string {
  const lines = git(["ls-tree", tree]).split(/\n/).filter(Boolean);
  const name = parts[0];
  let found = false;
  const next = lines.map((line) => {
    const tab = line.indexOf("\t");
    if (line.slice(tab + 1) !== name) return line;
    found = true;
    if (parts.length === 1) return `100644 blob ${blob}\t${name}`;
    const old = line.slice(0, tab).split(" ")[2];
    const child = replacePathInTree(old, parts.slice(1), blob);
    return `040000 tree ${child}\t${name}`;
  });
  if (!found) {
    if (parts.length === 1) next.push(`100644 blob ${blob}\t${name}`);
    else {
      const empty = mktree([]);
      const child = replacePathInTree(empty, parts.slice(1), blob);
      next.push(`040000 tree ${child}\t${name}`);
    }
  }
  return mktree(next);
}

function commitAuthOnlyFromParent(parent: string, authObject: object) {
  const text = `${JSON.stringify(authObject, null, 2)}\n`;
  expect(text.includes("\r")).toBe(false);
  const blob = git(["hash-object", "-w", "--stdin"], text);
  const tree = git(["rev-parse", `${parent}^{tree}`]);
  const newTree = replacePathInTree(tree, AUTH_REL.split("/"), blob);
  return git([
    "commit-tree",
    newTree,
    "-p",
    parent,
    "-m",
    "disposable corrective executable authority test",
  ]);
}

function sealAt(commit: string, rel: string) {
  const oid = git(["rev-parse", `${commit}:${rel}`]);
  const buf = spawnSync(
    "git",
    ["-c", `safe.directory=${ROOT.replace(/\\/g, "/")}`, "cat-file", "blob", `${commit}:${rel}`],
    { cwd: ROOT, windowsHide: true },
  ).stdout as Buffer;
  return {
    path: rel,
    oid,
    sha256: createHash("sha256").update(buf).digest("hex"),
    bytes: buf.length,
    line_endings: "LF",
  };
}

function poisonRecordNaming(executableTip: string) {
  const { auth } = loadAuthFromGit(CLEAN_EXECUTABLE, ROOT);
  const bundle = auth.standalone_bundle;
  auth[RECORD_KEY] = {
    status: "AUTHORIZED",
    protocol: PROTOCOL,
    executable_authorized: true,
    authorized_executable_commit: executableTip,
    project_ref: auth.project_ref,
    bundle: {
      path: bundle.path,
      oid: bundle.oid,
      sha256: bundle.sha256,
      bytes: bundle.bytes,
    },
    bootstrap: sealAt(
      CLEAN_EXECUTABLE,
      "scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1",
    ),
    entry: sealAt(CLEAN_EXECUTABLE, "scripts/security/apply-ra-pro-accounting-automation-corrective.js"),
    ceremony: sealAt(
      CLEAN_EXECUTABLE,
      "scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1",
    ),
    frame: sealAt(
      CLEAN_EXECUTABLE,
      "scripts/security/ra-pro-accounting-automation-corrective-evidence.js",
    ),
    receipt: sealAt(
      CLEAN_EXECUTABLE,
      "scripts/security/ra-pro-accounting-automation-corrective-ceremony-receipt.js",
    ),
    evidence_pin_authority: auth.evidence_pin_authority,
    publication_role: "later_descendant_commit",
    note: `poison: names non-clean tip ${executableTip.slice(0, 12)} as executable`,
  };
  return commitAuthOnlyFromParent(CLEAN_EXECUTABLE, auth);
}

describe("corrective executable authority", () => {
  it("protocol id is executable-authority v1", () => {
    expect(PROTOCOL).toBe(
      "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_EXECUTABLE_AUTHORITY_V1",
    );
    expect(IMMUTABLE).toBe(CLEAN_EXECUTABLE);
    expect(CLEAN_EXECUTABLE).toBe("032d717922ff69502829cd1081a363390b5838a7");
    expect(CLEAN_EXECUTABLE).not.toBe(OLD_CLEAN);
    expect(HISTORICAL).toBe("9f31c3552a2a06fc3b851bd722aad9311dde40f8");
    expect(HISTORICAL_REJECTED).toBe("EXECUTABLE_AUTHORITY_HISTORICAL_REJECTED");
    expect(EXPECTED_EXECUTABLE_REQUIRED).toBe("EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED");
    expect(IMMUTABLE_MISMATCH).toBe("EXECUTABLE_AUTHORITY_IMMUTABLE_MISMATCH");
  });

  it("unpublished tip blocks before credentials", () => {
    const tip = git(["rev-parse", "HEAD"]);
    const map = describeExecutableAuthorityMap({ cwd: ROOT, publicationCommit: tip });
    expect(map.blocked).toBe(BLOCKED_UNPUBLISHED);
    expect(map.executable_authorized).toBe(false);
  });

  it("rejects historical tip and non-clean tips named as authorized_executable_commit", () => {
    expect(HISTORICAL_REJECTED).toBe("EXECUTABLE_AUTHORITY_HISTORICAL_REJECTED");
    expectCode(
      () =>
        createDisposableExecutableAuthorityPublicationCommit({
          cwd: ROOT,
          executableCommit: HISTORICAL,
          allowDisposableExecutableAuthorityPublicationCommit: true,
          testOnlyHarnessContext: true,
        }),
      /EXECUTABLE_AUTHORITY_HISTORICAL_REJECTED/,
    );

    const good = createDisposableExecutableAuthorityPublicationCommit({
      cwd: ROOT,
      executableCommit: CLEAN_EXECUTABLE,
      allowDisposableExecutableAuthorityPublicationCommit: true,
      testOnlyHarnessContext: true,
    });

    expectCode(
      () =>
        describeExecutableAuthorityMap({
          cwd: ROOT,
          publicationCommit: good.publicationCommit,
          expectBlobOid: good.authorization_publication_blob_oid,
        }),
      new RegExp(EXPECTED_EXECUTABLE_REQUIRED),
    );

    expectCode(
      () =>
        describeExecutableAuthorityMap({
          cwd: ROOT,
          publicationCommit: good.publicationCommit,
          fromArgv: true,
        }),
      new RegExp(EXPECTED_EXECUTABLE_REQUIRED),
    );
    expectCode(
      () =>
        describeExecutableAuthorityMap({
          cwd: ROOT,
          publicationCommit: good.publicationCommit,
          fromEnv: true,
        }),
      new RegExp(EXPECTED_EXECUTABLE_REQUIRED),
    );

    const outer = createDisposableOuterLaunchBindingCommit({
      cwd: ROOT,
      expectedExecutableCommit: CLEAN_EXECUTABLE,
      allowDisposableOuterLaunchBindingCommit: true,
      testOnlyHarnessContext: true,
    });

    const testHead = git(["rev-parse", "HEAD"]).toLowerCase();
    const arbitrary = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const poisonTips = [TEST_ONLY_TIP, TOOLING_TIP, OLD_CLEAN, testHead, arbitrary].filter(
      (t, i, arr) => t !== CLEAN_EXECUTABLE && arr.indexOf(t) === i,
    );

    for (const poisonTip of poisonTips) {
      const poisoned = poisonRecordNaming(poisonTip);
      expectCode(
        () =>
          describeExecutableAuthorityMap({
            cwd: ROOT,
            publicationCommit: poisoned,
            outerLaunchBindingPublication: outer.outerLaunchBindingPublication,
            expectOuterLaunchBindingBlobOid: outer.binding_blob_oid,
          }),
        new RegExp(`${IMMUTABLE_MISMATCH}|${PROTOCOL_MISSING}`),
      );
      expectCode(
        () =>
          describeExecutableAuthorityMap({
            cwd: ROOT,
            publicationCommit: poisoned,
            ...harnessExpected(),
          }),
        new RegExp(`${IMMUTABLE_MISMATCH}|${PROTOCOL_MISSING}`),
      );
    }
  });

  it("rejects AUTH-only child of dirty test-only parent via allowlist (extra files in delta)", () => {
    const noteBlob = git(["hash-object", "-w", "--stdin"], "test-only exeauth parent\n");
    const baseTree = git(["rev-parse", `${CLEAN_EXECUTABLE}^{tree}`]);
    const lines = git(["ls-tree", baseTree]).split(/\n/).filter(Boolean);
    lines.push(`100644 blob ${noteBlob}\t.sealed-generation-test-only`);
    const dirtyTree = mktree(lines);
    const dirtyParent = git([
      "commit-tree",
      dirtyTree,
      "-p",
      CLEAN_EXECUTABLE,
      "-m",
      "test-only dirty parent for exe-auth allowlist",
    ]);
    expect(dirtyParent).not.toBe(CLEAN_EXECUTABLE);

    const created = createDisposableExecutableAuthorityPublicationCommit({
      cwd: ROOT,
      executableCommit: CLEAN_EXECUTABLE,
      allowDisposableExecutableAuthorityPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const { auth } = loadAuthFromGit(created.publicationCommit, ROOT);
    const fromDirty = commitAuthOnlyFromParent(dirtyParent, auth);
    const pubDelta = git(["diff", "--name-only", CLEAN_EXECUTABLE, fromDirty])
      .split(/\n/)
      .filter(Boolean);
    expect(pubDelta).toContain(AUTH_REL);
    expect(pubDelta.length).toBeGreaterThan(1);
    expectCode(
      () =>
        describeExecutableAuthorityMap({
          cwd: ROOT,
          publicationCommit: fromDirty,
          ...harnessExpected(),
        }),
      /EXECUTABLE_AUTHORITY_ALLOWLIST/,
    );
  });

  it("rejects substituted executable-authority publication or blob pin", () => {
    const first = createDisposableExecutableAuthorityPublicationCommit({
      cwd: ROOT,
      executableCommit: CLEAN_EXECUTABLE,
      allowDisposableExecutableAuthorityPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const map = assertExecutableAuthorityBeforeCredentials({
      cwd: ROOT,
      publicationCommit: first.publicationCommit,
      expectBlobOid: first.authorization_publication_blob_oid,
      ...harnessExpected(),
    });
    const wrongOid = "0".repeat(40);
    expect(wrongOid).not.toBe(map.authorization_publication_blob_oid);
    expectCode(
      () =>
        describeExecutableAuthorityMap({
          cwd: ROOT,
          publicationCommit: first.publicationCommit,
          expectBlobOid: wrongOid,
          ...harnessExpected(),
        }),
      /EXECUTABLE_AUTHORITY_PIN_MISMATCH/,
    );

    const { auth } = loadAuthFromGit(first.publicationCommit, ROOT);
    auth[RECORD_KEY].note = `substituted-blob-${randomBytes(4).toString("hex")}`;
    const substituted = commitAuthOnlyFromParent(CLEAN_EXECUTABLE, auth);
    const subOid = git(["rev-parse", `${substituted}:${AUTH_REL}`]);
    expect(subOid).not.toBe(map.authorization_publication_blob_oid);
    expectCode(
      () =>
        recheckExecutableAuthorityPin({
          cwd: ROOT,
          expectExecutable: map.authorized_executable_commit,
          expectCommit: substituted,
          expectBlobOid: map.authorization_publication_blob_oid,
          ...harnessExpected(),
        }),
      /EXECUTABLE_AUTHORITY_PIN_MISMATCH|EXECUTABLE_AUTHORITY_ALLOWLIST/,
    );
  });

  it("rejects worktree AUTH poison (WORKTREE_SUBSTITUTE)", () => {
    const created = createDisposableExecutableAuthorityPublicationCommit({
      cwd: ROOT,
      executableCommit: CLEAN_EXECUTABLE,
      allowDisposableExecutableAuthorityPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const wt = JSON.parse(fs.readFileSync(path.join(ROOT, AUTH_REL), "utf8"));
    expectCode(
      () =>
        describeExecutableAuthorityMap({
          cwd: ROOT,
          publicationCommit: created.publicationCommit,
          auth: wt,
          ...harnessExpected(),
        }),
      /EXECUTABLE_AUTHORITY_WORKTREE_SUBSTITUTE/,
    );
  });

  it("rejects live ref swap after preflight", () => {
    const created = createDisposableExecutableAuthorityPublicationCommit({
      cwd: ROOT,
      executableCommit: CLEAN_EXECUTABLE,
      allowDisposableExecutableAuthorityPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const map = assertExecutableAuthorityBeforeCredentials({
      cwd: ROOT,
      publicationCommit: created.publicationCommit,
      ...harnessExpected(),
    });
    expectCode(
      () =>
        recheckExecutableAuthorityPin({
          cwd: ROOT,
          expectExecutable: map.authorized_executable_commit,
          expectCommit: map.publication_commit,
          expectBlobOid: map.authorization_publication_blob_oid,
          expectLiveRef: "HEAD",
          ...harnessExpected(),
        }),
      /EXECUTABLE_AUTHORITY_PIN_MISMATCH/,
    );
  });

  it("rejects non-authorization JSON changes and extra record fields", () => {
    const created = createDisposableExecutableAuthorityPublicationCommit({
      cwd: ROOT,
      executableCommit: CLEAN_EXECUTABLE,
      allowDisposableExecutableAuthorityPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const { auth } = loadAuthFromGit(created.publicationCommit, ROOT);
    auth.notes = [...(auth.notes || []), `extraneous-${randomBytes(4).toString("hex")}`];
    const drifted = commitAuthOnlyFromParent(CLEAN_EXECUTABLE, auth);
    expectCode(
      () =>
        describeExecutableAuthorityMap({
          cwd: ROOT,
          publicationCommit: drifted,
          ...harnessExpected(),
        }),
      /EXECUTABLE_AUTHORITY_ALLOWLIST/,
    );

    const again = loadAuthFromGit(created.publicationCommit, ROOT).auth;
    again[RECORD_KEY].extra_poison_field = true;
    const extra = commitAuthOnlyFromParent(CLEAN_EXECUTABLE, again);
    expectCode(
      () =>
        describeExecutableAuthorityMap({
          cwd: ROOT,
          publicationCommit: extra,
          ...harnessExpected(),
        }),
      /EXECUTABLE_AUTHORITY_ALLOWLIST/,
    );
  });

  it("executable authority alone cannot authorize dry-run or apply", () => {
    const created = createDisposableExecutableAuthorityPublicationCommit({
      cwd: ROOT,
      executableCommit: CLEAN_EXECUTABLE,
      allowDisposableExecutableAuthorityPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const exeMap = assertExecutableAuthorityBeforeCredentials({
      cwd: ROOT,
      publicationCommit: created.publicationCommit,
      ...harnessExpected(),
    });
    expect(exeMap.executable_authorized).toBe(true);

    const tip = git(["rev-parse", "HEAD"]);
    const dry = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: tip,
      executableAuthorityMap: exeMap,
    });
    expect(dry.dry_run_authorized).toBe(false);
    expect(dry.blocked).toBe(DRY_RUN_BLOCKED);

    expectCode(
      () =>
        assertCorrectiveApplyAuthorized({
          cwd: ROOT,
          executableCommit: CLEAN_EXECUTABLE,
          dryRunAuthorizationMap: {
            authorized_executable_commit: CLEAN_EXECUTABLE,
            dry_run_authorized: true,
          },
        }),
      /APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS/,
    );
  });

  it("accepts disposable exe-auth publication naming clean tip; HEAD unchanged", () => {
    const before = git(["rev-parse", "HEAD"]);
    const created = createDisposableExecutableAuthorityPublicationCommit({
      cwd: ROOT,
      executableCommit: CLEAN_EXECUTABLE,
      allowDisposableExecutableAuthorityPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    expect(created.headUnchanged).toBe(true);
    expect(created.executableCommit).toBe(CLEAN_EXECUTABLE);
    expect(created.publicationCommit).not.toBe(CLEAN_EXECUTABLE);
    expect(git(["rev-parse", "HEAD"])).toBe(before);

    const map = assertExecutableAuthorityBeforeCredentials({
      cwd: ROOT,
      publicationCommit: created.publicationCommit,
      expectBlobOid: created.authorization_publication_blob_oid,
      ...harnessExpected(),
    });
    expect(map.blocked).toBeNull();
    expect(map.executable_authorized).toBe(true);
    expect(map.authorized_executable_commit).toBe(CLEAN_EXECUTABLE);
    expect(map.publication_commit).toBe(created.publicationCommit);
    expect(git(["diff", "--name-only", CLEAN_EXECUTABLE, created.publicationCommit])).toBe(AUTH_REL);
    expect(git(["merge-base", "--is-ancestor", CLEAN_EXECUTABLE, created.publicationCommit])).toBe("");

    recheckExecutableAuthorityPin({
      cwd: ROOT,
      expectExecutable: CLEAN_EXECUTABLE,
      expectCommit: created.publicationCommit,
      expectBlobOid: created.authorization_publication_blob_oid,
      ...harnessExpected(),
    });
    expect(git(["rev-parse", "HEAD"])).toBe(before);
  });

  it("accepts disposable outer-launch binding as authenticated expected source", () => {
    const created = createDisposableExecutableAuthorityPublicationCommit({
      cwd: ROOT,
      executableCommit: CLEAN_EXECUTABLE,
      allowDisposableExecutableAuthorityPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const outer = createDisposableOuterLaunchBindingCommit({
      cwd: ROOT,
      expectedExecutableCommit: CLEAN_EXECUTABLE,
      allowDisposableOuterLaunchBindingCommit: true,
      testOnlyHarnessContext: true,
      executableAuthorityPublicationCommit: created.publicationCommit,
    });
    const map = describeExecutableAuthorityMap({
      cwd: ROOT,
      publicationCommit: created.publicationCommit,
      expectBlobOid: created.authorization_publication_blob_oid,
      outerLaunchBindingPublication: outer.outerLaunchBindingPublication,
      expectOuterLaunchBindingBlobOid: outer.binding_blob_oid,
    });
    expect(map.blocked).toBeNull();
    expect(map.executable_authorized).toBe(true);
    expect(map.authorized_executable_commit).toBe(CLEAN_EXECUTABLE);
    expect(map.expected_executable_commit).toBe(CLEAN_EXECUTABLE);
    expect(map.outer_launch_binding_publication).toBe(outer.outerLaunchBindingPublication);
  });

  it("production argv/env cannot enable disposable exe-auth harness", () => {
    expectCode(
      () =>
        createDisposableExecutableAuthorityPublicationCommit({
          cwd: ROOT,
          executableCommit: CLEAN_EXECUTABLE,
          allowDisposableExecutableAuthorityPublicationCommit: true,
        }),
      /HARNESS_CONTEXT_REQUIRED/,
    );
  });
});
